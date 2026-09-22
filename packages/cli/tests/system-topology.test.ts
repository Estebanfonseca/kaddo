import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

function tmpDir(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'kaddo-topo-')) }
function write(dir: string, rel: string, content: string) {
  const full = path.join(dir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf-8')
}
function initProject(dir: string) {
  write(dir, '.kaddo/config.yml', ['project:', '  name: topodemo', '  state: pre-ai', '  structure: multirepo', 'team:', '  size: small'].join('\n'))
  write(dir, '.kaddo/modules.yml', ['modules:', '  - id: frontend', '    path: ../frontend', '    role: module'].join('\n'))
  write(dir, 'knowledge/product/capabilities.md', ['---', 'id: PROD-1', 'type: capabilities', 'title: Admin Analytics', '---', '# Admin Analytics', ''].join('\n'))
}

const TOPOLOGY = [
  'entities:',
  '  - id: admin-metrics',
  '    kind: component',
  '    label: Admin Metrics',
  '    purpose: Provides administrative metrics and recent activity.',
  '    module: core',
  '    implementation:',
  '      - src/app/admin/metricas/page.tsx',
  '      - src/hooks/useAdminMetrics.ts',
  '    knowledge: [PROD-1]',
  '    provenance: agent-reviewed',
  '    evidence: [src/hooks/useAdminMetrics.ts]',
  '  - id: supabase',
  '    kind: external-system',
  '    label: Supabase',
  '  - id: registration-ui',
  '    kind: component',
  '    label: Registration UI',
  '    module: frontend',
  '  - id: registration-api',
  '    kind: api',
  '    label: Registration API',
  '    module: core',
  'relationships:',
  '  - from: admin-metrics',
  '    to: supabase',
  '    type: reads-from',
  '    evidence: [src/hooks/useAdminMetrics.ts]',
  '  - from: registration-ui',
  '    to: registration-api',
  '    type: calls',
].join('\n')

describe('VS-100.2: topology loading + validation', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir(); initProject(dir) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('loads declared entities and relationships', async () => {
    write(dir, 'knowledge/tech/system-topology.yml', TOPOLOGY)
    const core = await import('../src/core.js')
    const t = core.loadSystemTopology(dir)
    expect(t.declared).toBe(true)
    expect(t.entities.map((e) => e.id)).toEqual(expect.arrayContaining(['admin-metrics', 'supabase', 'registration-ui', 'registration-api']))
    const am = t.entities.find((e) => e.id === 'admin-metrics')!
    expect(am.kind).toBe('component')
    expect(am.moduleId).toBe('core')
    expect(am.implementationRefs).toContain('src/hooks/useAdminMetrics.ts')
    expect(am.provenance).toBe('agent-reviewed')
    expect(t.relationships.map((r) => r.type)).toEqual(expect.arrayContaining(['reads-from', 'calls']))
  })

  it('rejects duplicate ids, dangling endpoints, unknown modules and absolute paths', async () => {
    write(dir, 'knowledge/tech/system-topology.yml', [
      'entities:',
      '  - id: a', '    kind: component', '    label: A', '    module: ghost', '    implementation: ["C:/abs/path.ts"]',
      '  - id: a', '    kind: service', '    label: A2',
      'relationships:',
      '  - from: a', '    to: nope', '    type: calls',
      '  - from: a', '    to: a', '    type: not-a-type',
    ].join('\n'))
    const core = await import('../src/core.js')
    const t = core.loadSystemTopology(dir)
    const msgs = t.findings.map((f) => f.message).join(' | ')
    expect(msgs).toMatch(/Duplicate topology entity id "a"/)
    expect(msgs).toMatch(/unregistered module "ghost"/)
    expect(msgs).toMatch(/not a safe relative path/)
    expect(msgs).toMatch(/unknown entity endpoint/)
    expect(msgs).toMatch(/not recognized/)
    // Only the first (valid-shape) entity survives; the relationship to a missing endpoint is dropped.
    expect(t.entities.length).toBe(1)
    expect(t.relationships.length).toBe(0)
  })

  it('no file → topology unavailable, no findings', async () => {
    const core = await import('../src/core.js')
    const t = core.loadSystemTopology(dir)
    expect(t.declared).toBe(false)
    expect(t.entities).toEqual([])
    expect(t.findings).toEqual([])
  })
})

