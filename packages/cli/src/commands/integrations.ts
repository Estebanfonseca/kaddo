// kaddo integrations — Integration Adapter Foundation CLI (VS-102).
//
// Read-first surface over external work systems through the provider-agnostic integration service.
// Reads never mutate the project; import always previews and requires explicit human confirmation
// before Core creates a canonical Draft. No secrets are ever printed. No Git operations.

import { loadConfig } from '../core/config.js'
import { intro, outro, log, confirm, cancel } from '../utils/ui.js'
import {
  listIntegrations,
  verifyIntegration,
  listExternalWorkItems,
  getExternalWorkItem,
  previewImport,
  importExternalWorkItem,
  IntegrationServiceError,
} from '../services/integrations.js'
import { IntegrationError } from '../../../integrations/src/index.js'

function requireProject(dir: string): void {
  if (!loadConfig(dir)) {
    log.error('No Kaddo project was found in the current directory.')
    process.exit(1)
  }
}

function printJson(value: unknown): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(value, null, 2))
}

/** Map any thrown integration/service error to a safe message + exit code. Never leaks secrets. */
function fail(err: unknown): never {
  if (err instanceof IntegrationError) log.error(`[${err.code}] ${err.safeMessage}`)
  else if (err instanceof IntegrationServiceError) log.error(`[${err.code}] ${err.message}`)
  else log.error('The integration operation failed.')
  process.exit(1)
}

export function runIntegrationsList(dir: string, opts: { json?: boolean }): void {
  requireProject(dir)
  const items = listIntegrations(dir)
  if (opts.json) return printJson(items.map((i) => ({ id: i.id, adapter: i.adapter, enabled: i.enabled, status: i.status, capabilities: i.capabilities })))
  intro('Kaddo integrations')
  if (items.length === 0) { log.info('No integrations are configured. Add them to .kaddo/integrations.yml.'); return outro('Done.') }
  for (const i of items) {
    log.info(`${i.id} · adapter ${i.adapter} · ${i.status}${i.enabled ? '' : ' (disabled)'}`)
    if (i.capabilities) log.message(`  read: ${i.capabilities.workItems.read ? '✓' : '✗'}  list: ${i.capabilities.workItems.list ? '✓' : '✗'}  import: ${i.capabilities.workItems.import ? '✓' : '✗'}`)
    for (const f of i.findings) log.warn(`  [${f.level}] ${f.message}`)
  }
  outro('Done.')
}

export async function runIntegrationsStatus(dir: string, opts: { json?: boolean }): Promise<void> {
  requireProject(dir)
  const summaries = listIntegrations(dir)
  const results = await Promise.all(summaries.map(async (s) => {
    if (s.status === 'disabled' || s.status === 'invalid-config') return { id: s.id, status: s.status }
    try {
      const v = await verifyIntegration(dir, s.id)
      return { id: s.id, status: v.status, message: v.message, missingCredentials: v.missingCredentials }
    } catch (err) {
      return { id: s.id, status: 'unavailable' as const, message: err instanceof IntegrationError ? err.safeMessage : 'Verification failed.' }
    }
  }))
  if (opts.json) return printJson(results)
  intro('Integration status')
  for (const r of results) {
    const line = `${r.id} · ${r.status}${r.message ? ` — ${r.message}` : ''}`
    if (r.status === 'available' || r.status === 'configured') log.info(line)
    else log.warn(line)
  }
  outro('Done.')
}

export async function runIntegrationsVerify(dir: string, id: string, opts: { json?: boolean }): Promise<void> {
  requireProject(dir)
  try {
    const v = await verifyIntegration(dir, id)
    if (opts.json) return printJson({ id: v.id, status: v.status, message: v.message, missingCredentials: v.missingCredentials })
    intro(`Verify ${id}`)
    const line = `Status: ${v.status}${v.message ? ` — ${v.message}` : ''}`
    if (v.status === 'available') log.info(line)
    else log.warn(line)
    if (v.missingCredentials.length) log.warn(`Missing credentials: ${v.missingCredentials.join(', ')}`)
    outro('Done.')
  } catch (err) { fail(err) }
}

export async function runIntegrationsWorkItems(
  dir: string,
  id: string,
  opts: { json?: boolean; cursor?: string; pageSize?: string; status?: string; query?: string },
): Promise<void> {
  requireProject(dir)
  try {
    const page = await listExternalWorkItems(dir, id, {
      cursor: opts.cursor,
      pageSize: opts.pageSize ? Number.parseInt(opts.pageSize, 10) : undefined,
      filters: { status: opts.status, query: opts.query },
    })
    if (opts.json) return printJson(page)
    intro(`External work items · ${id}`)
    for (const it of page.items) log.info(`${it.externalId} · ${it.title}${it.status ? ` [${it.status}]` : ''}`)
    if (page.hasMore) log.message(`More available — next cursor: ${page.nextCursor}`)
    outro(`${page.items.length} item(s).`)
  } catch (err) { fail(err) }
}

export async function runIntegrationsWorkItem(dir: string, id: string, externalId: string, opts: { json?: boolean }): Promise<void> {
  requireProject(dir)
  try {
    const item = await getExternalWorkItem(dir, id, externalId)
    if (!item) { log.error(`External work item "${externalId}" was not found.`); process.exit(1) }
    if (opts.json) return printJson(item)
    intro(`${item.provider} · ${item.externalId}`)
    log.info(item.title)
    if (item.status) log.message(`Status: ${item.status}`)
    if (item.type) log.message(`Type: ${item.type}`)
    if (item.url) log.message(`URL: ${item.url}`)
    if (item.description) log.message(`\n${item.description}`)
    outro('Done.')
  } catch (err) { fail(err) }
}

export async function runIntegrationsImport(dir: string, id: string, externalId: string, opts: { type?: string; yes?: boolean }): Promise<void> {
  requireProject(dir)
  try {
    const { preview, duplicate } = await previewImport(dir, id, externalId, { type: opts.type })
    intro('Import external work item')
    if (duplicate) {
      log.warn(`Already imported as ${duplicate.workItemId} — "${duplicate.title}".`)
      outro('No duplicate was created.')
      return
    }
    log.info(`Source: ${preview.source.provider} · ${preview.source.externalId}`)
    log.message(`Captured intent: ${preview.capturedIntent}`)
    log.message('Will create: a Draft Work Item (needs refinement).')
    if (preview.externalType) log.message(`External type: ${preview.externalType} (Kaddo type is chosen, never inferred)`)
    log.message('No project files have been modified yet.')

    if (!opts.type) {
      log.error('A Kaddo Work Item type is required. Re-run with --type <feature|fix|chore|…>.')
      process.exit(1)
    }
    if (!opts.yes) {
      const ok = await confirm({ message: `Import ${preview.source.displayKey} as a Draft ${opts.type} Work Item?` })
      if (ok !== true) { cancel('Import cancelled. No files were changed.'); process.exit(0) }
    }
    const result = await importExternalWorkItem(dir, id, externalId, { type: opts.type })
    if (!result.created) { log.warn(`Already imported as ${result.duplicateOf}.`); outro('No duplicate was created.'); return }
    log.info(`Created ${result.workItemId} (Draft, needs refinement).`)
    outro('Done. Refine it next with the Work Item refinement handoff.')
  } catch (err) { fail(err) }
}
