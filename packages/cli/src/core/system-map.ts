// System Map projection (VS-100).
//
// A human-oriented, read-only projection of the canonical Kaddo Graph. The Graph stays the source
// of structural truth; this projection simplifies it for exploration: stable ids, human labels,
// safe (relative-only) paths, module/repository grouping when it can be determined deterministically,
// and navigable references to Knowledge and Work Items. It never invents nodes or relationships and
// never exposes absolute paths, secrets or source code.

import { loadConfig } from './config.js'
import { buildGraph, type GraphNode } from './graph.js'
import { buildGraphHints, type GraphQuality } from './graph-hints.js'
import { discoverKnowledge, discoverWorkItems } from '../services/knowledge-artifacts.js'
import { loadMappedModules } from '../services/mapped-modules.js'
import { loadSystemTopology, TECHNICAL_RELATIONSHIP_TYPES } from './system-topology.js'
import { exists, join } from '../utils/fs.js'

// The four dimensions a node belongs to. System = how the system is built (topology); Knowledge =
// why it exists and under what constraints; Delivery = how it evolved; Implementation = where it
// lives in code. Derived deterministically from the graph node type — never inferred/invented.
export type SystemDimension = 'system' | 'knowledge' | 'delivery' | 'implementation' | 'unknown'

export type SystemMapNode = {
  id: string
  type: string
  label: string
  dimension: SystemDimension
  status?: string
  /** Project-relative path only — never absolute. */
  path?: string
  /** Navigable Work Item id (for work-item nodes). */
  workItemRef?: string
  /** Navigable Knowledge artifact reference (for knowledge/decision nodes). */
  knowledgeRef?: { id: string; layer: string }
  /** Module/repository grouping when it can be determined deterministically. */
  moduleId?: string
  /** Semantic system entity fields (VS-100.2), present for declared topology nodes. */
  purpose?: string
  implementationRefs?: string[]
  knowledgeRefs?: { id: string; layer: string }[]
  provenance?: string
  evidence?: string[]
}

function dimensionOf(type: string): SystemDimension {
  switch (type) {
    case 'module': case 'application': case 'service': case 'component':
    case 'api': case 'interface': case 'database': case 'queue': case 'job': case 'external-system':
      return 'system'
    case 'business': case 'product': case 'tech': case 'delivery':
    case 'capability': case 'decision': case 'project': case 'knowledge-capsule':
      return 'knowledge'
    case 'work-item': case 'initiative': case 'roadmap-candidate': case 'release':
      return 'delivery'
    case 'code-glob': case 'file': case 'directory': case 'migration': case 'configuration-artifact':
      return 'implementation'
    default:
      return 'unknown'
  }
}

export type SystemMapRelationship = {
  id: string
  source: string
  target: string
  type: string
  label: string
}

export type SystemMapGroup = {
  id: string
  label: string
  repositoryId: string
  available: boolean
}

export type SystemMapMetadata = {
  projectName: string
  structure: string
  nodeCount: number
  relationshipCount: number
  /** Deterministic coverage signal from Core graph hints — never a fabricated percentage. */
  coverage: GraphQuality
  available: boolean
  /** Node counts per dimension, so interfaces can present honest availability. */
  dimensions: Record<SystemDimension, number>
  /** Whether Kaddo knows any semantic system-topology node (vs only knowledge/delivery). */
  topologyAvailable: boolean
  /** Honest topology status derived from Core — never a fabricated percentage. */
  topologyStatus: 'unavailable' | 'partial' | 'available'
  /** Counts of the declared semantic topology (VS-100.2). */
  semanticEntityCount: number
  technicalRelationshipCount: number
  /** Findings from validating the declared topology (dropped/invalid items). */
  topologyFindings: { level: 'blocking' | 'warning'; message: string }[]
}

export type SystemMapProjection = {
  system: { name: string }
  nodes: SystemMapNode[]
  relationships: SystemMapRelationship[]
  groups: SystemMapGroup[]
  metadata: SystemMapMetadata
}

const EDGE_LABELS: Record<string, string> = {
  informs: 'informs',
  belongs_to: 'belongs to',
  materialized_as: 'materialized as',
  owns: 'owns',
  implements: 'implements',
  depends_on: 'depends on',
  governs: 'governs',
  provides_external_context: 'provides external context',
  uses_external_knowledge: 'uses external knowledge',
}

