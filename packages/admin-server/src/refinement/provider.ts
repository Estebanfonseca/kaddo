// LLM boundary for Work Item refinement (VS-099.1).
//
// The domain (Kaddo Core) never calls a model. All model execution lives behind this provider
// interface so Core stays deterministic and provider-independent. A provider turns a refinement
// request (deterministic context assembled by Core + the canonical agent assets) into a structured
// proposal. It does NOT validate, serialize or transition Work Items — that is Core's job.

import type { RefinementContext, WorkItemAgentAssets, WorkItemRefinementProposal } from '@kaddo/cli/core'

export type RefinementRequest = {
  context: RefinementContext
  assets: WorkItemAgentAssets
  intent: string
  /** The previous proposal, when the human asked to refine again. */
  previousProposal?: WorkItemRefinementProposal
  /** Natural-language feedback that augments (never replaces) the original intent. */
  feedback?: string
}

export type ProviderMeta = {
  provider: string
  model?: string
  durationMs: number
  inputTokens?: number
  outputTokens?: number
  repairAttempts?: number
}

export type RefinementResult = {
  proposal: WorkItemRefinementProposal
  meta: ProviderMeta
}

export interface WorkItemRefinementProvider {
  readonly name: string
  refine(request: RefinementRequest, signal?: AbortSignal): Promise<RefinementResult>
}

export class RefinementProviderError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'RefinementProviderError'
    this.code = code
  }
}
