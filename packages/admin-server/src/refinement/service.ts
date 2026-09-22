// Refinement orchestration (VS-099.1).
//
// Ties Core (deterministic context + proposal validation + no-lossy apply) to a provider (model
// execution). Unapplied proposals are operational state kept in memory — disposable, never
// canonical; an APPLIED refinement lives in the project artifact, so losing this state never loses
// applied Work Item content. Nothing here validates or serializes Work Items itself — Core does.

import crypto from 'node:crypto'
import {
  assembleRefinementContext,
  getWorkItemAgentAssets,
  normalizeAndValidateProposal,
  applyRefinement,
  WorkItemWriteError,
  type WorkItemRefinementProposal,
  type ProposalValidation,
} from '@kaddo/cli/core'
import type { WorkItemRefinementProvider, ProviderMeta } from './provider.js'
import { RefinementProviderError } from './provider.js'

export type RefinementStatus = 'ready-for-review' | 'failed' | 'stale' | 'applied'

export type RefinementSession = {
  refinementId: string
  workItemId: string
  sourceRevision: string
  status: RefinementStatus
  intent: string
  proposal: WorkItemRefinementProposal
  validation: ProposalValidation
  contextUsed: { id: string; title: string; layer: string }[]
  meta: ProviderMeta
  createdAt: string
  updatedAt: string
}

/** Public projection — never leaks provider credentials or raw prompts. */
export type RefinementSessionView = Omit<RefinementSession, 'meta'> & {
  meta: { provider: string; model?: string; durationMs: number; inputTokens?: number; outputTokens?: number; repairAttempts?: number }
}

const MAX_REPAIR_ATTEMPTS = 2
const DEFAULT_TIMEOUT_MS = 60_000

export class RefinementService {
  private sessions = new Map<string, RefinementSession>()

  constructor(private provider: WorkItemRefinementProvider, private timeoutMs = DEFAULT_TIMEOUT_MS) {}

  private view(s: RefinementSession): RefinementSessionView {
    // Provider meta is safe (no secrets); this projection exists to keep the boundary explicit.
    return { ...s }
  }

  private async run(dir: string, workItemId: string, feedback?: string, previous?: WorkItemRefinementProposal) {
    const context = assembleRefinementContext(dir, workItemId)
    // Only Draft Work Items may be refined — Ready must be explicitly reopened; historical states
    // are read-only. This mirrors the write rules and never mutates the artifact here.
    if (context.workItem.status !== 'draft') {
      throw new RefinementProviderError('WORK_ITEM_NOT_EDITABLE', `A ${context.workItem.status} Work Item cannot be refined. Reopen it as Draft first.`)
    }
    const assets = getWorkItemAgentAssets()
    const request = { context, assets, intent: context.workItem.intent, previousProposal: previous, feedback }

    let lastErr: unknown
    for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), this.timeoutMs)
      try {
        const result = await this.provider.refine(request, ac.signal)
        const { validation } = normalizeAndValidateProposal(dir, workItemId, result.proposal)
        const contextUsed = context.knowledge.map((k) => ({ id: k.id, title: k.title, layer: k.layer }))
        return { context, proposal: result.proposal, validation, contextUsed, meta: { ...result.meta, repairAttempts: attempt } }
      } catch (err) {
        lastErr = err
        // Only malformed model output is worth a controlled repair attempt; other errors are terminal.
        if (!(err instanceof RefinementProviderError && err.code === 'INVALID_RESPONSE')) break
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastErr instanceof Error ? lastErr : new RefinementProviderError('PROVIDER_ERROR', 'Refinement failed.')
  }

  async start(dir: string, workItemId: string): Promise<RefinementSessionView> {
    const { context, proposal, validation, contextUsed, meta } = await this.run(dir, workItemId)
    const now = new Date().toISOString()
    const session: RefinementSession = {
      refinementId: `ref_${crypto.randomBytes(8).toString('hex')}`,
      workItemId,
      sourceRevision: context.revision,
      status: 'ready-for-review',
      intent: context.workItem.intent,
      proposal, validation, contextUsed, meta,
      createdAt: now, updatedAt: now,
    }
    this.sessions.set(session.refinementId, session)
    return this.view(session)
  }

  async feedback(dir: string, workItemId: string, refinementId: string, feedback: string): Promise<RefinementSessionView> {
    const session = this.get(refinementId, workItemId)
    // Feedback augments the original intent and rebuilds context from the current project state.
    const { context, proposal, validation, contextUsed, meta } = await this.run(dir, workItemId, feedback, session.proposal)
    session.sourceRevision = context.revision
    session.status = 'ready-for-review'
    session.proposal = proposal
    session.validation = validation
    session.contextUsed = contextUsed
    session.meta = meta
    session.updatedAt = new Date().toISOString()
    return this.view(session)
  }

  apply(dir: string, workItemId: string, refinementId: string, expectedRevision: string): { id: string; path: string; revision: string; status: 'draft' } {
    const session = this.get(refinementId, workItemId)
    // Stale detection: the artifact must be exactly what the proposal was built against.
    const current = assembleRefinementContext(dir, workItemId)
    if (current.revision !== session.sourceRevision || expectedRevision !== session.sourceRevision) {
      session.status = 'stale'
      throw new RefinementProviderError('WORK_ITEM_CONFLICT', 'This Work Item changed while the refinement was running. The proposal has not been applied.')
    }
    let res: { revision: string; path: string }
    try {
      res = applyRefinement(dir, workItemId, session.proposal, session.sourceRevision)
    } catch (err) {
      // Surface Core write errors (conflict / not-editable) through the provider-error boundary.
      if (err instanceof WorkItemWriteError) throw new RefinementProviderError(err.code, err.message)
      throw err
    }
    session.status = 'applied'
    session.updatedAt = new Date().toISOString()
    return { id: workItemId, path: res.path, revision: res.revision, status: 'draft' }
  }

  private get(refinementId: string, workItemId: string): RefinementSession {
    const s = this.sessions.get(refinementId)
    if (!s || s.workItemId !== workItemId) throw new RefinementProviderError('REFINEMENT_NOT_FOUND', 'Refinement session not found.')
    return s
  }
}
