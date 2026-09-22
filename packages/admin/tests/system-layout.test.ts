import { describe, it, expect } from 'vitest'
import { layoutSystemMap } from '../src/lib/systemMap'
import type { SystemMapProjection, SystemMapNode } from '../src/lib/api'

// VS-101.1 — module boundary layout. Independent module boundaries must not overlap, and cross-module
// nodes keep their positions so the connecting edge stays drawable.

function node(id: string, moduleId: string | null): SystemMapNode {
  return { id, type: 'component', label: id, dimension: 'system', ...(moduleId ? { moduleId } : {}) } as SystemMapNode
}

function projection(): SystemMapProjection {
  const nodes: SystemMapNode[] = [
    node('sys:page', 'frontend'),
    node('sys:widget', 'frontend'),
    node('sys:api', 'core'),
    node('sys:db', 'core'),
  ]
  return {
    system: { name: 'demo' },
    nodes,
    relationships: [
      { id: 'r1', source: 'sys:page', target: 'sys:api', type: 'calls', label: 'calls' },
      { id: 'r2', source: 'sys:api', target: 'sys:db', type: 'writes-to', label: 'writes-to' },
    ],
    groups: [
      { id: 'frontend', label: 'frontend', repositoryId: 'frontend', available: true },
      { id: 'core', label: 'core', repositoryId: 'core', available: false },
    ],
    metadata: {
      projectName: 'demo', structure: 'multirepo', nodeCount: 4, relationshipCount: 2,
      coverage: 'good', available: true,
      dimensions: { system: 4, knowledge: 0, delivery: 0, implementation: 0, unknown: 0 },
      topologyAvailable: true, topologyStatus: 'available', semanticEntityCount: 4, technicalRelationshipCount: 2,
      topologyFindings: [],
    },
  }
}

const intersects = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

describe('layoutSystemMap module boundaries', () => {
  it('produces a box per module', () => {
    const { groupBoxes } = layoutSystemMap(projection())
    expect(groupBoxes.has('frontend')).toBe(true)
    expect(groupBoxes.has('core')).toBe(true)
  })

  it('independent module boundaries do not overlap', () => {
    const { groupBoxes } = layoutSystemMap(projection())
    const frontend = groupBoxes.get('frontend')!
    const core = groupBoxes.get('core')!
    expect(intersects(frontend, core)).toBe(false)
  })

  it('an unavailable module still gets its own independent boundary', () => {
    const { groupBoxes } = layoutSystemMap(projection())
    // core is available:false in the fixture — its box exists and is independent.
    expect(groupBoxes.get('core')!.w).toBeGreaterThan(0)
    expect(groupBoxes.get('core')!.h).toBeGreaterThan(0)
  })

  it('every member node stays inside its own module box (cross-module edge remains drawable)', () => {
    const { positions, groupBoxes } = layoutSystemMap(projection())
    for (const [id, moduleId] of [['sys:page', 'frontend'], ['sys:api', 'core'], ['sys:db', 'core']] as const) {
      const p = positions.get(id)!
      const box = groupBoxes.get(moduleId)!
      expect(p.x).toBeGreaterThanOrEqual(box.x)
      expect(p.x).toBeLessThanOrEqual(box.x + box.w)
      expect(p.y).toBeGreaterThanOrEqual(box.y)
      expect(p.y).toBeLessThanOrEqual(box.y + box.h)
    }
  })
})
