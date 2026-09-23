// Integration configuration + secret references (VS-102).
//
// A project declares integrations WITHOUT storing secrets. Config carries only how to FIND a
// credential (an environment-variable reference), never the credential itself. Validation is
// deterministic and distinguishes missing/invalid config from missing/invalid credentials.

/** A pointer to where a secret lives at runtime — never the secret value. */
export type SecretReference = { env: string }

export type IntegrationConfig = {
  id: string
  adapter: string
  enabled: boolean
  config: Record<string, unknown>
  /** name → secret reference (e.g. { token: { env: 'GITHUB_TOKEN' } }). Values are references only. */
  credentials: Record<string, SecretReference>
  timeoutMs?: number
}

export type IntegrationConfigFinding = { level: 'blocking' | 'warning'; id?: string; message: string }

export type IntegrationsConfigResult = {
  integrations: IntegrationConfig[]
  findings: IntegrationConfigFinding[]
}

/** A config key that ends in `_env` declares a secret reference; a literal secret value is rejected. */
const ENV_SUFFIX = '_env'
const SECRET_KEY = /(token|secret|password|key|pat|apikey|api_key)/i

function parseCredentials(raw: unknown, id: string, findings: IntegrationConfigFinding[]): Record<string, SecretReference> {
  const creds: Record<string, SecretReference> = {}
  if (raw == null) return creds
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    findings.push({ level: 'blocking', id, message: `Integration "${id}": credentials must be a mapping of secret references.` })
    return creds
  }
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key.endsWith(ENV_SUFFIX)) {
      const name = key.slice(0, -ENV_SUFFIX.length)
      if (typeof value === 'string' && value.trim()) creds[name] = { env: value.trim() }
      else findings.push({ level: 'blocking', id, message: `Integration "${id}": credential "${key}" must name an environment variable.` })
      continue
    }
    // A bare secret-looking key with an inline value is a stored secret — never allowed.
    if (SECRET_KEY.test(key) && typeof value === 'string') {
      findings.push({ level: 'blocking', id, message: `Integration "${id}": secret "${key}" must not be stored in config. Use "${key}${ENV_SUFFIX}: <ENV_VAR_NAME>".` })
      continue
    }
    if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).env === 'string') {
      creds[key] = { env: String((value as Record<string, unknown>).env) }
      continue
    }
    findings.push({ level: 'warning', id, message: `Integration "${id}": ignoring unrecognized credential entry "${key}".` })
  }
  return creds
}

/**
 * Parse and validate the raw `integrations` config against the set of known adapter ids. Unknown
 * adapters, duplicate ids and missing ids are findings, not exceptions — the caller decides.
 */
export function parseIntegrationsConfig(raw: unknown, opts: { adapterIds: Set<string> }): IntegrationsConfigResult {
  const findings: IntegrationConfigFinding[] = []
  const integrations: IntegrationConfig[] = []
  const list = raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).integrations)
    ? ((raw as Record<string, unknown>).integrations as unknown[])
    : Array.isArray(raw) ? (raw as unknown[]) : []

  const seen = new Set<string>()
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') { findings.push({ level: 'blocking', message: 'Each integration must be a mapping.' }); continue }
    const o = entry as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id.trim() : ''
    const adapter = typeof o.adapter === 'string' ? o.adapter.trim() : ''
    if (!id) { findings.push({ level: 'blocking', message: 'An integration is missing a required "id".' }); continue }
    if (seen.has(id)) { findings.push({ level: 'blocking', id, message: `Duplicate integration id "${id}".` }); continue }
    seen.add(id)
    if (!adapter) { findings.push({ level: 'blocking', id, message: `Integration "${id}" is missing a required "adapter".` }); continue }
    if (!opts.adapterIds.has(adapter)) {
      findings.push({ level: 'blocking', id, message: `Integration "${id}" references unknown adapter "${adapter}".` })
    }
    const enabled = o.enabled === undefined ? true : o.enabled === true || o.enabled === 'true'
    const config = o.config && typeof o.config === 'object' && !Array.isArray(o.config) ? (o.config as Record<string, unknown>) : {}
    const credentials = parseCredentials(o.credentials, id, findings)
    const timeoutMs = typeof o.timeout_ms === 'number' ? o.timeout_ms : typeof o.timeoutMs === 'number' ? o.timeoutMs : undefined
    integrations.push({ id, adapter, enabled, config, credentials, timeoutMs })
  }
  return { integrations, findings }
}

/**
 * Resolve secret references against a runtime environment. Returns the resolved values (used only for
 * the duration of a call) and the names of any references whose environment variable is unset.
 */
export function resolveCredentials(
  integration: IntegrationConfig,
  env: Record<string, string | undefined>,
): { credentials: Record<string, string>; missing: string[] } {
  const credentials: Record<string, string> = {}
  const missing: string[] = []
  for (const [name, ref] of Object.entries(integration.credentials)) {
    const value = env[ref.env]
    if (value && value.length > 0) credentials[name] = value
    else missing.push(ref.env)
  }
  return { credentials, missing }
}
