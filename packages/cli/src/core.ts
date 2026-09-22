// Public core API for consumption by Admin and other interfaces (VS-096).
// These re-exports allow Admin Server to import domain logic from @kaddo/cli/core
// without shelling out to CLI commands.

export { buildProjectExplanation, type ProjectExplanation } from './core/project-explain.js'
export { buildReadinessReport, type ReadinessReport, type ReadinessStatus } from './core/readiness.js'
export { buildProjectRoute, type ProjectRoute, type RouteStep, type RouteStepStatus } from './core/project-route.js'
export { knowledgeLayers, type LayerStatus, type LayerName, type LayerMaturity } from './core/layers.js'
export { loadConfig, isModule, type KaddoConfig, type ProjectState, type RepositoryStructure } from './core/config.js'
export { discoverKnowledge, discoverWorkItems, type KnowledgeArtifact, type KnowledgeLayer } from './services/knowledge-artifacts.js'
export { loadMappedModules, type MappedModuleWithCoverage } from './services/mapped-modules.js'
export { lifecycleStateOf, lifecycleCounts, isActiveState, type LifecycleState } from './core/lifecycle.js'
export { analyzeScopeCoverage, type ScopeCoverageSummary } from './core/scope-coverage.js'
export { analyzeCrossRepoEvidence } from './core/cross-repo-evidence.js'
export {
  getWorkItemsSummary,
  getWorkItems,
  getWorkItem,
  WorkItemNotFoundError,
  type WorkItemsSummary,
  type WorkItemListItem,
  type WorkItemsResult,
  type WorkItemFilters,
  type WorkItemDetail,
  type CoverageEntry,
  type ImpactEntry,
  type AcceptanceCriterion,
  type ReleaseGateEntry,
  type CompletionExceptionEntry,
  type EvidenceRepo,
  type LinkedDecision,
  type LinkedKnowledge,
} from './core/work-items.js'
export {
  createWorkItem,
  updateWorkItem,
  getWorkItemForEdit,
  validateWorkItem,
  transitionWorkItem,
  WorkItemWriteError,
  type WorkItemInput,
  type WorkItemEditModel,
  type WorkItemCoverageInput,
  type WorkItemImpactInput,
  type WorkItemCriterionInput,
  type ValidationFinding,
  type ValidationResult,
  type WriteErrorCode,
} from './core/work-item-write.js'
export {
  getWorkItemCaptureDefinition,
  getWorkItemAgentAssets,
  assembleRefinementContext,
  normalizeAndValidateProposal,
  applyRefinement,
  type WorkItemCaptureDefinition,
  type CaptureQuestion,
  type WorkItemAgentAssets,
  type RefinementContext,
  type RefinementKnowledgeRef,
  type WorkItemRefinementProposal,
  type ProposalValidation,
  type NormalizedRefinement,
} from './core/work-item-refinement.js'
export { exists, readFile, join, cwd } from './utils/fs.js'
