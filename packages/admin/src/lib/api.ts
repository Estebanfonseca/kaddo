const BASE = '/api/v1/admin'

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

export type ProjectOverview = {
  project: { name: string; state: string; structure: string; language: string; teamSize: string }
  knowledge: { layers: { layer: string; status: string }[]; missing: string[] }
  workItems: {
    total: number
    byState: Record<string, number>
    byType: Record<string, number>
    items: { id: string; title: string; type: string; lifecycle: string; initiative: string }[]
  }
  modules: { modules: { id: string; role: string; path?: string; available: boolean }[] }
  readiness: { overall: string; recommendedNextStep: { label: string; command?: string } }
  route: { type: string; completed: number; total: number; progressPercent: number; steps: { id: string; label: string; status: string }[] }
  findings: { blocking: number; warning: number; fyi: number; items: { level: string; message: string }[] }
}

export type KnowledgeArtifactSummary = {
  id: string
  title: string
  layer: string
  path: string
  status: string
  type?: string
}

export type KnowledgeInventoryLayer = {
  id: string
  label: string
  status: string
  artifacts: KnowledgeArtifactSummary[]
}

export type KnowledgeInventory = {
  layers: KnowledgeInventoryLayer[]
}

export type KnowledgeArtifactDetail = {
  id: string
  title: string
  layer: string
  path: string
  status: string
  format: string
  content: string
  type?: string
}

// --- Work Items (VS-098) -----------------------------------------------------

export type WorkItemsSummaryStats = {
  total: number
  active: number
  draft: number
  ready: number
  inProgress: number
  blocked: number
  completed: number
  archived: number
}

export type WorkItemListItem = {
  id: string
  title: string
  type: string
  status: string
  implementationStatus: string | null
  validationStatus: string | null
  releaseStatus: string | null
  affectedModules: string[]
  scopeConfidenceLevel: string | null
  initiative: string | null
}

export type WorkItemsList = {
  summary: WorkItemsSummaryStats
  items: WorkItemListItem[]
  modules: string[]
}

export type CoverageEntry = { id: string; status: string; reason?: string }
export type ImpactEntry = { surface: string; status: string; reason?: string; question?: string }
export type AcceptanceCriterion = { text: string; checked: boolean | null }
export type ReleaseGateEntry = { id: string; status: string; reason?: string; requiredFor?: string }
export type CompletionExceptionEntry = { id: string; status: string; reason?: string; category?: string; impact?: string }
export type RepoValidation = { command: string; status: string; reason?: string }
export type RepoMigration = { id: string; environment: string; status: string; reason?: string }
export type EvidenceRepo = {
  module: string
  role: string
  status: string
  changedPaths: string[]
  validations: RepoValidation[]
  migrations: RepoMigration[]
}
export type LinkedDecision = { id: string; title?: string; knowledgeId?: string; knowledgeLayer?: string }
export type LinkedKnowledge = { id: string; title: string; layer: string }

export type WorkItemDetail = WorkItemListItem & {
  actor: string | null
  outcome: string | null
  currentBehavior: string | null
  targetBehavior: string | null
  entryPoints: string | null
  endToEndFlow: string | null
  scopeConfidence: { level: string; reasons: string[] } | null
  scopeUnknowns: string[]
  moduleCoverage: CoverageEntry[]
  impactAnalysis: ImpactEntry[]
  acceptanceCriteria: AcceptanceCriterion[]
  implementationEvidence: EvidenceRepo[]
  releaseGates: ReleaseGateEntry[]
  completionExceptions: CompletionExceptionEntry[]
  decisions: LinkedDecision[]
  relatedKnowledge: LinkedKnowledge[]
  source: { type: string; id?: string; inferred: boolean }
  path: string
}

export type WorkItemFilters = { status?: string; module?: string; query?: string }

function toQuery(filters: WorkItemFilters): string {
  const params = new URLSearchParams()
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters.module && filters.module !== 'all') params.set('module', filters.module)
  if (filters.query && filters.query.trim()) params.set('query', filters.query.trim())
  const s = params.toString()
  return s ? `?${s}` : ''
}

export const api = {
  initSession: () => fetchApi<{ status: string }>('/session'),
  getOverview: () => fetchApi<ProjectOverview>('/overview'),
  getProject: () => fetchApi<ProjectOverview['project']>('/project'),
  getKnowledge: () => fetchApi<ProjectOverview['knowledge']>('/knowledge'),
  getModules: () => fetchApi<ProjectOverview['modules']>('/modules'),
  getReadiness: () => fetchApi<ProjectOverview['readiness']>('/readiness'),
  getRoute: () => fetchApi<ProjectOverview['route']>('/route'),
  getFindings: () => fetchApi<ProjectOverview['findings']>('/findings'),
  getKnowledgeInventory: () => fetchApi<KnowledgeInventory>('/knowledge/inventory'),
  getKnowledgeArtifact: (artifactId: string) => fetchApi<KnowledgeArtifactDetail>(`/knowledge/artifact/${encodeURIComponent(artifactId)}`),
  getWorkItemsList: (filters: WorkItemFilters = {}) => fetchApi<WorkItemsList>(`/work-items${toQuery(filters)}`),
  getWorkItem: (workItemId: string) => fetchApi<WorkItemDetail>(`/work-items/${encodeURIComponent(workItemId)}`),
}
