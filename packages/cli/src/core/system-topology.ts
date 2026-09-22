// Semantic system topology (VS-100.2).
//
// Kaddo does not infer architecture from filenames. The semantic topology — components, services,
// APIs, datastores, external systems and the typed technical relationships between them — is
// DECLARED in a canonical project artifact (knowledge/tech/system-topology.yml) that an agent
// writes after inspecting the repository, a human reviews, and Git records. Core only reads,
// validates and normalizes it here; it never writes it and never guesses.

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
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
  const filePath = join(dir, TOPOLOGY_FILE)
  if (!exists(filePath)) return { entities: [], relationships: [], findings: [], declared: false }
  const parsed = parseTopologyContent(readFile(filePath), dir)
  return { ...parsed, declared: true }
}

/**
 * Parse + validate topology content (a declared file or an agent proposal). Pure and deterministic:
 * invalid entities/relationships are dropped and reported so nothing partly-wrong reaches the graph.
 */
export function parseTopologyContent(raw: string, dir: string): { entities: SystemEntity[]; relationships: TechnicalRelationship[]; findings: TopologyFinding[]; sourceRevision?: string } {
  let parsed: { entities?: unknown; relationships?: unknown; source_revision?: unknown }
  try {
    parsed = (parseYaml(raw) ?? {}) as { entities?: unknown; relationships?: unknown; source_revision?: unknown }
  } catch {
    return { entities: [], relationships: [], findings: [{ level: 'blocking', message: 'The topology could not be parsed.' }] }
  }
  const sourceRevision = typeof parsed.source_revision === 'string' ? parsed.source_revision : undefined

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
    // Accept both the declared-file format and the agent-proposal format.
    const rawImpl = e.implementation ?? e.implementation_refs
    const implementation = strList(rawImpl).filter((p) => {
      if (isRelative(p)) return true
      findings.push({ level: 'warning', message: `Entity "${id}" implementation ref "${p}" is not a safe relative path and was dropped.` })
      return false
    })
    const prov = e.provenance
    const provOrigin = typeof prov === 'string' ? prov
      : prov && typeof prov === 'object' && typeof (prov as Record<string, unknown>).origin === 'string' ? String((prov as Record<string, unknown>).origin)
        : undefined
    const provenance = provOrigin && PROVENANCE.has(provOrigin) ? provOrigin : undefined
    const evidence = strList(e.evidence ?? (prov && typeof prov === 'object' ? (prov as Record<string, unknown>).evidence_refs : undefined)).filter(isRelative)

    seenIds.add(id)
    entities.push({
      id,
      kind: SYSTEM_ENTITY_KINDS.has(kind) ? kind : 'unknown',
      label: typeof e.label === 'string' && e.label.trim() ? e.label.trim() : id,
      ...(typeof e.purpose === 'string' && e.purpose.trim() ? { purpose: e.purpose.trim() } : {}),
      ...(moduleRaw && validModules.has(moduleRaw) ? { moduleId: moduleRaw } : {}),
      implementationRefs: implementation,
      knowledgeRefs: strList(e.knowledge ?? e.knowledge_refs),
      ...(provenance ? { provenance } : {}),
      evidence,
    })
  }

  // --- Relationships (endpoints must be declared entities) ---
  const entityIds = new Set(entities.map((e) => e.id))
  const rawRels = Array.isArray(parsed.relationships) ? parsed.relationships : []
  const relationships: TechnicalRelationship[] = []
  const seenRels = new Set<string>()
  for (const raw of rawRels) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const from = typeof r.from === 'string' ? r.from.trim() : typeof r.source === 'string' ? r.source.trim() : ''
    const to = typeof r.to === 'string' ? r.to.trim() : typeof r.target === 'string' ? r.target.trim() : ''
    const type = typeof r.type === 'string' ? r.type.trim() : ''
    if (!from || !to || !type) { findings.push({ level: 'warning', message: 'A topology relationship is missing from/to/type and was skipped.' }); continue }
    if (!TECHNICAL_RELATIONSHIP_TYPES.has(type)) { findings.push({ level: 'warning', message: `Relationship type "${type}" is not recognized and was skipped.` }); continue }
    if (!entityIds.has(from) || !entityIds.has(to)) { findings.push({ level: 'blocking', message: `Relationship ${from} → ${to} references an unknown entity endpoint.` }); continue }
    const key = `${from}~${type}~${to}`
    if (seenRels.has(key)) { findings.push({ level: 'warning', message: `Duplicate relationship ${from} ${type} ${to} was skipped.` }); continue }
    seenRels.add(key)
    const prov = r.provenance as Record<string, unknown> | undefined
    relationships.push({ from, to, type, evidence: strList(r.evidence ?? prov?.evidence_refs).filter(isRelative) })
  }

  return { entities, relationships, findings, ...(sourceRevision ? { sourceRevision } : {}) }
}

/** Validation entry point (agent/CLI use): the findings a review should resolve before persisting. */
export function validateSystemTopology(dir: string): TopologyFinding[] {
  return loadSystemTopology(dir).findings
}

// --- Proposal → validate → apply (VS-100.2.1) --------------------------------

export type TopologyWriteErrorCode = 'TOPOLOGY_INVALID' | 'TOPOLOGY_CONFLICT'
export class TopologyWriteError extends Error {
  code: TopologyWriteErrorCode
  constructor(code: TopologyWriteErrorCode, message: string) {
    super(message)
    this.name = 'TopologyWriteError'
    this.code = code
  }
}

