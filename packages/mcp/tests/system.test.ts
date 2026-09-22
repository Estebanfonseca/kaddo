import { describe, it, expect, afterEach } from 'vitest'
import { makeProject, write, config, cleanup } from './helpers.js'
import {
  systemSearchTool,
  systemNodeTool,
  systemNeighborsTool,
  systemPathsTool,
  systemImpactCandidatesTool,
} from '../src/system.js'

let root: string
afterEach(() => root && cleanup(root))

const TOPOLOGY = [
  'entities:',
  '  - id: registration-page', '    kind: component', '    label: Registration Page', '    module: frontend',
  '  - id: registration-api', '    kind: api', '    label: Registration API', '    module: core',
  '  - id: customer-db', '    kind: datastore', '    label: Customer Database', '    module: core',
  'relationships:',
  '  - from: registration-page', '    to: registration-api', '    type: calls',
  '  - from: registration-api', '    to: customer-db', '    type: writes-to',
].join('\n')

function withTopology(): string {
  const dir = makeProject()
  config(dir)
  write(dir, 'knowledge/tech/system-topology.yml', TOPOLOGY)
  return dir
}

function data(res: { ok: boolean; data?: unknown; message?: string }): any {
  expect(res.ok).toBe(true)
  return res.data
}

describe('VS-101 MCP: system graph tools', () => {
  it('search returns declared entities with a candidate note', () => {
    root = withTopology()
    const d = data(systemSearchTool(root, { query: 'registration' }))
    expect(d.count).toBeGreaterThanOrEqual(2)
    expect(d.results.map((r: any) => r.nodeId)).toEqual(expect.arrayContaining(['sys:registration-page', 'sys:registration-api']))
    expect(d.note).toMatch(/IMPACT CANDIDATES/)
  })

  it('node returns incoming and outgoing relationships', () => {
    root = withTopology()
    const d = data(systemNodeTool(root, { nodeId: 'sys:registration-api' }))
    expect(d.found).toBe(true)
    expect(d.incoming.map((e: any) => e.nodeId)).toContain('sys:registration-page')
    expect(d.outgoing.map((e: any) => e.nodeId)).toContain('sys:customer-db')
  })

  it('neighbors is bounded and reports truncation', () => {
    root = withTopology()
    const d = data(systemNeighborsTool(root, { nodeId: 'sys:registration-api', maxNodes: 1 }))
    expect(d.nodes.length).toBe(1)
    expect(d.truncated).toBe(true)
    expect(d.note).toMatch(/truncated/i)
  })

  it('paths finds a directed route', () => {
    root = withTopology()
    const d = data(systemPathsTool(root, { from: 'sys:registration-page', to: 'sys:customer-db' }))
    expect(d.count).toBeGreaterThan(0)
    expect(d.paths[0]).toEqual(['sys:registration-page', 'sys:registration-api', 'sys:customer-db'])
  })

  it('impact candidates are always candidates, never confirmed', () => {
    root = withTopology()
    const d = data(systemImpactCandidatesTool(root, { seeds: ['sys:registration-api'] }))
    expect(d.topologyStatus).toBe('available')
    expect(d.candidates.length).toBeGreaterThan(0)
    for (const c of d.candidates) {
      expect(c.status).toBe('candidate')
      expect(c.provenance.source).toBe('graph-assisted')
      expect(Array.isArray(c.reason)).toBe(true)
    }
  })

  it('degrades gracefully without a topology', () => {
    root = makeProject(); config(root)
    const d = data(systemImpactCandidatesTool(root, { seeds: ['sys:whatever'] }))
    expect(d.topologyStatus).toBe('unavailable')
    expect(d.count).toBe(0)
    expect(d.note).toMatch(/repository and Knowledge only/)
  })
})
