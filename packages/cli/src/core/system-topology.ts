// Semantic system topology (VS-100.2).
//
// Kaddo does not infer architecture from filenames. The semantic topology — components, services,
// APIs, datastores, external systems and the typed technical relationships between them — is
// DECLARED in a canonical project artifact (knowledge/tech/system-topology.yml) that an agent
// writes after inspecting the repository, a human reviews, and Git records. Core only reads,
// validates and normalizes it here; it never writes it and never guesses.

import { parse as parseYaml } from 'yaml'
import { exists, readFile, join } from '../utils/fs.js'
import { loadMappedModules } from '../services/mapped-modules.js'

export const TOPOLOGY_FILE = 'knowledge/tech/system-topology.yml'

export const SYSTEM_ENTITY_KINDS = new Set([
  'system', 'application', 'service', 'component', 'api', 'interface',
  'datastore', 'queue', 'job', 'external-system', 'module', 'unknown',
])

export const TECHNICAL_RELATIONSHIP_TYPES = new Set([
  'contains', 'depends-on', 'calls', 'reads-from', 'writes-to',
  'publishes-to', 'subscribes-to', 'integrates-with', 'runs-on', 'implemented-by',
])

const PROVENANCE = new Set(['declared', 'derived', 'agent-reviewed'])

export type SystemEntity = {
  id: string
  kind: string
  label: string
  purpose?: string
  moduleId?: string
  implementationRefs: string[]
  knowledgeRefs: string[]
  provenance?: string
  evidence: string[]
}

export type TechnicalRelationship = {
  from: string
  to: string
  type: string
  evidence: string[]
}

export type TopologyFinding = { level: 'blocking' | 'warning'; message: string }

export type SystemTopology = {
  entities: SystemEntity[]
  relationships: TechnicalRelationship[]
  findings: TopologyFinding[]
  /** True when the file exists (even if it declares nothing valid). */
  declared: boolean
}

function isRelative(p: string): boolean {
  return typeof p === 'string' && p.trim() !== '' && !/^([a-zA-Z]:[\\/]|\/)/.test(p) && !p.includes('..')
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean) : []
}

/**
 * Load and validate the declared system topology. Invalid entities/relationships are dropped and
 * reported as findings — a malformed declaration never produces a partially-wrong graph.
 */
export function loadSystemTopology(dir: string): SystemTopology {
  const path = join(dir, TOPOLOGY_FILE)
  if (!exists(path)) return { entities: [], relationships: [], findings: [], declared: false }

  let parsed: { entities?: unknown; relationships?: unknown }
  try {
    parsed = (parseYaml(readFile(path)) ?? {}) as { entities?: unknown; relationships?: unknown }
  } catch {
    return { entities: [], relationships: [], findings: [{ level: 'blocking', message: 'system-topology.yml could not be parsed.' }], declared: true }
  }

  const findings: TopologyFinding[] = []
  const validModules = new Set<string>(['core', ...loadMappedModules(dir).map((m) => m.id)])

  // --- Entities ---
  const rawEntities = Array.isArray(parsed.entities) ? parsed.entities : []
  const entities: SystemEntity[] = []
  const seenIds = new Set<string>()
  for (const raw of rawEntities) {
    if (!raw || typeof raw !== 'object') continue
    const e = raw as Record<string, unknown>
    const id = typeof e.id === 'string' ? e.id.trim() : ''
    if (!id) { findings.push({ level: 'warning', message: 'A topology entity is missing an id and was skipped.' }); continue }
    if (seenIds.has(id)) { findings.push({ level: 'blocking', message: `Duplicate topology entity id "${id}".` }); continue }
    const kind = typeof e.kind === 'string' ? e.kind.trim() : 'unknown'
    if (!SYSTEM_ENTITY_KINDS.has(kind)) { findings.push({ level: 'warning', message: `Entity "${id}" has an unknown kind "${kind}"; treated as unknown.` }) }
    const moduleRaw = typeof e.module === 'string' ? e.module.trim() : undefined
    if (moduleRaw && !validModules.has(moduleRaw)) findings.push({ level: 'warning', message: `Entity "${id}" references unregistered module "${moduleRaw}".` })
    const implementation = strList(e.implementation).filter((p) => {
      if (isRelative(p)) return true
      findings.push({ level: 'warning', message: `Entity "${id}" implementation ref "${p}" is not a safe relative path and was dropped.` })
      return false
    })
    const provenance = typeof e.provenance === 'string' && PROVENANCE.has(e.provenance) ? e.provenance : undefined

    seenIds.add(id)
    entities.push({
      id,
      kind: SYSTEM_ENTITY_KINDS.has(kind) ? kind : 'unknown',
      label: typeof e.label === 'string' && e.label.trim() ? e.label.trim() : id,
      ...(typeof e.purpose === 'string' && e.purpose.trim() ? { purpose: e.purpose.trim() } : {}),
      ...(moduleRaw && validModules.has(moduleRaw) ? { moduleId: moduleRaw } : {}),
      implementationRefs: implementation,
      knowledgeRefs: strList(e.knowledge),
      ...(provenance ? { provenance } : {}),
      evidence: strList(e.evidence).filter(isRelative),
    })
  }

  // --- Relationships (endpoints must be declared entities) ---
  const entityIds = new Set(entities.map((e) => e.id))
  const rawRels = Array.isArray(parsed.relationships) ? parsed.relationships : []
  const relationships: TechnicalRelationship[] = []
  for (const raw of rawRels) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const from = typeof r.from === 'string' ? r.from.trim() : ''
    const to = typeof r.to === 'string' ? r.to.trim() : ''
    const type = typeof r.type === 'string' ? r.type.trim() : ''
    if (!from || !to || !type) { findings.push({ level: 'warning', message: 'A topology relationship is missing from/to/type and was skipped.' }); continue }
    if (!TECHNICAL_RELATIONSHIP_TYPES.has(type)) { findings.push({ level: 'warning', message: `Relationship type "${type}" is not recognized and was skipped.` }); continue }
    if (!entityIds.has(from) || !entityIds.has(to)) { findings.push({ level: 'blocking', message: `Relationship ${from} → ${to} references an unknown entity endpoint.` }); continue }
    relationships.push({ from, to, type, evidence: strList(r.evidence).filter(isRelative) })
  }

  return { entities, relationships, findings, declared: true }
}

