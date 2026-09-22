import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

function tmpDir(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'kaddo-impact-')) }
function write(dir: string, rel: string, content: string) {
  const full = path.join(dir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf-8')
}
function initProject(dir: string) {
  write(dir, '.kaddo/config.yml', ['project:', '  name: impact', '  state: pre-ai', '  structure: multirepo', 'team:', '  size: small'].join('\n'))
  write(dir, '.kaddo/modules.yml', ['modules:', '  - id: frontend', '    path: ../frontend', '    role: module'].join('\n'))
  write(dir, 'knowledge/tech/system-topology.yml', [
    'entities:',
    '  - id: registration-page', '    kind: component', '    label: Registration Page', '    module: frontend',
    '  - id: registration-api', '    kind: api', '    label: Registration API', '    module: core',
    '  - id: authentication', '    kind: service', '    label: Authentication', '    module: core',
    '  - id: customer-db', '    kind: datastore', '    label: Customer Database', '    module: core',
    'relationships:',
    '  - from: registration-page', '    to: registration-api', '    type: calls',
    '  - from: registration-api', '    to: authentication', '    type: depends-on',
    '  - from: registration-api', '    to: customer-db', '    type: writes-to',
  ].join('\n'))
}

describe('VS-101: graph traversal', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir(); initProject(dir) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('resolves neighbors with incoming and outgoing relationships', async () => {
    const core = await import('../src/core.js')
    const ctx = core.getSystemNodeContext(dir, 'sys:registration-api')!
    expect(ctx.incoming.map((i) => i.node.id)).toContain('sys:registration-page') // frontend calls it (cross-repo)
    expect(ctx.outgoing.map((o) => o.node.id)).toEqual(expect.arrayContaining(['sys:authentication', 'sys:customer-db']))
  })

  it('bounded neighborhood respects maxNodes and reports truncation', async () => {
    const core = await import('../src/core.js')
    const full = core.getSystemNeighbors(dir, 'sys:registration-api', { maxDepth: 2 })!
    expect(full.truncated).toBe(false)
    expect(full.nodes.length).toBeGreaterThan(1)
    const capped = core.getSystemNeighbors(dir, 'sys:registration-api', { maxDepth: 2, maxNodes: 1 })!
    expect(capped.nodes.length).toBe(1)
    expect(capped.truncated).toBe(true)
  })

  it('respects a relationship-type filter', async () => {
    const core = await import('../src/core.js')
    const onlyWrites = core.getSystemNeighbors(dir, 'sys:registration-api', { relationshipTypes: ['writes-to'] })!
    expect(onlyWrites.nodes.map((n) => n.id)).toEqual(['sys:customer-db'])
  })

  it('finds a directed path across components', async () => {
    const core = await import('../src/core.js')
    const paths = core.findSystemPaths(dir, 'sys:registration-page', 'sys:customer-db', { maxDepth: 4 })
    expect(paths.length).toBeGreaterThan(0)
    expect(paths[0]).toEqual(['sys:registration-page', 'sys:registration-api', 'sys:customer-db'])
  })
})

describe('VS-101: impact candidates', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir(); initProject(dir) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('produces candidates (never confirmed) with reasons and graph paths', async () => {
    const core = await import('../src/core.js')
    const res = core.getImpactCandidates(dir, ['sys:registration-api'], { maxDepth: 2 })
    expect(res.topologyStatus).toBe('available')
    const ids = res.candidates.map((c) => c.nodeId)
    // Cross-repo incoming (frontend) + downstream dependencies are all candidates.
    expect(ids).toEqual(expect.arrayContaining(['sys:registration-page', 'sys:authentication', 'sys:customer-db']))
    for (const c of res.candidates) {
      expect(c.status).toBe('candidate') // never auto-confirmed
      expect(c.reason.length).toBeGreaterThan(0)
      expect(c.provenance.source).toBe('graph-assisted')
    }
    const page = res.candidates.find((c) => c.nodeId === 'sys:registration-page')!
    expect(page.moduleId).toBe('frontend') // retains cross-repo identity
    expect(page.reason[0].relationship).toBe('calls')
  })

  it('no seed / no topology yields no candidates without crashing', async () => {
    const bare = tmpDir()
    write(bare, '.kaddo/config.yml', ['project:', '  name: bare', '  state: pre-ai', '  structure: monorepo', 'team:', '  size: small'].join('\n'))
    const core = await import('../src/core.js')
    const res = core.getImpactCandidates(bare, ['sys:nope'])
    expect(res.candidates).toEqual([])
    expect(res.topologyStatus).toBe('unavailable')
    fs.rmSync(bare, { recursive: true, force: true })
  })
})

describe('VS-101: Work Item system impact', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir(); initProject(dir) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('reads affected/reviewed system entities resolved against topology', async () => {
    const core = await import('../src/core.js')
    write(dir, 'knowledge/delivery/work-items/draft/WI-008.md', [
      '---', 'id: WI-008', 'title: Enable registration', 'type: feature', 'status: draft',
      'affected_modules: [core, frontend]',
      'affected_system_entities: [registration-page, registration-api]',
      'reviewed_system_entities:',
      '  - id: customer-db', '    status: reviewed-not-affected', '    reason: No schema change.',
      '  - id: authentication', '    status: unknown', '    reason: Ownership unclear.',
      'graph_revision: abc123',
      '---', '# Enable registration', '',
    ].join('\n'))
    const wi = core.getWorkItem(dir, 'WI-008')
    expect(wi.affectedSystemEntities.map((e) => e.id)).toEqual(['registration-page', 'registration-api'])
    expect(wi.affectedSystemEntities.find((e) => e.id === 'registration-page')?.nodeId).toBe('sys:registration-page')
    expect(wi.affectedSystemEntities.find((e) => e.id === 'registration-page')?.moduleId).toBe('frontend')
    expect(wi.reviewedSystemEntities.map((r) => r.status)).toEqual(expect.arrayContaining(['reviewed-not-affected', 'unknown']))
    expect(wi.graphRevision).toBe('abc123')
  })

  it('validation flags an unknown entity and a module inconsistency', async () => {
    const core = await import('../src/core.js')
    write(dir, 'knowledge/delivery/work-items/draft/WI-009.md', [
      '---', 'id: WI-009', 'title: X', 'type: feature', 'status: draft',
      'affected_modules: [core]',
      'affected_system_entities: [registration-page, ghost-entity]', // page is frontend (not in affected_modules); ghost unknown
      '---', '# X', '',
    ].join('\n'))
    const { findings } = core.validateWorkItem(dir, 'WI-009')
    const msgs = findings.map((f) => f.message).join(' | ')
    expect(msgs).toMatch(/"ghost-entity" does not exist in the semantic topology/)
    expect(msgs).toMatch(/belongs to module "frontend", which is not in affected_modules/)
    expect(findings.some((f) => f.level === 'blocking')).toBe(true) // unknown entity blocks
  })

  it('legacy Work Item without system impact loads with empty impact (no retroactive inference)', async () => {
    const core = await import('../src/core.js')
    write(dir, 'knowledge/delivery/work-items/completed/WI-OLD.md', ['---', 'id: WI-OLD', 'title: Legacy', 'type: feature', 'status: done', 'code: ["src/x/**"]', '---', '# Legacy', ''].join('\n'))
    const wi = core.getWorkItem(dir, 'WI-OLD')
    expect(wi.affectedSystemEntities).toEqual([])
    expect(wi.reviewedSystemEntities).toEqual([])
    expect(wi.graphRevision).toBeNull()
  })
})
