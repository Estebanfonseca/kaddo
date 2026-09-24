import { describe, it, expect } from 'vitest'
import {
  IntegrationRegistry,
  DuplicateAdapterError,
  createDefaultRegistry,
  createMockAdapter,
  MOCK_ADAPTER_ID,
  parseIntegrationsConfig,
  resolveCredentials,
  buildImportPreview,
  externalIdentityKey,
  externalDisplayKey,
  parseExternalIdentityKey,
  statusFromConnection,
  IntegrationError,
  type IntegrationContext,
  type ExternalWorkItem,
} from '../src/index.js'

function ctx(config: Record<string, unknown> = {}): IntegrationContext {
  return { integrationId: 'mock-src', config, credentials: {}, timeoutMs: 5000 }
}

describe('VS-102 registry', () => {
  it('registers, resolves and lists adapters; rejects duplicate ids', () => {
    const r = new IntegrationRegistry()
    const a = createMockAdapter()
    r.register(a)
    expect(r.get(MOCK_ADAPTER_ID)).toBe(a)
    expect(r.has(MOCK_ADAPTER_ID)).toBe(true)
    expect(r.list().map((x) => x.id)).toEqual([MOCK_ADAPTER_ID])
    expect(() => r.register(createMockAdapter())).toThrow(DuplicateAdapterError)
  })

  it('unknown adapter resolves to undefined (controlled, not a throw)', () => {
    expect(new IntegrationRegistry().get('nope')).toBeUndefined()
  })

  it('default registry ships the reference adapter', () => {
    expect(createDefaultRegistry().has(MOCK_ADAPTER_ID)).toBe(true)
  })
})

describe('VS-102 configuration', () => {
  const adapterIds = new Set([MOCK_ADAPTER_ID])
  it('accepts a valid integration and defaults enabled to true', () => {
    const { integrations, findings } = parseIntegrationsConfig(
      { integrations: [{ id: 'mock-src', adapter: 'mock', config: { dataset: 'demo' } }] },
      { adapterIds },
    )
    expect(findings).toEqual([])
    expect(integrations[0]).toMatchObject({ id: 'mock-src', adapter: 'mock', enabled: true })
  })

  it('rejects unknown adapter and duplicate ids', () => {
    const { findings } = parseIntegrationsConfig(
      { integrations: [{ id: 'a', adapter: 'ghost' }, { id: 'a', adapter: 'mock' }] },
      { adapterIds },
    )
    const msgs = findings.map((f) => f.message).join(' | ')
    expect(msgs).toMatch(/unknown adapter "ghost"/)
    expect(msgs).toMatch(/Duplicate integration id "a"/)
  })

  it('respects disabled integrations', () => {
    const { integrations } = parseIntegrationsConfig(
      { integrations: [{ id: 'x', adapter: 'mock', enabled: false }] },
      { adapterIds },
    )
    expect(integrations[0].enabled).toBe(false)
  })
})

describe('VS-102 secrets', () => {
  const adapterIds = new Set([MOCK_ADAPTER_ID])
  it('parses secret references and resolves them at runtime only', () => {
    const { integrations, findings } = parseIntegrationsConfig(
      { integrations: [{ id: 'gh', adapter: 'mock', credentials: { token_env: 'GH_TOKEN' } }] },
      { adapterIds },
    )
    expect(findings).toEqual([])
    expect(integrations[0].credentials).toEqual({ token: { env: 'GH_TOKEN' } })
    const resolved = resolveCredentials(integrations[0], { GH_TOKEN: 'sekret' })
    expect(resolved.credentials).toEqual({ token: 'sekret' })
    expect(resolved.missing).toEqual([])
  })

  it('rejects an inline stored secret', () => {
    const { findings } = parseIntegrationsConfig(
      { integrations: [{ id: 'gh', adapter: 'mock', credentials: { token: 'ghp_leaked' } }] },
      { adapterIds },
    )
    expect(findings.some((f) => f.level === 'blocking' && /must not be stored/.test(f.message))).toBe(true)
  })

  it('reports missing environment variables without exposing values', () => {
    const { integrations } = parseIntegrationsConfig(
      { integrations: [{ id: 'gh', adapter: 'mock', credentials: { token_env: 'GH_TOKEN' } }] },
      { adapterIds },
    )
    const resolved = resolveCredentials(integrations[0], {})
    expect(resolved.credentials).toEqual({})
    expect(resolved.missing).toEqual(['GH_TOKEN'])
  })

  it('never serializes a resolved secret onto the config object', () => {
    const { integrations } = parseIntegrationsConfig(
      { integrations: [{ id: 'gh', adapter: 'mock', credentials: { token_env: 'GH_TOKEN' } }] },
      { adapterIds },
    )
    resolveCredentials(integrations[0], { GH_TOKEN: 'sekret' })
    expect(JSON.stringify(integrations[0])).not.toContain('sekret')
  })
})

