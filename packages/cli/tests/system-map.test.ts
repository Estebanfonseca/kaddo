import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

function tmpDir(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'kaddo-sys-')) }
function write(dir: string, rel: string, content: string) {
  const full = path.join(dir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf-8')
}
function initProject(dir: string, multirepo = true) {
  write(dir, '.kaddo/config.yml', ['project:', '  name: sysdemo', '  state: pre-ai', `  structure: ${multirepo ? 'multirepo' : 'monorepo'}`, 'team:', '  size: small'].join('\n'))
  if (multirepo) write(dir, '.kaddo/modules.yml', ['modules:', '  - id: frontend', '    path: ../frontend', '    role: module'].join('\n'))
}
function fullProject(dir: string) {
  initProject(dir)
  write(dir, 'knowledge/business/business.md', ['---', 'type: business', '---', '# Business', ''].join('\n'))
  write(dir, 'knowledge/product/product.md', ['---', 'type: product', '---', '# Product', ''].join('\n'))
  write(dir, 'knowledge/tech/current-state.md', ['---', 'type: current-state', '---', '# Tech', ''].join('\n'))
  write(dir, 'knowledge/tech/decisions/ADR-004.md', ['---', 'id: ADR-004', 'type: adr', 'title: Auth strategy', 'status: accepted', 'code: ["src/auth/**"]', '---', '# ADR-004', ''].join('\n'))
  write(dir, 'knowledge/delivery/work-items/ready/WI-007.md', [
    '---', 'id: WI-007', 'title: Enable registration', 'type: feature', 'status: ready',
    'affected_modules: [frontend]', 'code: ["src/register/**"]', 'decisions: [ADR-004]',
    '---', '# Enable registration', '',
  ].join('\n'))
}

describe('VS-100: System Map projection', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir() })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('projects the Kaddo Graph into nodes and relationships', async () => {
    fullProject(dir)
    const core = await import('../src/core.js')
    const map = core.getSystemMapProjection(dir)
    expect(map.system.name).toBe('sysdemo')
    expect(map.metadata.available).toBe(true)
    expect(map.metadata.nodeCount).toBe(map.nodes.length)
    // Work Item node exists and is navigable.
    const wi = map.nodes.find((n) => n.type === 'work-item')!
    expect(wi.workItemRef).toBe('WI-007')
    // A relationship exists (e.g. the WI depends on ADR-004).
    expect(map.relationships.length).toBeGreaterThan(0)
    expect(map.relationships.every((r) => typeof r.label === 'string')).toBe(true)
  })

  it('resolves Knowledge references for knowledge/decision nodes', async () => {
    fullProject(dir)
    const core = await import('../src/core.js')
    const map = core.getSystemMapProjection(dir)
    const decision = map.nodes.find((n) => n.type === 'decision')
    expect(decision?.knowledgeRef?.id).toBe('ADR-004')
    expect(decision?.knowledgeRef?.layer).toBe('tech')
  })

  it('groups a single-module Work Item under its module and lists mapped module boundaries', async () => {
    fullProject(dir)
    const core = await import('../src/core.js')
    const map = core.getSystemMapProjection(dir)
    const wi = map.nodes.find((n) => n.workItemRef === 'WI-007')!
    expect(wi.moduleId).toBe('frontend') // exactly one affected module → grouped
    expect(map.groups.some((g) => g.id === 'frontend')).toBe(true)
  })

  it('never exposes absolute paths', async () => {
    fullProject(dir)
    const core = await import('../src/core.js')
    const map = core.getSystemMapProjection(dir)
    for (const n of map.nodes) {
      if (n.path) expect(n.path).not.toMatch(/^([a-zA-Z]:[\\/]|\/)/)
    }
    expect(JSON.stringify(map)).not.toMatch(/[A-Za-z]:\\Users|\/home\/|\/Users\//)
  })

  it('reports a controlled empty projection when there is no graph metadata', async () => {
    initProject(dir, false) // just config, no knowledge/work items
    const core = await import('../src/core.js')
    const map = core.getSystemMapProjection(dir)
    expect(map.metadata.available).toBe(false)
    expect(map.nodes).toEqual([])
    expect(map.metadata.coverage).toBe('empty')
  })

  it('does not invent nodes — count matches the underlying graph', async () => {
    fullProject(dir)
    const core = await import('../src/core.js')
    const cfg = (await import('../src/core/config.js')).loadConfig(dir)!
    const graph = (await import('../src/core/graph.js')).buildGraph(dir, cfg, { scope: 'all' })
    const map = core.getSystemMapProjection(dir)
    expect(map.nodes.length).toBe(graph.nodes.length)
    expect(map.relationships.length).toBe(graph.edges.length)
  })
})