/** Validation entry point (agent/CLI use): the findings a review should resolve before persisting. */
export function validateSystemTopology(dir: string): TopologyFinding[] {
  return loadSystemTopology(dir).findings
}

// --- Enrichment handoff ------------------------------------------------------

export type TopologyEnrichmentHandoff = {
  projectName: string
  recommendedAgent: string
  recommendedSkill: string
  targetFile: string
  /** Copyable, agent-agnostic instructions. Contains no secrets, paths or source code. */
  text: string
}

/**
 * Build the handoff a human copies into a Kaddo-enabled agent to DISCOVER the semantic system
 * topology by inspecting the repository. Admin never runs it. The agent proposes; the human
 * reviews; Core validates; Git records. It recommends the canonical Kaddo assets and never asks
 * the agent to infer architecture from filenames or to run mutating Git operations.
 */
export function buildTopologyEnrichmentHandoff(dir: string, projectName: string): TopologyEnrichmentHandoff {
  const mappedModules = loadMappedModules(dir).map((m) => m.id)
  const lines: string[] = [
    `Enrich the semantic system topology for the Kaddo project "${projectName}".`,
    '',
    'Use the canonical architecture-agent and graph-metadata-review skill (via Kaddo MCP or skills).',
    'Inspect the actual repository and relevant mapped modules — do not infer architecture from',
    'filenames or directory names.',
  ]
  if (mappedModules.length > 0) {
    lines.push('', `This is a multirepo project. Inspect the relevant mapped modules (${mappedModules.join(', ')}) before finalizing the topology.`)
  }
  lines.push(
    '',
    `Write the result to ${TOPOLOGY_FILE} as declared entities and relationships. For each entity`,
    'capture, only when supported by evidence:',
    '- a stable id and semantic kind (application/service/component/api/interface/datastore/queue/job/external-system);',
    '- a responsibility/purpose (what it does, not how);',
    '- the owning module/repository;',
    '- implementation references (relative paths);',
    '- relevant Knowledge references (capability/ADR ids), not Kaddo operational assets.',
    '',
    'Capture evidence-backed technical relationships: contains, calls, depends-on, reads-from,',
    'writes-to, integrates-with, runs-on. Preserve unknowns when evidence is insufficient.',
    '',
    'Review the proposed graph metadata (duplicate ids, dangling relationships, unknown modules,',
    'invalid references) before writing.',
    'Do not implement application changes. Do not run mutating Git operations.',
  )
  return {
    projectName,
    recommendedAgent: 'architecture-agent',
    recommendedSkill: 'graph-metadata-review',
    targetFile: TOPOLOGY_FILE,
    text: lines.join('\n'),
  }
}
