import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

function tmpDir(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'kaddo-tapply-')) }
function write(dir: string, rel: string, content: string) {
  const full = path.join(dir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf-8')
}
function initProject(dir: string) {
  write(dir, '.kaddo/config.yml', ['project:', '  name: tapply', '  state: pre-ai', '  structure: multirepo', 'team:', '  size: small'].join('\n'))
  write(dir, '.kaddo/modules.yml', ['modules:', '  - id: frontend', '    path: ../frontend', '    role: module'].join('\n'))
}

const PROPOSAL = [
  'entities:',
  '  - id: admin-metrics',
  '    kind: component',
  '    label: Admin Metrics',
  '    module: core',
  '    implementation_refs: [src/app/admin/page.tsx]',
  '    provenance:',
  '      origin: agent-reviewed',
  '      evidence_refs: [src/app/admin/page.tsx]',
  '  - id: supabase',
  '    kind: external-system',
  '    label: Supabase',
  'relationships:',
  '  - source: admin-metrics',
  '    target: supabase',
  '    type: reads-from',
].join('\n')

const TOPOLOGY_PATH = 'knowledge/tech/system-topology.yml'

describe('VS-100.2.1: validate proposal', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir(); initProject(dir) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('accepts a well-formed proposal (source/target + snake_case + provenance object)', async () => {
    const core = await import('../src/core.js')
    const v = core.validateTopologyProposal(dir, PROPOSAL)
    expect(v.canApply).toBe(true)
    expect(v.blocking).toBe(0)
    expect(v.entityCount).toBe(2)
    expect(v.relationshipCount).toBe(1)
  })

  it('flags duplicate ids, dangling endpoints, invalid types and unsafe paths as blocking/warnings', async () => {
    const core = await import('../src/core.js')
    const v = core.validateTopologyProposal(dir, [
      'entities:',
      '  - id: a', '    kind: component', '    label: A', '    implementation: ["/abs/x.ts"]',
      '  - id: a', '    kind: service', '    label: A2',
      'relationships:',
      '  - from: a', '    to: ghost', '    type: calls',
    ].join('\n'))
    expect(v.canApply).toBe(false)
    expect(v.blocking).toBeGreaterThan(0)
    const msgs = v.findings.map((f) => f.message).join(' | ')
    expect(msgs).toMatch(/Duplicate topology entity id "a"/)
    expect(msgs).toMatch(/unknown entity endpoint/)
    expect(msgs).toMatch(/not a safe relative path/)
  })
})

describe('VS-100.2.1: apply proposal', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir(); initProject(dir) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('applies a valid proposal atomically and makes topology available', async () => {
    const core = await import('../src/core.js')
    const res = core.applyTopologyProposal(dir, PROPOSAL)
    expect(res.entitiesNew).toBe(2)
    expect(res.relationshipsNew).toBe(1)
    expect(fs.existsSync(path.join(dir, TOPOLOGY_PATH))).toBe(true)
    const map = core.getSystemMapProjection(dir)
    expect(map.metadata.topologyStatus).toBe('available')
    expect(map.nodes.some((n) => n.id === 'sys:admin-metrics')).toBe(true)
  })

  it('refuses to apply a proposal with blocking findings (no write)', async () => {
    const core = await import('../src/core.js')
    expect(() => core.applyTopologyProposal(dir, ['entities:', '  - id: a', '    kind: component', '    label: A', 'relationships:', '  - from: a', '    to: ghost', '    type: calls'].join('\n')))
      .toThrow(core.TopologyWriteError)
    expect(fs.existsSync(path.join(dir, TOPOLOGY_PATH))).toBe(false)
  })

  it('merges additively — existing entities/relationships are preserved', async () => {
    const core = await import('../src/core.js')
    core.applyTopologyProposal(dir, PROPOSAL)
    const rev = core.topologyRevision(dir)
    const second = ['entities:', '  - id: registration-api', '    kind: api', '    label: Registration API', '    module: core'].join('\n')
    const res = core.applyTopologyProposal(dir, second, rev)
    expect(res.entitiesNew).toBe(1)
    const t = core.loadSystemTopology(dir)
    // Original entities survive the second apply.
    expect(t.entities.map((e) => e.id).sort()).toEqual(['admin-metrics', 'registration-api', 'supabase'])
    expect(t.relationships.length).toBe(1) // the original reads-from is preserved
  })

  it('rejects a stale proposal (conflict) without overwriting', async () => {
    const core = await import('../src/core.js')
    core.applyTopologyProposal(dir, PROPOSAL) // establishes revision B
    const staleRevision = 'revision-A-that-is-no-longer-current'
    const before = fs.readFileSync(path.join(dir, TOPOLOGY_PATH), 'utf-8')
    try {
      core.applyTopologyProposal(dir, ['entities:', '  - id: x', '    kind: component', '    label: X'].join('\n'), staleRevision)
      throw new Error('should have thrown')
    } catch (err) {
      expect((err as { code?: string }).code).toBe('TOPOLOGY_CONFLICT')
    }
    // The canonical artifact is unchanged.
    expect(fs.readFileSync(path.join(dir, TOPOLOGY_PATH), 'utf-8')).toBe(before)
  })

  it('applying topology does not touch delivery/knowledge artifacts', async () => {
    const core = await import('../src/core.js')
    write(dir, 'knowledge/delivery/work-items/ready/WI-007.md', ['---', 'id: WI-007', 'title: X', 'type: feature', 'status: ready', '---', '# X', ''].join('\n'))
    core.applyTopologyProposal(dir, PROPOSAL)
    // The Work Item artifact is untouched and still discovered.
    expect(fs.existsSync(path.join(dir, 'knowledge/delivery/work-items/ready/WI-007.md'))).toBe(true)
    expect(core.getWorkItems(dir).items.some((i) => i.id === 'WI-007')).toBe(true)
  })
})

describe('VS-100.2.1: handoff is proposal-first', () => {
  it('instructs the agent to build a proposal and validate before writing', async () => {
    const dir = tmpDir(); initProject(dir)
    const core = await import('../src/core.js')
    const h = core.buildTopologyEnrichmentHandoff(dir, 'tapply')
    expect(h.text).toContain('Build a topology PROPOSAL first')
    expect(h.text).toContain('Validate the proposal through Kaddo before applying')
    expect(h.text).toContain('the human explicitly confirms')
    fs.rmSync(dir, { recursive: true, force: true })
  })
})
