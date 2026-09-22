import { z } from 'zod'

export const ProjectSummarySchema = z.object({
  name: z.string(),
  state: z.string(),
  structure: z.string(),
  language: z.string(),
  teamSize: z.string(),
})

export const KnowledgeSummarySchema = z.object({
  layers: z.array(z.object({
    layer: z.string(),
    status: z.string(),
  })),
  missing: z.array(z.string()),
})

export const WorkItemSummarySchema = z.object({
  total: z.number(),
  byState: z.record(z.string(), z.number()),
  byType: z.record(z.string(), z.number()),
  items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    lifecycle: z.string(),
    initiative: z.string(),
  })),
})

export const ModuleSummarySchema = z.object({
  modules: z.array(z.object({
    id: z.string(),
    role: z.string(),
    path: z.string().optional(),
    available: z.boolean(),
  })),
})

export const ProjectReadinessSchema = z.object({
  overall: z.string(),
  recommendedNextStep: z.object({
    label: z.string(),
    command: z.string().optional(),
  }),
})

export const RouteStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.string(),
  evidence: z.array(z.string()).optional(),
  reason: z.string().optional(),
  command: z.string().optional(),
})

export const ProjectRouteSchema = z.object({
  type: z.string(),
  completed: z.number(),
  total: z.number(),
  progressPercent: z.number(),
  steps: z.array(RouteStepSchema),
})

export const FindingsSummarySchema = z.object({
  blocking: z.number(),
  warning: z.number(),
  fyi: z.number(),
  items: z.array(z.object({
    level: z.enum(['blocking', 'warning', 'fyi']),
    message: z.string(),
  })),
})

export const ProjectOverviewSchema = z.object({
  project: ProjectSummarySchema,
  knowledge: KnowledgeSummarySchema,
  workItems: WorkItemSummarySchema,
  modules: ModuleSummarySchema,
  readiness: ProjectReadinessSchema,
  route: ProjectRouteSchema,
  findings: FindingsSummarySchema,
})

export const KnowledgeArtifactSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  layer: z.string(),
  path: z.string(),
  status: z.string(),
  type: z.string().optional(),
})

export const KnowledgeInventoryLayerSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.string(),
  artifacts: z.array(KnowledgeArtifactSummarySchema),
})

export const KnowledgeInventorySchema = z.object({
  layers: z.array(KnowledgeInventoryLayerSchema),
})

export const KnowledgeArtifactDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  layer: z.string(),
  path: z.string(),
  status: z.string(),
  format: z.string(),
  content: z.string(),
  type: z.string().optional(),
})

// --- Work Items (VS-098) -----------------------------------------------------

export const WorkItemsSummaryStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  draft: z.number(),
  ready: z.number(),
  inProgress: z.number(),
  blocked: z.number(),
  completed: z.number(),
  archived: z.number(),
})

export const WorkItemListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  status: z.string(),
  implementationStatus: z.string().nullable(),
  validationStatus: z.string().nullable(),
  releaseStatus: z.string().nullable(),
  affectedModules: z.array(z.string()),
  scopeConfidenceLevel: z.string().nullable(),
  initiative: z.string().nullable(),
})

export const WorkItemsListSchema = z.object({
  summary: WorkItemsSummaryStatsSchema,
  items: z.array(WorkItemListItemSchema),
  modules: z.array(z.string()),
})

const CoverageEntrySchema = z.object({ id: z.string(), status: z.string(), reason: z.string().optional() })
const ImpactEntrySchema = z.object({
  surface: z.string(),
  status: z.string(),
  reason: z.string().optional(),
  question: z.string().optional(),
})
const AcceptanceCriterionSchema = z.object({ text: z.string(), checked: z.boolean().nullable() })
const ReleaseGateEntrySchema = z.object({
  id: z.string(),
  status: z.string(),
  reason: z.string().optional(),
  requiredFor: z.string().optional(),
})
const CompletionExceptionEntrySchema = z.object({
  id: z.string(),
  status: z.string(),
  reason: z.string().optional(),
  category: z.string().optional(),
  impact: z.string().optional(),
})
const RepoValidationSchema = z.object({ command: z.string(), status: z.string(), reason: z.string().optional() })
const RepoMigrationSchema = z.object({
  id: z.string(),
  environment: z.string(),
  status: z.string(),
  reason: z.string().optional(),
})
const EvidenceRepoSchema = z.object({
  module: z.string(),
  role: z.string(),
  status: z.string(),
  changedPaths: z.array(z.string()),
  validations: z.array(RepoValidationSchema),
  migrations: z.array(RepoMigrationSchema),
})
const LinkedDecisionSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  knowledgeId: z.string().optional(),
  knowledgeLayer: z.string().optional(),
})
const LinkedKnowledgeSchema = z.object({ id: z.string(), title: z.string(), layer: z.string() })

