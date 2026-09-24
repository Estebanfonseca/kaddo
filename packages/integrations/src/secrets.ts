// Secret Provider abstraction (VS-103).
//
// Secrets are runtime data, NOT versionable configuration. The YAML stores only a logical reference
// (e.g. "company-jira.token"); the actual value lives in a SecretProvider that is never committed.
// Adapters declare what secrets they need but never know WHERE they are stored.

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs'
import { dirname } from 'node:path'

/** A pluggable store for secret values. Implementations range from a local file to Vault/AWS SM. */
export interface SecretProvider {
  get(key: string): Promise<string | undefined>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

/**
 * Resolve a logical secret reference to its runtime value. Tries providers in order; the first
 * match wins. The resolved value is used only for the duration of a single operation and must
 * never be persisted, logged, or returned in any Kaddo output.
 */
export interface SecretResolver {
  resolve(reference: string): Promise<string | undefined>
}

/** Deterministic reference name for a secret scoped to an integration: `{integrationId}.{secretName}`. */
export function secretRefKey(integrationId: string, secretName: string): string {
  return `${integrationId}.${secretName}`
}

// --- Local file-based SecretProvider -----------------------------------------

const SECRETS_FILENAME = '.secrets.json'

function secretsPath(projectDir: string): string {
  return `${projectDir}/.kaddo/${SECRETS_FILENAME}`
}

function loadStore(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {}
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, string>
    return {}
  } catch {
    return {}
  }
}

function saveStore(filePath: string, store: Record<string, string>): void {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, JSON.stringify(store, null, 2) + '\n', 'utf-8')
}

/**
 * A file-based SecretProvider that stores secrets in `.kaddo/.secrets.json`. This file must NEVER be
 * committed — the caller is responsible for ensuring it is gitignored. The provider reads/writes
 * synchronously (secrets are small and infrequent) but exposes an async interface for future
 * compatibility with remote providers.
 */
export function createLocalSecretProvider(projectDir: string): SecretProvider {
  const fp = secretsPath(projectDir)

  return {
    async get(key: string): Promise<string | undefined> {
      const store = loadStore(fp)
      const val = store[key]
      return val !== undefined && val !== '' ? val : undefined
    },

    async set(key: string, value: string): Promise<void> {
      const store = loadStore(fp)
      store[key] = value
      saveStore(fp, store)
    },

    async delete(key: string): Promise<void> {
      const store = loadStore(fp)
      delete store[key]
      saveStore(fp, store)
    },

    async exists(key: string): Promise<boolean> {
      const store = loadStore(fp)
      return key in store && store[key] !== undefined && store[key] !== ''
    },
  }
}

/** Remove the entire local secrets file (used when cleaning up a project). */
export function removeLocalSecretsFile(projectDir: string): void {
  const fp = secretsPath(projectDir)
  if (existsSync(fp)) unlinkSync(fp)
}

// --- Environment-variable SecretProvider (backward-compat with VS-102) -------

/** Resolves secrets from environment variables. This is the VS-102 mechanism. */
export function createEnvSecretProvider(env: Record<string, string | undefined> = process.env): SecretProvider {
  return {
    async get(key: string): Promise<string | undefined> {
      const val = env[key]
      return val !== undefined && val !== '' ? val : undefined
    },
    async set(): Promise<void> {
      throw new Error('Environment secret provider is read-only.')
    },
    async delete(): Promise<void> {
      throw new Error('Environment secret provider is read-only.')
    },
    async exists(key: string): Promise<boolean> {
      const val = env[key]
      return val !== undefined && val !== ''
    },
  }
}

// --- Composite resolver ------------------------------------------------------

/**
 * A resolver that tries multiple providers in order. Typical chain: local secrets first, then
 * environment variables. The first provider that returns a value wins.
 */
export function createCompositeResolver(...providers: SecretProvider[]): SecretResolver {
  return {
    async resolve(reference: string): Promise<string | undefined> {
      for (const provider of providers) {
        const val = await provider.get(reference)
        if (val !== undefined) return val
      }
      return undefined
    },
  }
}
