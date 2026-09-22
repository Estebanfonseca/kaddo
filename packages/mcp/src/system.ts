// System Graph MCP tools (VS-101 — Graph-Assisted Impact Analysis).
//
// Read-only traversal over the Kaddo semantic system topology. These tools help a
// Kaddo-enabled agent widen what it must investigate before deciding a Work Item's scope.
// They NEVER decide scope, NEVER mutate the Work Item, NEVER run an LLM and NEVER touch git.
// Everything they surface is an IMPACT CANDIDATE the agent must still verify in the repository.
// A missing Graph edge does not mean "no impact" — traversal is bounded and coverage may be partial.

import {
  getSystemNodeContext,
  searchSystemNodes,
  getSystemNeighbors,
  findSystemPaths,
  getImpactCandidates,
} from '../../cli/src/core/system-map.js'
import type { ToolResult } from './tools.js'

const ok = (data: unknown): ToolResult => ({ ok: true, data })

const CANDIDATE_NOTE =
  'Graph-derived entities are IMPACT CANDIDATES, not confirmed scope. Inspect each in the repository ' +
  'and classify it (affected / reviewed-not-affected / unknown). A missing Graph edge does not mean no impact.'

/** Full-text-ish search over declared system entities (concepts first, then implementation). */
export function systemSearchTool(root: string, args: { query: string }): ToolResult {
  const results = searchSystemNodes(root, args.query ?? '')
  return ok({
    query: args.query ?? '',
    count: results.length,
    results: results.map((n) => ({ nodeId: n.id, label: n.label, kind: n.type, moduleId: n.moduleId ?? null, dimension: n.dimension })),
    note: CANDIDATE_NOTE,
  })
}

/** One node's declared identity plus its incoming and outgoing relationships. */
export function systemNodeTool(root: string, args: { nodeId: string }): ToolResult {
  const ctx = getSystemNodeContext(root, args.nodeId)
  if (!ctx) return ok({ nodeId: args.nodeId, found: false, note: 'No such system entity in the current topology.' })
  return ok({
    nodeId: args.nodeId,
    found: true,
    node: { nodeId: ctx.node.id, label: ctx.node.label, kind: ctx.node.type, moduleId: ctx.node.moduleId ?? null, dimension: ctx.node.dimension },
    incoming: ctx.incoming.map((e) => ({ nodeId: e.node.id, label: e.node.label, kind: e.node.type, relationship: e.relationship.type })),
    outgoing: ctx.outgoing.map((e) => ({ nodeId: e.node.id, label: e.node.label, kind: e.node.type, relationship: e.relationship.type })),
    note: CANDIDATE_NOTE,
  })
}

/** Bounded neighborhood (BFS) around a seed node. Reports truncation so the agent knows the view is partial. */
export function systemNeighborsTool(
  root: string,
  args: { nodeId: string; maxDepth?: number; maxNodes?: number; relationshipTypes?: string[]; moduleId?: string }
): ToolResult {
  const res = getSystemNeighbors(root, args.nodeId, {
    maxDepth: args.maxDepth,
    maxNodes: args.maxNodes,
    relationshipTypes: args.relationshipTypes,
    moduleFilter: args.moduleId ? [args.moduleId] : undefined,
  })
  if (!res) return ok({ nodeId: args.nodeId, found: false, note: 'No such system entity in the current topology.' })
  return ok({
    seed: res.seed,
    truncated: res.truncated,
    nodes: res.nodes.map((n) => ({ nodeId: n.id, label: n.label, kind: n.type, moduleId: n.moduleId ?? null })),
    relationships: res.relationships.map((r) => ({ from: r.source, to: r.target, type: r.type })),
    note: res.truncated
      ? `Neighborhood truncated by bounds — more entities may be reachable. ${CANDIDATE_NOTE}`
      : CANDIDATE_NOTE,
  })
}

/** Directed paths between two system entities (bounded, acyclic). */
export function systemPathsTool(root: string, args: { from: string; to: string; maxDepth?: number }): ToolResult {
  const paths = findSystemPaths(root, args.from, args.to, { maxDepth: args.maxDepth })
  return ok({ from: args.from, to: args.to, count: paths.length, paths, note: CANDIDATE_NOTE })
}

/** Impact CANDIDATES reachable from one or more seed entities. Never confirmed scope. */
export function systemImpactCandidatesTool(
  root: string,
  args: { seeds: string[]; maxDepth?: number; maxNodes?: number; relationshipTypes?: string[]; moduleId?: string }
): ToolResult {
  const res = getImpactCandidates(root, args.seeds ?? [], {
    maxDepth: args.maxDepth,
    maxNodes: args.maxNodes,
    relationshipTypes: args.relationshipTypes,
    moduleFilter: args.moduleId ? [args.moduleId] : undefined,
  })
  return ok({
    seeds: res.seeds,
    topologyStatus: res.topologyStatus,
    truncated: res.truncated,
    count: res.candidates.length,
    candidates: res.candidates.map((c) => ({
      nodeId: c.nodeId,
      label: c.label,
      kind: c.kind,
      moduleId: c.moduleId ?? null,
      status: c.status, // always 'candidate'
      reason: c.reason,
      graphPath: c.graphPath ?? null,
      provenance: c.provenance,
    })),
    note:
      res.topologyStatus === 'unavailable'
        ? 'No semantic topology available — refine impact using the repository and Knowledge only.'
        : `${CANDIDATE_NOTE}${res.truncated ? ' Traversal was bounded; some candidates may be missing.' : ''}`,
  })
}
