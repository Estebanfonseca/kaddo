// Anthropic refinement provider (VS-099.1).
//
// The real provider. It composes the request from the CANONICAL Kaddo assets — the work-item-agent
// prompt and the work-item-refinement skill — so Admin never invents a second refinement prompt.
// It only executes the model and parses a structured proposal; validation, serialization and
// lifecycle stay in Core. Gated on an API key; when unset, the server falls back to the heuristic
// provider. Credentials are read from the environment and never returned to the frontend.

import type { WorkItemRefinementProvider, RefinementRequest, RefinementResult } from './provider.js'
import { RefinementProviderError } from './provider.js'
import type { WorkItemRefinementProposal } from '@kaddo/cli/core'

const API_URL = 'https://api.anthropic.com/v1/messages'

const SCHEMA_HINT = `Return ONLY a JSON object (no prose, no code fences) with this shape — omit fields you cannot determine:
{
  "title"?: string,
  "outcome"?: { "actor"?: string, "observableOutcome"?: string, "currentBehavior"?: string, "targetBehavior"?: string },
  "journey"?: { "entryPoints"?: string[], "flow"?: string[] },
  "affectedModules"?: string[],
  "moduleCoverage"?: [{ "id": string, "status": "affected"|"reviewed-not-affected"|"unknown"|"not-applicable", "reason"?: string }],
  "impactAnalysis"?: [{ "surface": string, "status": "affected"|"reviewed-not-affected"|"unknown"|"not-applicable", "reason"?: string, "question"?: string }],
  "scopeConfidence"?: { "level": "high"|"medium"|"low", "reasons"?: string[] },
  "scopeUnknowns"?: string[],
  "acceptanceCriteria"?: string[],
  "linkedDecisions"?: string[],
  "relatedKnowledge"?: string[]
}
Only reference module ids, decision ids and knowledge ids that appear in the provided context. Prefer "unknown" over inventing facts.`

function extractJson(text: string): WorkItemRefinementProposal {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new RefinementProviderError('INVALID_RESPONSE', 'The model did not return a JSON proposal.')
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new RefinementProviderError('INVALID_RESPONSE', 'The model returned a proposal that could not be parsed.')
  }
}

export class AnthropicRefinementProvider implements WorkItemRefinementProvider {
  readonly name = 'anthropic'
  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey
    this.model = model
  }

  async refine(request: RefinementRequest, signal?: AbortSignal): Promise<RefinementResult> {
    const start = Date.now()
    const { context, assets, intent, previousProposal, feedback } = request

    const system = [
      assets.agentPrompt,
      assets.skill ?? '',
      '# Output format',
      SCHEMA_HINT,
    ].filter(Boolean).join('\n\n')

    const userParts = [
      `# Work Item intent\n${intent}`,
      `# Project\n${JSON.stringify(context.project)}`,
      `# Registered modules\n${context.modules.join(', ')}`,
      `# Known decisions\n${context.decisions.map((d) => `${d.id} — ${d.title}`).join('\n') || '(none)'}`,
      `# Knowledge\n${context.knowledge.map((k) => `${k.id} — ${k.title} (${k.layer})`).join('\n') || '(none)'}`,
      `# Current Work Item model\n${JSON.stringify(context.workItem.current)}`,
    ]
    if (previousProposal) userParts.push(`# Previous proposal\n${JSON.stringify(previousProposal)}`)
    if (feedback) userParts.push(`# Human feedback (augments the original intent, does not replace it)\n${feedback}`)

    let res: Response
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2048,
          system,
          messages: [{ role: 'user', content: userParts.join('\n\n') }],
        }),
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw new RefinementProviderError('TIMEOUT', 'The refinement timed out.')
      throw new RefinementProviderError('PROVIDER_ERROR', 'The refinement provider could not be reached.')
    }

    if (!res.ok) {
      // Never surface provider credentials or raw bodies to callers.
      throw new RefinementProviderError('PROVIDER_ERROR', `The refinement provider returned an error (${res.status}).`)
    }

    const body = (await res.json()) as { content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } }
    const text = (body.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('')
    const proposal = extractJson(text)

    return {
      proposal,
      meta: {
        provider: this.name,
        model: this.model,
        durationMs: Date.now() - start,
        inputTokens: body.usage?.input_tokens,
        outputTokens: body.usage?.output_tokens,
      },
    }
  }
}
