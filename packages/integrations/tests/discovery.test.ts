import { describe, it, expect } from 'vitest'
import {
  createMockAdapter,
  mergeFilters,
  parseIntegrationsConfig,
  serializeIntegrationsConfig,
  integrationConfigFromInput,
  type ExternalWorkItemFilters,
  type IntegrationConfig,
} from '../src/index.js'

describe('VS-104 — Filter model', () => {
  describe('mergeFilters', () => {
    it('returns empty when both are undefined', () => {
      expect(mergeFilters(undefined, undefined)).toEqual({})
    })

    it('returns base when overlay is undefined', () => {
      const base: ExternalWorkItemFilters = { statuses: ['Open'], search: 'billing' }
      expect(mergeFilters(base, undefined)).toEqual(base)
    })

    it('returns overlay when base is undefined', () => {
      const overlay: ExternalWorkItemFilters = { types: ['Bug'] }
      expect(mergeFilters(undefined, overlay)).toEqual(overlay)
    })

    it('overlay fields take precedence over base', () => {
      const base: ExternalWorkItemFilters = { statuses: ['Open'], types: ['Task'], search: 'old' }
      const overlay: ExternalWorkItemFilters = { statuses: ['Done'], search: 'new' }
      const result = mergeFilters(base, overlay)
      expect(result.statuses).toEqual(['Done'])
      expect(result.types).toEqual(['Task'])
      expect(result.search).toBe('new')
    })

    it('empty overlay arrays do not override base', () => {
      const base: ExternalWorkItemFilters = { statuses: ['Open'] }
      const overlay: ExternalWorkItemFilters = { statuses: [] }
      expect(mergeFilters(base, overlay).statuses).toEqual(['Open'])
    })
  })

  describe('Config persistence with filters', () => {
    it('round-trips filters through serialization', () => {
      const configs: IntegrationConfig[] = [{
        id: 'test', adapter: 'mock', enabled: true, config: {},
        credentials: {}, secrets: {},
        filters: { statuses: ['Open', 'In Progress'], types: ['Bug'], labels: ['critical'] },
      }]
      const serialized = serializeIntegrationsConfig(configs)
      const parsed = parseIntegrationsConfig(serialized, { adapterIds: new Set(['mock']) })
      expect(parsed.integrations[0].filters).toEqual({ statuses: ['Open', 'In Progress'], types: ['Bug'], labels: ['critical'] })
    })

    it('omits filters when empty', () => {
      const configs: IntegrationConfig[] = [{
        id: 'test', adapter: 'mock', enabled: true, config: {},
        credentials: {}, secrets: {},
      }]
      const serialized = serializeIntegrationsConfig(configs)
      expect(serialized.integrations[0]).not.toHaveProperty('filters')
    })

    it('integrationConfigFromInput preserves filters', () => {
      const config = integrationConfigFromInput({ id: 'x', adapter: 'mock', filters: { types: ['Feature'] } })
      expect(config.filters).toEqual({ types: ['Feature'] })
    })
  })
})

describe('VS-104 — Mock adapter filter capabilities', () => {
  it('declares filterCapabilities in metadata', () => {
    const adapter = createMockAdapter()
    expect(adapter.metadata.filterCapabilities).toBeDefined()
    expect(adapter.metadata.filterCapabilities!.types!.supported).toBe(true)
    expect(adapter.metadata.filterCapabilities!.statuses!.supported).toBe(true)
    expect(adapter.metadata.filterCapabilities!.labels!.supported).toBe(true)
    expect(adapter.metadata.filterCapabilities!.assignees!.supported).toBe(true)
    expect(adapter.metadata.filterCapabilities!.search!.supported).toBe(true)
    expect(adapter.metadata.filterCapabilities!.providerQuery!.supported).toBe(false)
  })

  it('has an icon in metadata', () => {
    const adapter = createMockAdapter()
    expect(adapter.metadata.icon).toBe('mock')
  })
})

describe('VS-104 — Mock adapter array-based filtering', () => {
  const ctx = { integrationId: 'test', config: {}, credentials: {}, timeoutMs: 5000 }

  it('returns all items when no filters applied', async () => {
    const adapter = createMockAdapter()
    const page = await adapter.listWorkItems({ context: ctx })
    expect(page.items.length).toBe(8)
  })

  it('filters by statuses (array)', async () => {
    const adapter = createMockAdapter()
    const page = await adapter.listWorkItems({ context: ctx, filters: { statuses: ['Open', 'Done'] } })
    expect(page.items.every((i) => ['Open', 'Done'].includes(i.status!))).toBe(true)
    expect(page.items.length).toBeGreaterThanOrEqual(2)
  })

  it('filters by types (array)', async () => {
    const adapter = createMockAdapter()
    const page = await adapter.listWorkItems({ context: ctx, filters: { types: ['Bug'] } })
    expect(page.items.every((i) => i.type === 'Bug')).toBe(true)
    expect(page.items.length).toBe(1)
  })

  it('filters by labels (array, partial match)', async () => {
    const adapter = createMockAdapter()
    const page = await adapter.listWorkItems({ context: ctx, filters: { labels: ['backend'] } })
    expect(page.items.every((i) => i.labels?.some((l) => l.toLowerCase() === 'backend'))).toBe(true)
    expect(page.items.length).toBeGreaterThanOrEqual(2)
  })

  it('filters by assignees (array)', async () => {
    const adapter = createMockAdapter()
    const page = await adapter.listWorkItems({ context: ctx, filters: { assignees: ['Alice'] } })
    expect(page.items.every((i) => i.assignees?.some((a) => a.name === 'Alice'))).toBe(true)
    expect(page.items.length).toBeGreaterThanOrEqual(2)
  })

  it('filters by search (text in title/description)', async () => {
    const adapter = createMockAdapter()
    const page = await adapter.listWorkItems({ context: ctx, filters: { search: 'billing' } })
    expect(page.items.length).toBe(1)
    expect(page.items[0].externalId).toBe('EXT-005')
  })

  it('filters by updatedAfter', async () => {
    const adapter = createMockAdapter()
    const page = await adapter.listWorkItems({ context: ctx, filters: { updatedAfter: '2026-03-01T00:00:00.000Z' } })
    expect(page.items.every((i) => i.updatedAt! >= '2026-03-01T00:00:00.000Z')).toBe(true)
    expect(page.items.length).toBeGreaterThanOrEqual(2)
  })

  it('combines multiple filters (AND)', async () => {
    const adapter = createMockAdapter()
    const page = await adapter.listWorkItems({ context: ctx, filters: { types: ['Task'], statuses: ['Done'] } })
    expect(page.items.every((i) => i.type === 'Task' && i.status === 'Done')).toBe(true)
    expect(page.items.length).toBeGreaterThanOrEqual(1)
  })

  it('case-insensitive filtering', async () => {
    const adapter = createMockAdapter()
    const page = await adapter.listWorkItems({ context: ctx, filters: { statuses: ['open'], types: ['feature'] } })
    expect(page.items.length).toBeGreaterThanOrEqual(1)
  })

  it('pagination works with filters', async () => {
    const adapter = createMockAdapter({ pageSize: 1 })
    const first = await adapter.listWorkItems({ context: ctx, pageSize: 1, filters: { statuses: ['To Do'] } })
    expect(first.items.length).toBe(1)
    expect(first.hasMore).toBe(true)
    const second = await adapter.listWorkItems({ context: ctx, pageSize: 1, cursor: first.nextCursor, filters: { statuses: ['To Do'] } })
    expect(second.items[0].externalId).not.toBe(first.items[0].externalId)
  })
})