export const WorkItemDetailSchema = WorkItemListItemSchema.extend({
  summary: z.string().nullable(),
  actor: z.string().nullable(),
  outcome: z.string().nullable(),
  currentBehavior: z.string().nullable(),
  targetBehavior: z.string().nullable(),
  entryPoints: z.string().nullable(),
  endToEndFlow: z.string().nullable(),
  scopeConfidence: z.object({ level: z.string(), reasons: z.array(z.string()) }).nullable(),
  scopeUnknowns: z.array(z.string()),
  moduleCoverage: z.array(CoverageEntrySchema),
  impactAnalysis: z.array(ImpactEntrySchema),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema),
  implementationEvidence: z.array(EvidenceRepoSchema),
  releaseGates: z.array(ReleaseGateEntrySchema),
  completionExceptions: z.array(CompletionExceptionEntrySchema),
  decisions: z.array(LinkedDecisionSchema),
  relatedKnowledge: z.array(LinkedKnowledgeSchema),
  source: z.object({ type: z.string(), id: z.string().optional(), inferred: z.boolean() }).passthrough(),
  path: z.string(),
  refinement: z.object({
    status: z.enum(['needs-refinement', 'refined']),
    aspects: z.object({ outcome: z.boolean(), journey: z.boolean(), modules: z.boolean(), impact: z.boolean(), acceptance: z.boolean() }),
  }),
})

// --- Work Item writes (VS-099) -----------------------------------------------

export const WorkItemInputSchema = z.object({
  title: z.string(),
  type: z.string(),
  summary: z.string().optional(),
  actor: z.string().optional(),
  outcome: z.string().optional(),
  currentBehavior: z.string().optional(),
  targetBehavior: z.string().optional(),
  entryPoints: z.string().optional(),
  endToEndFlow: z.string().optional(),
  scopeConfidence: z.object({ level: z.string(), reasons: z.array(z.string()) }).nullable(),
  scopeUnknowns: z.array(z.string()),
  affectedModules: z.array(z.string()),
  moduleCoverage: z.array(z.object({ id: z.string(), status: z.string(), reason: z.string().optional() })),
  impactAnalysis: z.array(z.object({ surface: z.string(), status: z.string(), reason: z.string().optional(), question: z.string().optional() })),
  acceptanceCriteria: z.array(z.object({ text: z.string(), checked: z.boolean().nullable() })),
  decisions: z.array(z.string()),
  relatedKnowledge: z.array(z.string()),
})

export const WorkItemCreateSchema = z.object({
  intent: z.string().min(1),
  type: z.string().min(1),
})

export const WorkItemUpdateSchema = z.object({
  model: WorkItemInputSchema,
  expectedRevision: z.string().min(1),
})

export const WorkItemTransitionSchema = z.object({
  expectedRevision: z.string().min(1),
})

export const WorkItemEditModelSchema = WorkItemInputSchema.extend({
  id: z.string(),
  status: z.string(),
  revision: z.string(),
  path: z.string(),
  editable: z.boolean(),
  editableReason: z.string().optional(),
})

export const ValidationResultSchema = z.object({
  findings: z.array(z.object({ level: z.enum(['blocking', 'warning', 'fyi']), message: z.string() })),
  canMarkReady: z.boolean(),
})

export const WorkItemWriteResultSchema = z.object({
  id: z.string(),
  path: z.string(),
  revision: z.string(),
  status: z.string().optional(),
})

// --- Work Item refinement (VS-099.1) -----------------------------------------

export const WorkItemCreateWithAnswersSchema = z.object({
  intent: z.string().min(1),
  type: z.string().min(1),
  answers: z.record(z.string(), z.string()).optional(),
})

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

export type ProjectOverview = z.infer<typeof ProjectOverviewSchema>
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>
export type KnowledgeSummary = z.infer<typeof KnowledgeSummarySchema>
export type WorkItemSummary = z.infer<typeof WorkItemSummarySchema>
export type ModuleSummary = z.infer<typeof ModuleSummarySchema>
export type ProjectReadiness = z.infer<typeof ProjectReadinessSchema>
export type ProjectRouteResponse = z.infer<typeof ProjectRouteSchema>
export type FindingsSummary = z.infer<typeof FindingsSummarySchema>
export type KnowledgeInventory = z.infer<typeof KnowledgeInventorySchema>
export type KnowledgeArtifactDetail = z.infer<typeof KnowledgeArtifactDetailSchema>
export type WorkItemsList = z.infer<typeof WorkItemsListSchema>
export type WorkItemListItem = z.infer<typeof WorkItemListItemSchema>
export type WorkItemDetail = z.infer<typeof WorkItemDetailSchema>
export type WorkItemInput = z.infer<typeof WorkItemInputSchema>
export type WorkItemEditModel = z.infer<typeof WorkItemEditModelSchema>
export type ValidationResult = z.infer<typeof ValidationResultSchema>
export type WorkItemWriteResult = z.infer<typeof WorkItemWriteResultSchema>
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
