import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'

function tmpDir(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'kaddo-integ-')) }
function write(dir: string, rel: string, content: string) {
  const full = path.join(dir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf-8')
}
function initProject(dir: string, simulate?: string) {
  write(dir, '.kaddo/config.yml', ['project:', '  name: dotear-web', '  state: pre-ai', '  structure: monorepo', 'team:', '  size: small'].join('\n'))
  write(dir, '.kaddo/integrations.yml', [
    'integrations:',
    '  - id: mock-work-source',
    '    adapter: mock',
    '    enabled: true',
    '    config:',
    `      simulate: ${simulate ?? 'available'}`,
  ].join('\n'))
}
function countWorkItems(dir: string): number {
  const root = path.join(dir, 'knowledge', 'delivery', 'work-items')
  if (!fs.existsSync(root)) return 0
  let n = 0
  const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.md')) n++ } }
  walk(root)
  return n
}

describe('VS-102 integration service — configuration', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir() })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('lists a valid configured integration with capabilities', async () => {
    initProject(dir)
    const core = await import('../src/core.js')
    const list = core.listIntegrations(dir)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: 'mock-work-source', adapter: 'mock', enabled: true, status: 'configured' })
    expect(list[0].capabilities?.workItems).toMatchObject({ read: true, list: true, import: true })
  })

  it('flags an unknown adapter as invalid-config and a disabled integration as disabled', async () => {
    write(dir, '.kaddo/config.yml', ['project:', '  name: p', '  state: pre-ai', '  structure: monorepo', 'team:', '  size: small'].join('\n'))
    write(dir, '.kaddo/integrations.yml', ['integrations:', '  - id: ghost', '    adapter: nope', '  - id: off', '    adapter: mock', '    enabled: false'].join('\n'))
    const core = await import('../src/core.js')
    const byId = Object.fromEntries(core.listIntegrations(dir).map((i) => [i.id, i]))
    expect(byId['ghost'].status).toBe('invalid-config')
    expect(byId['off'].status).toBe('disabled')
  })
})

describe('VS-102 integration service — connection', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir() })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('verifies an available integration', async () => {
    initProject(dir)
    const core = await import('../src/core.js')
    const v = await core.verifyIntegration(dir, 'mock-work-source', {})
    expect(v.status).toBe('available')
  })

  it('normalizes unauthorized and unavailable without leaking secrets', async () => {
    initProject(dir, 'unauthorized')
    const core = await import('../src/core.js')
    const v = await core.verifyIntegration(dir, 'mock-work-source', {})
    expect(v.status).toBe('unauthorized')
    expect(JSON.stringify(v)).not.toMatch(/token|secret|password/i)

    const dir2 = tmpDir(); initProject(dir2, 'unavailable')
    const v2 = await core.verifyIntegration(dir2, 'mock-work-source', {})
    expect(v2.status).toBe('unavailable')
    fs.rmSync(dir2, { recursive: true, force: true })
  })
})

describe('VS-102 integration service — reading', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir(); initProject(dir) })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('lists external items with pagination and reads one', async () => {
    const core = await import('../src/core.js')
    const first = await core.listExternalWorkItems(dir, 'mock-work-source', { pageSize: 1 }, {})
    expect(first.items).toHaveLength(1)
    expect(first.hasMore).toBe(true)
    const second = await core.listExternalWorkItems(dir, 'mock-work-source', { pageSize: 1, cursor: first.nextCursor }, {})
    expect(second.items[0].externalId).not.toBe(first.items[0].externalId)
    const item = await core.getExternalWorkItem(dir, 'mock-work-source', 'EXT-001', {})
    expect(item?.externalId).toBe('EXT-001')
  })

  it('reading does not modify project artifacts', async () => {
    const core = await import('../src/core.js')
    const before = countWorkItems(dir)
    await core.listExternalWorkItems(dir, 'mock-work-source', {}, {})
    await core.getExternalWorkItem(dir, 'mock-work-source', 'EXT-001', {})
    expect(countWorkItems(dir)).toBe(before)
  })

  it('normalizes read errors from a rate-limited provider', async () => {
    const dir2 = tmpDir(); initProject(dir2, 'rate-limited')
    const core = await import('../src/core.js')
    await expect(core.listExternalWorkItems(dir2, 'mock-work-source', {}, {})).rejects.toMatchObject({ code: 'INTEGRATION_RATE_LIMITED' })
    fs.rmSync(dir2, { recursive: true, force: true })
  })
})

describe('VS-102 integration service — import', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir(); initProject(dir) })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('preview produces a Draft mapping and writes nothing', async () => {
    const core = await import('../src/core.js')
    const before = countWorkItems(dir)
    const { preview, duplicate } = await core.previewImport(dir, 'mock-work-source', 'EXT-001', {}, {})
    expect(preview.writes).toBe(false)
    expect(preview.kaddoStatus).toBe('draft')
    expect(preview.source.provider).toBe('mock')
    expect(preview.source.externalId).toBe('EXT-001')
    expect(duplicate).toBeNull()
    expect(countWorkItems(dir)).toBe(before)
  })

  it('imports into a canonical Draft with external provenance and no Git operation', async () => {
    const core = await import('../src/core.js')
    const result = await core.importExternalWorkItem(dir, 'mock-work-source', 'EXT-001', { type: 'feature' }, {})
    expect(result.created).toBe(true)
    const wi = core.getWorkItem(dir, result.workItemId)
    expect(wi.status).toBe('draft')
    expect(wi.source.type).toBe('external')
    expect(wi.source.provider).toBe('mock')
    expect(wi.source.integration).toBe('mock-work-source')
    expect(wi.source.id).toBe('EXT-001')
    // No Git repository was created/committed by the import.
    expect(fs.existsSync(path.join(dir, '.git'))).toBe(false)
  })

  it('re-importing the same external identity returns the existing WI (no duplicate)', async () => {
    const core = await import('../src/core.js')
    const first = await core.importExternalWorkItem(dir, 'mock-work-source', 'EXT-001', { type: 'feature' }, {})
    const count = countWorkItems(dir)
    const second = await core.importExternalWorkItem(dir, 'mock-work-source', 'EXT-001', { type: 'feature' }, {})
    expect(second.created).toBe(false)
    expect(second.duplicateOf).toBe(first.workItemId)
    expect(countWorkItems(dir)).toBe(count)
    // A preview also surfaces the existing link.
    const { duplicate } = await core.previewImport(dir, 'mock-work-source', 'EXT-001', {}, {})
    expect(duplicate?.workItemId).toBe(first.workItemId)
  })

  it('the canonical Work Item survives the external provider becoming unavailable', async () => {
    const core = await import('../src/core.js')
    const result = await core.importExternalWorkItem(dir, 'mock-work-source', 'EXT-001', { type: 'feature' }, {})
    // Remove the integration configuration entirely — the external source is gone.
    fs.rmSync(path.join(dir, '.kaddo', 'integrations.yml'))
    const wi = core.getWorkItem(dir, result.workItemId)
    expect(wi.id).toBe(result.workItemId)
    expect(wi.source.type).toBe('external')
    // Refinement continues on the Kaddo Work Item regardless of external availability.
    const handoff = core.buildRefinementHandoff(dir, result.workItemId)
    expect(handoff.workItemId).toBe(result.workItemId)
  })
})