function emptyDimensions(): Record<SystemDimension, number> {
  return { system: 0, knowledge: 0, delivery: 0, implementation: 0, unknown: 0 }
}

function emptyProjection(name: string, structure: string): SystemMapProjection {
  return {
    system: { name },
    nodes: [],
    relationships: [],
    groups: [],
    metadata: {
      projectName: name, structure, nodeCount: 0, relationshipCount: 0, coverage: 'empty', available: false,
      dimensions: emptyDimensions(), topologyAvailable: false, topologyStatus: 'unavailable',
      semanticEntityCount: 0, technicalRelationshipCount: 0, topologyFindings: [],
    },
  }
}

/** The canonical System Map for a project — a projection of the Kaddo Graph. */
export function getSystemMapProjection(dir: string): SystemMapProjection {
  const config = loadConfig(dir)
  if (!config) return emptyProjection('unknown', 'unknown')

  const graph = buildGraph(dir, config, { scope: 'all' })
  const hints = buildGraphHints(dir, graph)

  // relPath → { knowledge artifact id, layer } for Knowledge navigation.
  const knowledgeByPath = new Map<string, { id: string; layer: string }>()
  for (const a of discoverKnowledge(dir).filter((a) => !a.isWorkItem)) {
    const id = a.id || a.relPath.replace(/[/\\]/g, '-').replace(/\.md$/, '')
    const layer = a.layer === 'module' ? 'tech' : a.layer
    knowledgeByPath.set(a.relPath, { id, layer })
  }

  // Work Item id → affected modules, for deterministic single-module grouping.
  const wiModules = new Map<string, string[]>()
  for (const wi of discoverWorkItems(dir)) wiModules.set(wi.id || wi.title, wi.affectedModules)

  const mapped = loadMappedModules(dir)
  const groupIds = new Set<string>(['core', ...mapped.map((m) => m.id)])

  const nodes: SystemMapNode[] = graph.nodes.map((n) => toNode(n, knowledgeByPath, wiModules, groupIds))

  const relationships: SystemMapRelationship[] = graph.edges.map((e) => ({
    id: `${e.from}~${e.type}~${e.to}`,
    source: e.from,
    target: e.to,
    type: e.type,
    label: EDGE_LABELS[e.type] ?? e.type.replace(/_/g, ' '),
  }))

  // --- Declared semantic topology (VS-100.2) ---
  // Knowledge id → { id, layer } for resolving entity knowledgeRefs to navigable artifacts.
  const knowledgeById = new Map<string, { id: string; layer: string }>()
  for (const ref of knowledgeByPath.values()) knowledgeById.set(ref.id, ref)
  const topology = loadSystemTopology(dir)
  const existingIds = new Set(nodes.map((n) => n.id))
  for (const e of topology.entities) {
    const nodeId = `sys:${e.id}`
    const node: SystemMapNode = {
      id: nodeId, type: e.kind, label: e.label, dimension: 'system',
      implementationRefs: e.implementationRefs,
      knowledgeRefs: e.knowledgeRefs.map((k) => knowledgeById.get(k)).filter(Boolean) as { id: string; layer: string }[],
      evidence: e.evidence,
    }
    if (e.purpose) node.purpose = e.purpose
    if (e.moduleId) node.moduleId = e.moduleId
    if (e.provenance) node.provenance = e.provenance
    nodes.push(node)
    existingIds.add(nodeId)
    // Declared implementation artifacts become secondary nodes with an implemented-by edge.
    for (const ref of e.implementationRefs) {
      const fileId = `file:${ref}`
      if (!existingIds.has(fileId)) {
        nodes.push({ id: fileId, type: 'file', label: ref.split('/').pop() || ref, dimension: 'implementation', path: ref })
        existingIds.add(fileId)
      }
      relationships.push({ id: `${nodeId}~implemented-by~${fileId}`, source: nodeId, target: fileId, type: 'implemented-by', label: 'implemented by' })
    }
  }
  for (const r of topology.relationships) {
    relationships.push({ id: `sys:${r.from}~${r.type}~sys:${r.to}`, source: `sys:${r.from}`, target: `sys:${r.to}`, type: r.type, label: r.type.replace(/-/g, ' ') })
  }

  // Groups: mapped-module / core boundaries. Show a group when it holds a node, or when the module
  // is unavailable (so the boundary and its unavailable state remain visible — availability is not
  // the same as topology).
  const usedGroups = new Set(nodes.map((n) => n.moduleId).filter(Boolean) as string[])
  const allGroups: SystemMapGroup[] = [
    { id: 'core', label: 'core', repositoryId: 'core', available: true },
    // A mapped module is available when its repository path resolves relative to the project.
    ...mapped.map((m) => ({ id: m.id, label: m.id, repositoryId: m.id, available: m.repoPath ? exists(join(dir, m.repoPath)) : false })),
  ]
  const groups = allGroups.filter((g) => usedGroups.has(g.id) || g.available === false)

  const dimensions = emptyDimensions()
  for (const n of nodes) dimensions[n.dimension]++

  const semanticEntityCount = topology.entities.length
  const technicalRelationshipCount = relationships.filter((r) => TECHNICAL_RELATIONSHIP_TYPES.has(r.type)).length
  // Honest status: unavailable when no semantic entities; available when there are entities AND at
  // least one technical relationship among them; otherwise partial. Never a fabricated percentage.
  const topologyStatus: 'unavailable' | 'partial' | 'available' =
    semanticEntityCount === 0 ? 'unavailable'
      : topology.relationships.length > 0 ? 'available'
        : 'partial'

  return {
    system: { name: config.project.name },
    nodes,
    relationships,
    groups,
    metadata: {
      projectName: config.project.name,
      structure: config.project.structure,
      nodeCount: nodes.length,
      relationshipCount: relationships.length,
      coverage: hints.quality,
      available: nodes.length > 0,
      dimensions,
      topologyAvailable: dimensions.system > 0,
      topologyStatus,
      semanticEntityCount,
      technicalRelationshipCount,
      topologyFindings: topology.findings,
    },
  }
}

