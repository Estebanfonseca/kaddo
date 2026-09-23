// Integration service (VS-102).
//
// The composition layer between the provider-agnostic @kaddo/integrations foundation and Kaddo Core.
// It loads integration configuration, resolves secret references at runtime only, drives adapters for
// read operations, and — on explicit human-confirmed import — materializes a canonical Draft Work Item
// through Core's existing createWorkItem (no duplicate creation logic, no Git, no secrets persisted).
//
// Adapters never write Kaddo artifacts; this service is the only place external reads cross into Core.

import matter from 'gray-matter'
import { parse as parseYaml } from 'yaml'
import { readFile, exists, join } from '../utils/fs.js'
import { createWorkItem } from '../core/work-item-write.js'
import { parseWorkItemSource } from '../core/work-item-source.js'
import { discoverWorkItems } from './knowledge-artifacts.js'
import {
  createDefaultRegistry,
  parseIntegrationsConfig,
  resolveCredentials,
  buildImportPreview,
  integrationError,
  IntegrationError,
  type IntegrationRegistry,
  type IntegrationConfig,
  type IntegrationContext,
  type IntegrationCapabilities,
  type IntegrationAdapterMetadata,
  type ConnectionResult,
  type ExternalWorkItem,
  type ExternalWorkItemPage,
  type ExternalWorkItemFilters,
  type ImportPreview,
  type IntegrationStatus,
  type IntegrationConfigFinding,
} from '../../../integrations/src/index.js'

export const INTEGRATIONS_FILE = '.kaddo/integrations.yml'
const DEFAULT_TIMEOUT_MS = 10_000

/** Shared registry with the reference adapter registered. Concrete providers register on top. */
const registry: IntegrationRegistry = createDefaultRegistry()
export function integrationRegistry(): IntegrationRegistry {
  return registry
}

export type IntegrationServiceErrorCode = 'INTEGRATION_NOT_CONFIGURED' | 'INTEGRATION_DISABLED' | 'INTEGRATION_INVALID_CONFIG' | 'ADAPTER_NOT_FOUND'
export class IntegrationServiceError extends Error {
  readonly code: IntegrationServiceErrorCode
  constructor(code: IntegrationServiceErrorCode, message: string) {
    super(message)
    this.name = 'IntegrationServiceError'
    this.code = code
  }
}

export type IntegrationSummary = {
  id: string
  adapter: string
  enabled: boolean
  status: IntegrationStatus
  displayName: string
  capabilities: IntegrationCapabilities | null
  metadata: IntegrationAdapterMetadata | null
  credentialRefs: string[]
  findings: IntegrationConfigFinding[]
}

// --- Config loading ----------------------------------------------------------

function loadRaw(dir: string): unknown {
  const abs = join(dir, INTEGRATIONS_FILE)
  if (!exists(abs)) return { integrations: [] }
  try {
    return parseYaml(readFile(abs)) ?? { integrations: [] }
  } catch {
    return { integrations: [] }
  }
}

export function loadIntegrations(dir: string): { integrations: IntegrationConfig[]; findings: IntegrationConfigFinding[] } {
  return parseIntegrationsConfig(loadRaw(dir), { adapterIds: registry.ids() })
}

/** Config-level status: never performs a network check (that is verifyIntegration's job). */
function configStatus(integration: IntegrationConfig, findings: IntegrationConfigFinding[]): IntegrationStatus {
  if (!integration.enabled) return 'disabled'
  const blocking = findings.some((f) => f.id === integration.id && f.level === 'blocking')
  if (blocking || !registry.has(integration.adapter)) return 'invalid-config'
  return 'configured'
}

export function listIntegrations(dir: string): IntegrationSummary[] {
  const { integrations, findings } = loadIntegrations(dir)
  return integrations.map((integration) => {
    const adapter = registry.get(integration.adapter)
    return {
      id: integration.id,
      adapter: integration.adapter,
      enabled: integration.enabled,
      status: configStatus(integration, findings),
      displayName: adapter?.metadata.displayName ?? integration.adapter,
      capabilities: adapter?.capabilities ?? null,
      metadata: adapter?.metadata ?? null,
      credentialRefs: Object.values(integration.credentials).map((c) => c.env),
      findings: findings.filter((f) => f.id === integration.id),
    }
  })
}

function requireIntegration(dir: string, id: string): { integration: IntegrationConfig; findings: IntegrationConfigFinding[] } {
  const { integrations, findings } = loadIntegrations(dir)
  const integration = integrations.find((i) => i.id === id)
  if (!integration) throw new IntegrationServiceError('INTEGRATION_NOT_CONFIGURED', `No integration "${id}" is configured in this project.`)
  return { integration, findings }
}

function resolveAdapter(integration: IntegrationConfig) {
  const adapter = registry.get(integration.adapter)
  if (!adapter) throw new IntegrationServiceError('ADAPTER_NOT_FOUND', `Unknown integration adapter "${integration.adapter}".`)
  return adapter
}

function buildContext(integration: IntegrationConfig, env: Record<string, string | undefined>): { context: IntegrationContext; missing: string[] } {
  const { credentials, missing } = resolveCredentials(integration, env)
  return {
    context: { integrationId: integration.id, config: integration.config, credentials, timeoutMs: integration.timeoutMs ?? DEFAULT_TIMEOUT_MS },
    missing,
  }
}

