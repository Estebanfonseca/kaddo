// Integration MCP tools (VS-102).
//
// Read-only exposure of the Integration Adapter Foundation for agents: discover integrations, check
// status, and read external work items. Reading external items never materializes a Kaddo Work Item —
// import is a mutating, human-confirmed action and is intentionally NOT exposed here. Secrets never
// appear in any output (only the names of the environment variables a credential references).

import {
  listIntegrations,
  verifyIntegration,
  listExternalWorkItems,
  getExternalWorkItem,
} from '../../cli/src/services/integrations.js'
import { IntegrationError } from '../../integrations/src/index.js'
import type { ToolResult } from './tools.js'

const ok = (data: unknown): ToolResult => ({ ok: true, data })
const fail = (message: string): ToolResult => ({ ok: false, message })

function safeError(err: unknown): ToolResult {
  if (err instanceof IntegrationError) return fail(`[${err.code}] ${err.safeMessage}`)
  return fail('The integration operation failed.')
}

export function integrationsListTool(root: string): ToolResult {
  return ok({
    integrations: listIntegrations(root).map((i) => ({
      id: i.id,
      adapter: i.adapter,
      enabled: i.enabled,
      status: i.status,
      displayName: i.displayName,
      capabilities: i.capabilities,
      // Only credential *reference* names — never values.
      credentialRefs: i.credentialRefs,
    })),
    note: 'Read-only. Reading external items never creates a Kaddo Work Item; import requires human confirmation.',
  })
}

export async function integrationsStatusTool(root: string, args: { id?: string }): Promise<ToolResult> {
  try {
    const summaries = listIntegrations(root).filter((s) => !args.id || s.id === args.id)
    const results = await Promise.all(summaries.map(async (s) => {
      if (s.status === 'disabled' || s.status === 'invalid-config') return { id: s.id, status: s.status }
      const v = await verifyIntegration(root, s.id)
      return { id: v.id, status: v.status, message: v.message, missingCredentials: v.missingCredentials }
    }))
    return ok({ statuses: results })
  } catch (err) {
    return safeError(err)
  }
}

export async function integrationsWorkItemsTool(
  root: string,
  args: { id: string; cursor?: string; pageSize?: number; status?: string; query?: string },
): Promise<ToolResult> {
  try {
    const page = await listExternalWorkItems(root, args.id, {
      cursor: args.cursor,
      pageSize: args.pageSize,
      filters: { status: args.status, query: args.query },
    })
    return ok({
      items: page.items,
      hasMore: page.hasMore,
      nextCursor: page.nextCursor ?? null,
      note: 'Read-only external items. Import them explicitly (with human confirmation) to create a Kaddo Draft.',
    })
  } catch (err) {
    return safeError(err)
  }
}

export async function integrationsWorkItemTool(root: string, args: { id: string; externalId: string }): Promise<ToolResult> {
  try {
    const item = await getExternalWorkItem(root, args.id, args.externalId)
    if (!item) return ok({ found: false })
    return ok({ found: true, item })
  } catch (err) {
    return safeError(err)
  }
}