describe('VS-100.2: projection with semantic topology', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir(); initProject(dir); write(dir, 'knowledge/tech/system-topology.yml', TOPOLOGY) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('surfaces semantic entities as system-dimension nodes with typed relationships', async () => {
    const core = await import('../src/core.js')
    const map = core.getSystemMapProjection(dir)
    const am = map.nodes.find((n) => n.id === 'sys:admin-metrics')!
    expect(am.dimension).toBe('system')
    expect(am.type).toBe('component')
    expect(am.purpose).toContain('administrative metrics')
    expect(am.moduleId).toBe('core')
    expect(am.knowledgeRefs?.[0]?.id).toBe('PROD-1') // resolved for navigation
    // reads-from relationship and the implemented-by artifact edges are present.
    expect(map.relationships.some((r) => r.type === 'reads-from' && r.source === 'sys:admin-metrics')).toBe(true)
    expect(map.relationships.some((r) => r.type === 'implemented-by' && r.source === 'sys:admin-metrics')).toBe(true)
    expect(map.metadata.topologyAvailable).toBe(true)
    expect(map.metadata.topologyStatus).toBe('available')
    expect(map.metadata.semanticEntityCount).toBe(4)
    expect(map.metadata.technicalRelationshipCount).toBeGreaterThan(0)
  })

  it('represents a cross-module technical relationship', async () => {
    const core = await import('../src/core.js')
    const map = core.getSystemMapProjection(dir)
    const ui = map.nodes.find((n) => n.id === 'sys:registration-ui')!
    const apiNode = map.nodes.find((n) => n.id === 'sys:registration-api')!
    expect(ui.moduleId).toBe('frontend')
    expect(apiNode.moduleId).toBe('core')
    expect(map.relationships.some((r) => r.type === 'calls' && r.source === 'sys:registration-ui' && r.target === 'sys:registration-api')).toBe(true)
  })

  it('partial when entities exist but no technical relationships', async () => {
    write(dir, 'knowledge/tech/system-topology.yml', ['entities:', '  - id: solo', '    kind: component', '    label: Solo'].join('\n'))
    const core = await import('../src/core.js')
    const map = core.getSystemMapProjection(dir)
    expect(map.metadata.topologyStatus).toBe('partial')
  })

  it('preserves delivery/knowledge nodes — enrichment is additive', async () => {
    write(dir, 'knowledge/delivery/work-items/ready/WI-007.md', ['---', 'id: WI-007', 'title: X', 'type: feature', 'status: ready', 'code: ["src/x/**"]', '---', '# X', ''].join('\n'))
    const core = await import('../src/core.js')
    const map = core.getSystemMapProjection(dir)
    expect(map.nodes.some((n) => n.dimension === 'delivery')).toBe(true)
    expect(map.nodes.some((n) => n.dimension === 'system')).toBe(true)
  })

  it('exposes semantic entities and their refs through the traversal API (VS-101)', async () => {
    const core = await import('../src/core.js')
    const ctx = core.getSystemNodeContext(dir, 'sys:admin-metrics')!
    expect(ctx.node.implementationRefs?.length).toBeGreaterThan(0)
    expect(ctx.outgoing.some((o) => o.relationship.type === 'reads-from')).toBe(true)
  })
})

describe('VS-100.2: enrichment handoff', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir(); initProject(dir) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('recommends canonical assets, requests inspection, and is secret-free', async () => {
    const core = await import('../src/core.js')
    const h = core.buildTopologyEnrichmentHandoff(dir, 'topodemo')
    expect(h.recommendedAgent).toBe('architecture-agent')
    expect(h.recommendedSkill).toBe('graph-metadata-review')
    expect(h.targetFile).toBe('knowledge/tech/system-topology.yml')
    expect(h.text).toContain('Inspect the actual repository')
    expect(h.text).toContain('do not infer architecture from')
    expect(h.text).toContain('frontend') // multirepo note
    expect(h.text).toContain('Do not run mutating Git operations')
    expect(h.text).not.toMatch(/api[_-]?key|secret|token/i)
    expect(h.text).not.toMatch(/[A-Za-z]:\\Users|\/home\/|\/Users\//)
  })
})