async function withTimeout<T>(op: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(integrationError('INTEGRATION_TIMEOUT')), ms) })
  try {
    return await Promise.race([op, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// --- Connection --------------------------------------------------------------

export type VerifyResult = {
  id: string
  status: IntegrationStatus
  connection: ConnectionResult | null
  missingCredentials: string[]
  message?: string
}

export async function verifyIntegration(dir: string, id: string, env: Record<string, string | undefined> = process.env): Promise<VerifyResult> {
  const { integration, findings } = requireIntegration(dir, id)
  const cfgStatus = configStatus(integration, findings)
  if (cfgStatus === 'disabled') return { id, status: 'disabled', connection: null, missingCredentials: [] }
  if (cfgStatus === 'invalid-config') return { id, status: 'invalid-config', connection: null, missingCredentials: [] }
  const adapter = resolveAdapter(integration)
  const { context, missing } = buildContext(integration, env)
  try {
    const connection = await withTimeout(adapter.verifyConnection(context), context.timeoutMs)
    return { id, status: statusOf(connection), connection, missingCredentials: missing, message: connection.message }
  } catch (err) {
    const e = err instanceof IntegrationError ? err : integrationError('INTEGRATION_PROVIDER_ERROR')
    return { id, status: e.code === 'INTEGRATION_UNAUTHORIZED' ? 'unauthorized' : 'unavailable', connection: null, missingCredentials: missing, message: e.safeMessage }
  }
}

function statusOf(connection: ConnectionResult): IntegrationStatus {
  switch (connection.status) {
    case 'available': return 'available'
    case 'unauthorized': return 'unauthorized'
    case 'unavailable': return 'unavailable'
    case 'invalid-config': return 'invalid-config'
  }
}

// --- Reading -----------------------------------------------------------------

export async function listExternalWorkItems(
  dir: string,
  id: string,
  opts: { cursor?: string; pageSize?: number; filters?: ExternalWorkItemFilters } = {},
  env: Record<string, string | undefined> = process.env,
): Promise<ExternalWorkItemPage> {
  const { integration } = requireIntegration(dir, id)
  const adapter = resolveAdapter(integration)
  if (!adapter.capabilities.workItems.list) throw integrationError('UNSUPPORTED_CAPABILITY', `Adapter "${adapter.id}" cannot list work items.`)
  const { context } = buildContext(integration, env)
  return withTimeout(adapter.listWorkItems({ context, cursor: opts.cursor, pageSize: opts.pageSize, filters: opts.filters }), context.timeoutMs)
}

export async function getExternalWorkItem(
  dir: string,
  id: string,
  externalId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<ExternalWorkItem | null> {
  const { integration } = requireIntegration(dir, id)
  const adapter = resolveAdapter(integration)
  if (!adapter.capabilities.workItems.read) throw integrationError('UNSUPPORTED_CAPABILITY', `Adapter "${adapter.id}" cannot read work items.`)
  const { context } = buildContext(integration, env)
  return withTimeout(adapter.getWorkItem({ context, externalId }), context.timeoutMs)
}

// --- Duplicate detection -----------------------------------------------------

export type LinkedWorkItem = { workItemId: string; title: string }

/** Find an existing Work Item already linked to this external identity (integration + externalId). */
export function findLinkedWorkItem(dir: string, integrationId: string, externalId: string): LinkedWorkItem | null {
  for (const art of discoverWorkItems(dir)) {
    let data: Record<string, unknown>
    try {
      data = matter(readFile(art.filePath)).data as Record<string, unknown>
    } catch {
      continue
    }
    const source = parseWorkItemSource(data)
    if (source.integration === integrationId && source.id === externalId) {
      return { workItemId: String(data.id ?? ''), title: String(data.title ?? '') }
    }
  }
  return null
}

// --- Import preview + materialization ----------------------------------------

export type ImportPreviewResult = { preview: ImportPreview; duplicate: LinkedWorkItem | null }

export async function previewImport(
  dir: string,
  id: string,
  externalId: string,
  opts: { type?: string } = {},
  env: Record<string, string | undefined> = process.env,
): Promise<ImportPreviewResult> {
  const item = await getExternalWorkItem(dir, id, externalId, env)
  if (!item) throw integrationError('INTEGRATION_NOT_FOUND', `External work item "${externalId}" was not found.`)
  const preview = buildImportPreview(item, { integrationId: id, type: opts.type })
  return { preview, duplicate: findLinkedWorkItem(dir, id, externalId) }
}

export type ImportResult = { workItemId: string; created: boolean; duplicateOf?: string; preview: ImportPreview; path?: string }

/**
 * Materialize a Draft Work Item from an external item. Requires an explicit Kaddo type (never inferred
 * from the external type) and is only ever called after human confirmation at the CLI/Admin layer.
 * Reuses Core createWorkItem; the external origin is recorded as provenance, not as the source of truth.
 */
export async function importExternalWorkItem(
  dir: string,
  id: string,
  externalId: string,
  opts: { type: string },
  env: Record<string, string | undefined> = process.env,
): Promise<ImportResult> {
  const item = await getExternalWorkItem(dir, id, externalId, env)
  if (!item) throw integrationError('INTEGRATION_NOT_FOUND', `External work item "${externalId}" was not found.`)
  const preview = buildImportPreview(item, { integrationId: id, type: opts.type })

  const existing = findLinkedWorkItem(dir, id, externalId)
  if (existing) return { workItemId: existing.workItemId, created: false, duplicateOf: existing.workItemId, preview }

  const intent = item.description ? `${item.title}\n\n${item.description}` : item.title
  const created = createWorkItem(dir, {
    intent,
    type: opts.type,
    source: {
      type: 'external',
      provider: item.provider,
      integration: id,
      id: externalId,
      url: item.url,
      imported_at: new Date().toISOString(),
    },
  })
  return { workItemId: created.id, created: true, preview, path: created.path }
}