describe('VS-102 external identity', () => {
  it('builds and parses a stable identity key independent of the title', () => {
    expect(externalIdentityKey('mock-src', 'EXT-001')).toBe('mock-src#EXT-001')
    expect(externalDisplayKey('github', '231')).toBe('github#231')
    expect(parseExternalIdentityKey('mock-src#EXT-001')).toEqual({ integrationId: 'mock-src', externalId: 'EXT-001' })
    expect(parseExternalIdentityKey('bad')).toBeNull()
  })
})

describe('VS-102 mock adapter — connection, reading, pagination, errors', () => {
  it('verifies available and normalizes simulated failures', async () => {
    const a = createMockAdapter()
    expect((await a.verifyConnection(ctx())).status).toBe('available')
    expect((await a.verifyConnection(ctx({ simulate: 'unauthorized' }))).status).toBe('unauthorized')
    expect((await a.verifyConnection(ctx({ simulate: 'unavailable' }))).status).toBe('unavailable')
    const res = await a.verifyConnection(ctx({ simulate: 'unauthorized' }))
    expect(res.message ?? '').not.toMatch(/token|secret|password/i)
  })

  it('lists, reads and paginates', async () => {
    const a = createMockAdapter()
    const first = await a.listWorkItems({ context: ctx(), pageSize: 1 })
    expect(first.items).toHaveLength(1)
    expect(first.hasMore).toBe(true)
    expect(first.nextCursor).toBeDefined()
    const second = await a.listWorkItems({ context: ctx(), pageSize: 1, cursor: first.nextCursor })
    expect(second.items[0].externalId).not.toBe(first.items[0].externalId)
    expect(second.items).toHaveLength(1)
    const item = await a.getWorkItem({ context: ctx(), externalId: 'EXT-001' })
    expect(item?.title).toMatch(/registration/i)
    expect(await a.getWorkItem({ context: ctx(), externalId: 'nope' })).toBeNull()
  })

  it('an empty result set yields an empty, terminal page', async () => {
    const a = createMockAdapter({ items: [] })
    const page = await a.listWorkItems({ context: ctx() })
    expect(page.items).toEqual([])
    expect(page.hasMore).toBe(false)
    expect(page.nextCursor).toBeUndefined()
  })

  it('surfaces normalized errors (rate limit / timeout) for reads', async () => {
    const a = createMockAdapter({ simulate: 'rate-limited' })
    await expect(a.listWorkItems({ context: ctx() })).rejects.toMatchObject({ code: 'INTEGRATION_RATE_LIMITED', retryable: true })
    const t = createMockAdapter({ simulate: 'timeout' })
    await expect(t.getWorkItem({ context: ctx(), externalId: 'EXT-001' })).rejects.toBeInstanceOf(IntegrationError)
  })
})

describe('VS-102 normalization + preview', () => {
  const item: ExternalWorkItem = {
    externalId: 'EXT-001', provider: 'mock', title: 'Enable regular registration after beta',
    description: 'Open self-service registration.', type: 'Feature', status: 'Open',
    url: 'https://example.test/EXT-001', rawMetadata: { board: 'delivery' },
  }

  it('preview preserves provider identity and produces a Draft mapping without writing', () => {
    const p = buildImportPreview(item, { integrationId: 'mock-src' })
    expect(p.writes).toBe(false)
    expect(p.kaddoStatus).toBe('draft')
    expect(p.kaddoType).toBeNull() // never silently inferred from external type
    expect(p.capturedIntent).toBe(item.title)
    expect(p.source.identityKey).toBe('mock-src#EXT-001')
    expect(p.externalType).toBe('Feature')
  })

  it('carries an explicitly chosen Kaddo type through the preview', () => {
    expect(buildImportPreview(item, { integrationId: 'mock-src', type: 'feature' }).kaddoType).toBe('feature')
  })

  it('maps connection status onto the integration status axis', () => {
    expect(statusFromConnection('available')).toBe('available')
    expect(statusFromConnection('unauthorized')).toBe('unauthorized')
  })
})
