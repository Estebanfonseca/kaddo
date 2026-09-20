import {
  buildProjectExplanation,
  buildReadinessReport,
  buildProjectRoute,
  knowledgeLayers,
  loadConfig,
  isModule,
  loadMappedModules,
  exists,
  join,
} from '@kaddo/cli/core'
import type {
  ProjectOverview,
  ProjectSummary,
  KnowledgeSummary,
  WorkItemSummary,
  ModuleSummary,
  ProjectReadiness,
  ProjectRouteResponse,
  FindingsSummary,
} from './contracts/schemas.js'

export function getProjectSummary(dir: string): ProjectSummary {
  const config = loadConfig(dir)
  if (!config) throw new CoreError('PROJECT_NOT_FOUND', 'No Kaddo project was found.')
  return {
    name: config.project.name ?? 'unknown',
    state: config.project.state ?? 'unknown',
    structure: config.project.structure ?? 'unknown',
    language: (config.project as { language?: string }).language ?? 'en',
    teamSize: config.team.size ?? 'unknown',
  }
}

export function getKnowledgeSummary(dir: string): KnowledgeSummary {
  const exp = buildProjectExplanation(dir)
  return {
    layers: exp.layers.map((l) => ({ layer: l.layer, status: l.status })),
    missing: exp.missingKnowledge,
  }
}

export function getWorkItemSummary(dir: string): WorkItemSummary {
  const exp = buildProjectExplanation(dir)
  return {
    total: exp.workItems.total,
    byState: exp.workItems.byState,
    byType: exp.workItems.byType,
    items: exp.workItems.items.map((i) => ({
      id: i.id,
      title: i.title,
      type: i.type,
      lifecycle: i.lifecycle,
      initiative: i.initiative,
    })),
  }
}

export function getModules(dir: string): ModuleSummary {
  const mapped = loadMappedModules(dir)
  return {
    modules: mapped.map((m) => ({
      id: m.id,
      role: m.role,
      path: m.path,
      available: m.available,
    })),
  }
}

export function getProjectReadiness(dir: string): ProjectReadiness {
  const report = buildReadinessReport(dir)
  return {
    overall: report.overall,
    recommendedNextStep: {
      label: report.nextStepRecommendation.label,
      command: report.nextStepRecommendation.command,
    },
  }
}

export function getProjectRoute(dir: string): ProjectRouteResponse {
  const route = buildProjectRoute(dir)
  return {
    type: route.type,
    completed: route.completed,
    total: route.total,
    progressPercent: route.progressPercent,
    steps: route.steps.map((s) => ({
      id: s.id,
      label: s.label,
      status: s.status,
      ...(s.evidence ? { evidence: s.evidence } : {}),
      ...(s.reason ? { reason: s.reason } : {}),
      ...(s.command ? { command: s.command } : {}),
    })),
  }
}

export function getFindings(dir: string): FindingsSummary {
  const exp = buildProjectExplanation(dir)
  const items: FindingsSummary['items'] = []

  if (exp.missingKnowledge.length > 0) {
    for (const m of exp.missingKnowledge) {
      items.push({ level: 'warning', message: `Missing: ${m}` })
    }
  }

  if (exp.duplicateWorkItems.length > 0) {
    for (const d of exp.duplicateWorkItems) {
      items.push({ level: 'warning', message: `Possible duplicate Work Items: ${d.items.map((i) => i.id).join(', ')} (${d.reason})` })
    }
  }

  const blocking = items.filter((i) => i.level === 'blocking').length
  const warning = items.filter((i) => i.level === 'warning').length
  const fyi = items.filter((i) => i.level === 'fyi').length

  return { blocking, warning, fyi, items }
}

export function getProjectOverview(dir: string): ProjectOverview {
  return {
    project: getProjectSummary(dir),
    knowledge: getKnowledgeSummary(dir),
    workItems: getWorkItemSummary(dir),
    modules: getModules(dir),
    readiness: getProjectReadiness(dir),
    route: getProjectRoute(dir),
    findings: getFindings(dir),
  }
}

export class CoreError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'CoreError'
  }
}
