import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { makeProject, write, config, cleanup } from './helpers.js'
import {
  integrationsListTool,
  integrationsStatusTool,
  integrationsWorkItemsTool,
  integrationsWorkItemTool,
} from '../src/integrations.js'

let root: string
afterEach(() => root && cleanup(root))

function withIntegration(simulate = 'available'): string {
  const dir = makeProject()
  config(dir)
  write(dir, '.kaddo/integrations.yml', [
    'integrations:',
    '  - id: mock-work-source',
    '    adapter: mock',
    '    enabled: true',
    '    config:',
    `      simulate: ${simulate}`,
  ].join('\n'))
  return dir
}
function data(res: { ok: boolean; data?: unknown; message?: string }): any {
  expect(res.ok).toBe(true)
  return res.data
}
function countWorkItems(dir: string): number {
  const r = path.join(dir, 'knowledge', 'delivery', 'work-items')
  if (!fs.existsSync(r)) return 0
  let n = 0
  const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.md')) n++ } }
  walk(r)
  return n
}

describe('VS-102 MCP integration tools (read-only)', () => {
  it('lists integrations with capabilities and no secret values', () => {
    root = withIntegration()
    const d = data(integrationsListTool(root))
    expect(d.integrations[0]).toMatchObject({ id: 'mock-work-source', adapter: 'mock', status: 'configured' })
    expect(JSON.stringify(d)).not.toMatch(/token|secret|password/i)
  })

  it('reports status', async () => {
    root = withIntegration()
    const d = data(await integrationsStatusTool(root, {}))
    expect(d.statuses[0]).toMatchObject({ id: 'mock-work-source', status: 'available' })
  })

  it('lists and reads external work items without mutating the project', async () => {
    root = withIntegration()
    const before = countWorkItems(root)
    const list = data(await integrationsWorkItemsTool(root, { id: 'mock-work-source', pageSize: 1 }))
    expect(list.items).toHaveLength(1)
    expect(list.hasMore).toBe(true)
    const one = data(await integrationsWorkItemTool(root, { id: 'mock-work-source', externalId: 'EXT-001' }))
    expect(one.found).toBe(true)
    expect(one.item.externalId).toBe('EXT-001')
    // Read tools never create Work Items.
    expect(countWorkItems(root)).toBe(before)
  })

  it('surfaces a normalized error without leaking provider internals', async () => {
    root = withIntegration('unauthorized')
    const res = await integrationsWorkItemsTool(root, { id: 'mock-work-source' })
    expect(res.ok).toBe(false)
    expect(res.message).toMatch(/INTEGRATION_UNAUTHORIZED/)
  })
})
