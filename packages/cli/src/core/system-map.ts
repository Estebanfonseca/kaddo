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
import { exists, join } from '../utils/fs.js'

export type SystemMapNode = {
  id: string
  type: string
  label: string
  status?: string
  /** Project-relative path only — never absolute. */
  path?: string
  /** Navigable Work Item id (for work-item nodes). */
  workItemRef?: string
  /** Navigable Knowledge artifact reference (for knowledge/decision nodes). */
  knowledgeRef?: { id: string; layer: string }
  /** Module/repository grouping when it can be determined deterministically. */
  moduleId?: string
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

function emptyProjection(name: string, structure: string): SystemMapProjection {
  return {
    system: { name },
    nodes: [],
    relationships: [],
    groups: [],
    metadata: { projectName: name, structure, nodeCount: 0, relationshipCount: 0, coverage: 'empty', available: false },
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
    },
  }
}

function toNode(
  n: GraphNode,
  knowledgeByPath: Map<string, { id: string; layer: string }>,
  wiModules: Map<string, string[]>,
  groupIds: Set<string>,
): SystemMapNode {
  const node: SystemMapNode = { id: n.id, type: n.type, label: n.label }
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
