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
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