// --- Traversal (VS-100.1 → VS-101 boundary) ----------------------------------

export type SystemNodeContext = {
  node: SystemMapNode
  incoming: { relationship: SystemMapRelationship; node: SystemMapNode }[]
  outgoing: { relationship: SystemMapRelationship; node: SystemMapNode }[]
}

/**
 * Resolve a node and its immediate relationships from the projection. This is the deterministic
 * traversal surface VS-101 (Graph-Assisted Impact Analysis) builds on — no React Flow, no LLM.
 */
export function getSystemNodeContext(dir: string, nodeId: string): SystemNodeContext | null {
  const projection = getSystemMapProjection(dir)
  const byId = new Map(projection.nodes.map((n) => [n.id, n]))
  const node = byId.get(nodeId)
  if (!node) return null
  const incoming: SystemNodeContext['incoming'] = []
  const outgoing: SystemNodeContext['outgoing'] = []
  for (const r of projection.relationships) {
    if (r.target === nodeId) { const s = byId.get(r.source); if (s) incoming.push({ relationship: r, node: s }) }
    if (r.source === nodeId) { const t = byId.get(r.target); if (t) outgoing.push({ relationship: r, node: t }) }
  }
  return { node, incoming, outgoing }
}

function toNode(
  n: GraphNode,
  knowledgeByPath: Map<string, { id: string; layer: string }>,
  wiModules: Map<string, string[]>,
  groupIds: Set<string>,
): SystemMapNode {
  const node: SystemMapNode = { id: n.id, type: n.type, label: n.label, dimension: dimensionOf(n.type) }
  if (n.status) node.status = n.status
  // Graph paths are already project-relative; expose them, never anything absolute.
  if (n.path && !/^([a-zA-Z]:[\\/]|\/)/.test(n.path)) node.path = n.path

  if (n.type === 'work-item') {
    const wiId = n.id.startsWith('wi:') ? n.id.slice(3) : n.id
    node.workItemRef = wiId
    const affected = (wiModules.get(wiId) ?? []).filter((m) => groupIds.has(m))
    // Assign a module group only when it is unambiguous (exactly one known affected module).
    if (affected.length === 1) node.moduleId = affected[0]
  }

  if (n.path) {
    const ref = knowledgeByPath.get(n.path)
    if (ref) node.knowledgeRef = ref
  }

  return node
}
