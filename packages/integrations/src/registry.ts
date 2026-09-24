// Integration adapter registry (VS-102).
//
// Providers are resolved through the registry — never via hardcoded `switch (provider)` in CLI/Admin/
// MCP. Adding an adapter is a registration, not a code change to Core or the surfaces.

import type { IntegrationAdapter } from './contract.js'

export class DuplicateAdapterError extends Error {
  constructor(id: string) {
    super(`An integration adapter with id "${id}" is already registered.`)
    this.name = 'DuplicateAdapterError'
  }
}

export class IntegrationRegistry {
  private readonly adapters = new Map<string, IntegrationAdapter>()

  register(adapter: IntegrationAdapter): void {
    if (this.adapters.has(adapter.id)) throw new DuplicateAdapterError(adapter.id)
    this.adapters.set(adapter.id, adapter)
  }

  get(id: string): IntegrationAdapter | undefined {
    return this.adapters.get(id)
  }

  has(id: string): boolean {
    return this.adapters.has(id)
  }

  list(): IntegrationAdapter[] {
    return [...this.adapters.values()].sort((a, b) => a.id.localeCompare(b.id))
  }

  ids(): Set<string> {
    return new Set(this.adapters.keys())
  }
}
