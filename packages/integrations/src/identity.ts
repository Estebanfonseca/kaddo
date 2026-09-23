// External identity (VS-102).
//
// A stable, structured identity for an external item — provider + integration + externalId — so
// duplicate detection and linking never rely on the visible title. Two representations:
//   • the *identity key* (integration + externalId) uniquely identifies an item within a project;
//   • the *display key* (provider#externalId, e.g. `github#231`) is a compact human label.

export type ExternalIdentity = { provider: string; integrationId: string; externalId: string }

/** Uniquely identifies an external item within a project: integration scopes provider + config. */
export function externalIdentityKey(integrationId: string, externalId: string): string {
  return `${integrationId}#${externalId}`
}

/** Compact human label, independent of any visible title (e.g. `github#231`). */
export function externalDisplayKey(provider: string, externalId: string): string {
  return `${provider}#${externalId}`
}

export function parseExternalIdentityKey(key: string): { integrationId: string; externalId: string } | null {
  const i = key.indexOf('#')
  if (i <= 0 || i === key.length - 1) return null
  return { integrationId: key.slice(0, i), externalId: key.slice(i + 1) }
}