export type TopologyValidation = {
  findings: TopologyFinding[]
  blocking: number
  warning: number
  canApply: boolean
  entityCount: number
  relationshipCount: number
}

/** The current content revision of the declared topology (hash), or a stable empty marker. */
export function topologyRevision(dir: string): string {
  const filePath = join(dir, TOPOLOGY_FILE)
  const raw = exists(filePath) ? readFile(filePath) : ''
  return crypto.createHash('sha256').update(raw, 'utf-8').digest('hex')
}

/** Validate an agent proposal (YAML) deterministically — no write, no LLM, no git. */
export function validateTopologyProposal(dir: string, proposalYaml: string): TopologyValidation {
  const { entities, relationships, findings } = parseTopologyContent(proposalYaml, dir)
  const blocking = findings.filter((f) => f.level === 'blocking').length
  const warning = findings.filter((f) => f.level === 'warning').length
  return { findings, blocking, warning, canApply: blocking === 0, entityCount: entities.length, relationshipCount: relationships.length }
}

function serializeTopology(entities: SystemEntity[], relationships: TechnicalRelationship[]): string {
  const doc = {
    entities: entities.map((e) => ({
      id: e.id,
      kind: e.kind,
      label: e.label,
      ...(e.purpose ? { purpose: e.purpose } : {}),
      ...(e.moduleId ? { module: e.moduleId } : {}),
      ...(e.implementationRefs.length ? { implementation: e.implementationRefs } : {}),
      ...(e.knowledgeRefs.length ? { knowledge: e.knowledgeRefs } : {}),
      ...(e.provenance ? { provenance: e.provenance } : {}),
      ...(e.evidence.length ? { evidence: e.evidence } : {}),
    })),
    relationships: relationships.map((r) => ({ from: r.from, to: r.to, type: r.type, ...(r.evidence.length ? { evidence: r.evidence } : {}) })),
  }
  return stringifyYaml(doc)
}

function atomicWrite(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, content, 'utf-8')
  try { fs.renameSync(tmp, filePath) } catch (err) { try { fs.rmSync(tmp, { force: true }) } catch { /* best effort */ } throw err }
}

export type TopologyApplyResult = { revision: string; entitiesNew: number; entitiesUpdated: number; relationshipsNew: number }

/**
 * Apply a validated proposal to the canonical topology artifact. Revalidates, checks the expected
 * revision (stale → conflict), merges additively with the existing topology (by id — never removing
 * unrelated entities/relationships), and writes atomically. Never runs git.
 */
export function applyTopologyProposal(dir: string, proposalYaml: string, expectedRevision?: string): TopologyApplyResult {
  const validation = validateTopologyProposal(dir, proposalYaml)
  if (!validation.canApply) throw new TopologyWriteError('TOPOLOGY_INVALID', 'The topology proposal has blocking findings and cannot be applied.')

  // Conflict protection: the proposal was built against a specific Graph revision.
  const current = topologyRevision(dir)
  if (expectedRevision != null && expectedRevision !== current) {
    throw new TopologyWriteError('TOPOLOGY_CONFLICT', 'The topology changed after this proposal was created. Refresh and validate the proposal again.')
  }

  const proposal = parseTopologyContent(proposalYaml, dir)
  const existing = loadSystemTopology(dir)

  // Merge entities by id (proposal updates or adds; existing untouched entities are preserved).
  const entityMap = new Map<string, SystemEntity>()
  for (const e of existing.entities) entityMap.set(e.id, e)
  let entitiesNew = 0, entitiesUpdated = 0
  for (const e of proposal.entities) {
    if (entityMap.has(e.id)) entitiesUpdated++
    else entitiesNew++
    entityMap.set(e.id, e)
  }

  const relKey = (r: TechnicalRelationship) => `${r.from}~${r.type}~${r.to}`
  const relMap = new Map<string, TechnicalRelationship>()
  for (const r of existing.relationships) relMap.set(relKey(r), r)
  let relationshipsNew = 0
  for (const r of proposal.relationships) {
    if (!relMap.has(relKey(r))) relationshipsNew++
    relMap.set(relKey(r), r)
  }

  const raw = serializeTopology([...entityMap.values()], [...relMap.values()])
  // Final validation of the merged result before replacing the canonical artifact.
  const finalCheck = validateTopologyProposal(dir, raw)
  if (!finalCheck.canApply) throw new TopologyWriteError('TOPOLOGY_INVALID', 'The merged topology is invalid; no changes were written.')

  atomicWrite(join(dir, TOPOLOGY_FILE), raw)
  return { revision: topologyRevision(dir), entitiesNew, entitiesUpdated, relationshipsNew }
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
    'Build a topology PROPOSAL first — do not write canonical metadata directly. For each entity',
    'capture, only when supported by evidence:',
    '- a stable id and semantic kind (application/service/component/api/interface/datastore/queue/job/external-system);',
    '- a responsibility/purpose (what it does, not how);',
    '- the owning module/repository;',
    '- implementation references (relative paths);',
    '- relevant Knowledge references (capability/ADR ids), not Kaddo operational assets;',
    '- provenance/evidence.',
    '',
    'Capture evidence-backed technical relationships: contains, calls, depends-on, reads-from,',
    'writes-to, integrates-with, runs-on. Preserve Unknown when evidence is insufficient.',
    '',
    'Validate the proposal through Kaddo before applying it. Do not write canonical topology metadata',
    `unless (1) Kaddo validation succeeds and (2) the human explicitly confirms the write. The canonical`,
    `artifact is ${TOPOLOGY_FILE}; Core validates and applies it — do not hand-edit it.`,
    '',
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
