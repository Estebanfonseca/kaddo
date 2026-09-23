// Reference / mock integration adapter (VS-102).
//
// A deterministic, offline adapter that exercises the entire contract — registry, connection,
// listing, pagination, read, normalization, error simulation — with no network or credentials. It is
// the reference implementation a custom adapter can be checked against, and the fixture for tests.

import type {
  IntegrationAdapter,
  IntegrationContext,
  ConnectionResult,
  ExternalWorkItem,
  ExternalWorkItemPage,
  ListExternalWorkItemsRequest,
  GetExternalWorkItemRequest,
} from './contract.js'
import { integrationError } from './errors.js'

export type MockSimulation = 'available' | 'unauthorized' | 'rate-limited' | 'unavailable' | 'timeout'

export const MOCK_ADAPTER_ID = 'mock'

const DEFAULT_ITEMS: ExternalWorkItem[] = [
  {
    externalId: 'EXT-001',
    provider: MOCK_ADAPTER_ID,
    title: 'Open public registration to everyone',
    description: 'Open self-service registration to the public once the private beta ends.',
    type: 'Feature',
    status: 'Open',
    url: 'https://example.test/mock/EXT-001',
    labels: ['registration', 'beta'],
    createdAt: '2026-01-05T10:00:00.000Z',
    updatedAt: '2026-02-01T09:30:00.000Z',
    rawMetadata: { board: 'delivery' },
  },
  {
    externalId: 'EXT-002',
    provider: MOCK_ADAPTER_ID,
    title: 'Personalize onboarding steps',
    description: 'The onboarding checklist should adapt to what the user has already completed.',
    type: 'Task',
    status: 'To Do',
    url: 'https://example.test/mock/EXT-002',
    labels: ['onboarding'],
    createdAt: '2026-01-08T12:00:00.000Z',
    updatedAt: '2026-01-20T15:00:00.000Z',
  },
]

function simulationOf(context: IntegrationContext, fallback: MockSimulation): MockSimulation {
  const fromConfig = context.config?.simulate
  return typeof fromConfig === 'string' ? (fromConfig as MockSimulation) : fallback
}

/** Throw the normalized error a given simulation implies for read operations (or null when available). */
function readFailure(sim: MockSimulation): void {
  switch (sim) {
    case 'unauthorized': throw integrationError('INTEGRATION_UNAUTHORIZED')
    case 'rate-limited': throw integrationError('INTEGRATION_RATE_LIMITED')
    case 'unavailable': throw integrationError('INTEGRATION_UNAVAILABLE')
    case 'timeout': throw integrationError('INTEGRATION_TIMEOUT')
    case 'available': break
  }
}

export function createMockAdapter(opts: { items?: ExternalWorkItem[]; simulate?: MockSimulation; pageSize?: number } = {}): IntegrationAdapter {
  const items = opts.items ?? DEFAULT_ITEMS
  const defaultSim = opts.simulate ?? 'available'
  const defaultPageSize = opts.pageSize ?? 50

  return {
    id: MOCK_ADAPTER_ID,
    metadata: {
      id: MOCK_ADAPTER_ID,
      displayName: 'Mock Work Source',
      version: '1.0.0',
      description: 'Deterministic offline reference adapter for validating the integration foundation.',
    },
    capabilities: {
      workItems: { list: true, read: true, import: true, write: false, statusSync: false, comments: false, webhooks: false },
    },

    async verifyConnection(context: IntegrationContext): Promise<ConnectionResult> {
      const sim = simulationOf(context, defaultSim)
      const checkedAt = new Date().toISOString()
      switch (sim) {
        case 'available': return { status: 'available', checkedAt }
        case 'unauthorized': return { status: 'unauthorized', message: 'Check the configured credentials.', checkedAt }
        case 'rate-limited':
        case 'unavailable':
        case 'timeout': return { status: 'unavailable', message: 'The mock provider is temporarily unavailable.', checkedAt }
      }
    },

    async listWorkItems(request: ListExternalWorkItemsRequest): Promise<ExternalWorkItemPage> {
      readFailure(simulationOf(request.context, defaultSim))
      let pool = items
      const f = request.filters
      if (f?.status) pool = pool.filter((i) => (i.status ?? '').toLowerCase() === f.status!.toLowerCase())
      if (f?.query) pool = pool.filter((i) => `${i.title} ${i.description ?? ''}`.toLowerCase().includes(f.query!.toLowerCase()))
      if (f?.updatedSince) pool = pool.filter((i) => (i.updatedAt ?? '') >= f.updatedSince!)

      const size = Math.max(1, request.pageSize ?? defaultPageSize)
      const start = request.cursor ? Math.max(0, Number.parseInt(request.cursor, 10) || 0) : 0
      const slice = pool.slice(start, start + size)
      const end = start + slice.length
      const hasMore = end < pool.length
      return { items: slice, hasMore, ...(hasMore ? { nextCursor: String(end) } : {}) }
    },

    async getWorkItem(request: GetExternalWorkItemRequest): Promise<ExternalWorkItem | null> {
      readFailure(simulationOf(request.context, defaultSim))
      return items.find((i) => i.externalId === request.externalId) ?? null
    },
  }
}
