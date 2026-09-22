import { RefinementService } from './service.js'
import { HeuristicRefinementProvider } from './heuristic-provider.js'
import { AnthropicRefinementProvider } from './anthropic-provider.js'

export { RefinementService } from './service.js'
export type { RefinementSessionView, RefinementStatus } from './service.js'
export { RefinementProviderError } from './provider.js'

/**
 * Build the refinement service from the environment. When ANTHROPIC_API_KEY is set it uses the
 * real provider; otherwise it falls back to a deterministic provider so the flow always works.
 * Credentials stay in this process and are never returned to the frontend.
 */
export function createRefinementService(): RefinementService {
  const key = process.env.ANTHROPIC_API_KEY
  const model = process.env.KADDO_REFINEMENT_MODEL || 'claude-3-5-sonnet-latest'
  const provider = key ? new AnthropicRefinementProvider(key, model) : new HeuristicRefinementProvider()
  return new RefinementService(provider)
}
