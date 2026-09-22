// Deterministic refinement provider (VS-099.1).
//
// A no-network stand-in that produces a plausible STRUCTURED proposal from the intent and the
// Core-assembled context. It exists so the full human-in-the-loop flow (propose → review →
// feedback → refine again → apply) is demonstrable and testable without model credentials, and so
// Admin always has a functional default provider. Real intelligence comes from the Anthropic
// provider; this is intentionally simple and conservative — it prefers marking things "unknown"
// over inventing facts, and it builds on the previous proposal + feedback rather than resetting.

import type { WorkItemRefinementProvider, RefinementRequest, RefinementResult } from './provider.js'
import type { WorkItemRefinementProposal } from '@kaddo/cli/core'

function firstSentence(s: string): string {
  const m = s.trim().match(/^(.*?[.!?])(\s|$)/)
  return (m ? m[1] : s.trim()).trim()
}

function mentionsNegation(feedback: string, module: string): boolean {
  const re = new RegExp(`(not|no)\\b[^.]*\\b${module}\\b|\\b${module}\\b[^.]*(not affected|no afecta|reviewed)`, 'i')
  return re.test(feedback)
}

export class HeuristicRefinementProvider implements WorkItemRefinementProvider {
  readonly name = 'heuristic'

  async refine(request: RefinementRequest): Promise<RefinementResult> {
    const start = Date.now()
    const { context, intent, previousProposal, feedback } = request
    const modules = context.modules

    // Start from the previous proposal's affected modules (feedback augments, never resets); core
    // is always in scope for a backend-touching change.
    const affected = new Set<string>(previousProposal?.affectedModules ?? ['core'])
    if (feedback) {
      for (const m of modules) {
        if (new RegExp(`\\b${m}\\b`, 'i').test(feedback)) {
          if (mentionsNegation(feedback, m)) affected.delete(m)
          else affected.add(m)
        }
      }
    }

    const affectedModules = modules.filter((m) => affected.has(m))
    const moduleCoverage = modules.map((m) =>
      affected.has(m)
        ? { id: m, status: 'affected', reason: m === 'core' ? 'Backend behavior changes.' : 'User-facing change identified.' }
        : { id: m, status: 'unknown' },
    )

    const frontendAffected = affected.has('frontend')
    const impactAnalysis = [
      { surface: 'backend', status: 'affected' },
      { surface: 'frontend', status: frontendAffected ? 'affected' : 'unknown', ...(frontendAffected ? {} : { question: 'Is a user-facing surface involved?' }) },
      { surface: 'database', status: 'reviewed-not-affected' },
      { surface: 'feature-flags', status: 'unknown', question: 'Is this behavior controlled by a feature flag?' },
    ]

    const summary = firstSentence(intent)
    const proposal: WorkItemRefinementProposal = {
      outcome: {
        actor: 'User',
        observableOutcome: summary,
        currentBehavior: `Today: ${summary.toLowerCase()} is not yet supported as described.`,
        targetBehavior: summary,
      },
      journey: {
        entryPoints: [frontendAffected ? 'Public entry point' : 'Application entry point'],
        flow: ['Entry point', 'Application logic', 'Persistence', 'Result'],
      },
      affectedModules,
      moduleCoverage,
      impactAnalysis,
      scopeConfidence: {
        level: 'medium',
        reasons: ['Primary behavior identified from the intent.', 'Feature flag ownership not yet confirmed.'],
      },
      scopeUnknowns: ['Is this behavior controlled by a feature flag?'],
      acceptanceCriteria: [
        `${summary}`,
        'The change is covered by the affected modules above.',
      ],
      linkedDecisions: [],
      relatedKnowledge: [],
    }

    return { proposal, meta: { provider: this.name, durationMs: Date.now() - start, repairAttempts: 0 } }
  }
}
