import dagre from '@dagrejs/dagre'
import type { Node as RFNode, Edge as RFEdge } from '@xyflow/react'
import type { SystemMapProjection, SystemMapNode, SystemDimension } from './api'

// Each dimension gets a distinct border style (not color alone) so System / Knowledge / Delivery /
// Implementation nodes are visually separable regardless of type.
export const DIMENSION_META: Record<SystemDimension, { label: string; border: string }> = {
  system: { label: 'System', border: 'solid' },
  knowledge: { label: 'Knowledge', border: 'solid' },
  delivery: { label: 'Delivery', border: 'dashed' },
  implementation: { label: 'Implementation', border: 'dotted' },
  unknown: { label: 'Unknown', border: 'solid' },
}

// Concepts rank before implementation artifacts in search.
const DIMENSION_RANK: Record<SystemDimension, number> = { system: 0, knowledge: 1, delivery: 2, unknown: 3, implementation: 4 }

// Presentation layer for the System Map. The Kaddo Graph (via the Core projection) is the model;
// this only positions and styles it for React Flow. React Flow is never the domain model.

export const NODE_W = 190
export const NODE_H = 58
const GROUP_PAD = 28
const GROUP_HEADER = 22

/** Human category + tone token for a node type. Unknown types fall back to a generic node. */
export function nodeCategory(type: string): { label: string; tone: string } {
  switch (type) {
    case 'business': case 'product': case 'tech': case 'delivery': return { label: humanizeType(type), tone: 'var(--info)' }
    case 'project': return { label: 'Project', tone: 'var(--primary)' }
    case 'work-item': return { label: 'Work Item', tone: 'var(--work-item-ready)' }
    case 'decision': return { label: 'Decision', tone: 'var(--warning)' }
    case 'capability': return { label: 'Capability', tone: 'var(--success)' }
    case 'code-glob': return { label: 'Code', tone: 'var(--foreground-muted)' }
    case 'initiative': return { label: 'Initiative', tone: 'var(--primary)' }
    case 'roadmap-candidate': return { label: 'Candidate', tone: 'var(--foreground-muted)' }
    case 'knowledge-capsule': return { label: 'External knowledge', tone: 'var(--info)' }
    default: return { label: humanizeType(type), tone: 'var(--foreground-muted)' }
  }
}

function humanizeType(type: string): string {
  return type.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export type SystemLayout = { positions: Map<string, { x: number; y: number }>; groupBoxes: Map<string, { x: number; y: number; w: number; h: number }> }

/** Deterministic top-down layout via dagre; then a bounding box per module group. */
export function layoutSystemMap(projection: SystemMapProjection): SystemLayout {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 70, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const n of projection.nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H })
  const nodeIds = new Set(projection.nodes.map((n) => n.id))
  for (const e of projection.relationships) {
    if (nodeIds.has(e.source) && nodeIds.has(e.target)) g.setEdge(e.source, e.target)
  }
  dagre.layout(g)

  const positions = new Map<string, { x: number; y: number }>()
  for (const n of projection.nodes) {
    const p = g.node(n.id)
    // dagre gives center coords; React Flow wants top-left.
    positions.set(n.id, { x: (p?.x ?? 0) - NODE_W / 2, y: (p?.y ?? 0) - NODE_H / 2 })
  }

  const groupBoxes = new Map<string, { x: number; y: number; w: number; h: number }>()
  for (const group of projection.groups) {
    const members = projection.nodes.filter((n) => n.moduleId === group.id)
    if (members.length === 0) continue
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const m of members) {
      const p = positions.get(m.id)!
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x + NODE_W); maxY = Math.max(maxY, p.y + NODE_H)
    }
    groupBoxes.set(group.id, {
      x: minX - GROUP_PAD, y: minY - GROUP_PAD - GROUP_HEADER,
      w: maxX - minX + GROUP_PAD * 2, h: maxY - minY + GROUP_PAD * 2 + GROUP_HEADER,
    })
  }

  return { positions, groupBoxes }
}

/** Group background nodes first (render behind), then data nodes. */
/** Work Item impact classification for the System Explorer overlay (VS-101). */
export type ImpactClass = 'affected' | 'reviewed' | 'unknown'

export function toReactFlowNodes(
  projection: SystemMapProjection,
  layout: SystemLayout,
  selectedId: string | null,
  impact?: Map<string, ImpactClass>,
): RFNode[] {
  const groupNodes: RFNode[] = projection.groups
    .filter((grp) => layout.groupBoxes.has(grp.id))
    .map((grp) => {
      const box = layout.groupBoxes.get(grp.id)!
      return {
        id: `group:${grp.id}`,
        type: 'systemGroup',
        position: { x: box.x, y: box.y },
        data: { label: grp.label, available: grp.available },
        style: { width: box.w, height: box.h },
        selectable: false,
        draggable: false,
        zIndex: -1,
      }
    })

  const dataNodes: RFNode[] = projection.nodes.map((n) => ({
    id: n.id,
    type: 'system',
    position: layout.positions.get(n.id) ?? { x: 0, y: 0 },
    data: { node: n, selected: n.id === selectedId, impact: impact?.get(n.id) ?? null, dimmed: impact != null && !impact.has(n.id) },
    zIndex: 1,
  }))

  return [...groupNodes, ...dataNodes]
}

export function toReactFlowEdges(projection: SystemMapProjection, selectedId: string | null): RFEdge[] {
  return projection.relationships.map((r) => {
    const active = selectedId != null && (r.source === selectedId || r.target === selectedId)
    return {
      id: r.id,
      source: r.source,
      target: r.target,
      label: r.label,
      selectable: true,
      animated: active,
      data: { relationship: r },
      style: { stroke: active ? 'var(--primary)' : 'var(--border-strong)', strokeWidth: active ? 2 : 1 },
      labelStyle: { fill: 'var(--foreground-muted)', fontSize: 10 },
      labelBgStyle: { fill: 'var(--surface)' },
    }
  })
}

/** Deterministic search over label / type / module — concepts before implementation artifacts. */
export function searchNodes(nodes: SystemMapNode[], query: string): SystemMapNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return nodes
    .filter((n) =>
      n.label.toLowerCase().includes(q) ||
      n.type.toLowerCase().includes(q) ||
      (n.moduleId ?? '').toLowerCase().includes(q),
    )
    .sort((a, b) => DIMENSION_RANK[a.dimension] - DIMENSION_RANK[b.dimension])
}
