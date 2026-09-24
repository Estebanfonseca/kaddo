// Import preview mapping (VS-102).
//
// Pure, side-effect-free projection of an external work item into "what Kaddo would create". It NEVER
// writes. Critical rules: import always produces a DRAFT regardless of external status, and the Kaddo
// type is only set when explicitly chosen — never silently inferred from the external type.

import type { ExternalWorkItem } from './contract.js'
import { externalIdentityKey, externalDisplayKey } from './identity.js'

export type ImportPreviewSource = {
  provider: string
  integration: string
  externalId: string
  url?: string
  /** integration#externalId — the stable duplicate-detection key. */
  identityKey: string
  /** provider#externalId — a compact human label. */
  displayKey: string
}

export type ImportPreview = {
  source: ImportPreviewSource
  /** The captured intent that will seed the Draft (the external title). */
  capturedIntent: string
  description?: string
  /** Carried through for the human's decision — never auto-applied. */
  externalType?: string
  externalStatus?: string
  /** Import always lands as Draft. */
  kaddoStatus: 'draft'
  /** null means the human must choose a Kaddo Work Item type; a value means it was chosen explicitly. */
  kaddoType: string | null
  /** Always false — a preview never mutates the project. */
  writes: false
}

export function buildImportPreview(
  item: ExternalWorkItem,
  opts: { integrationId: string; type?: string },
): ImportPreview {
  return {
    source: {
      provider: item.provider,
      integration: opts.integrationId,
      externalId: item.externalId,
      url: item.url,
      identityKey: externalIdentityKey(opts.integrationId, item.externalId),
      displayKey: externalDisplayKey(item.provider, item.externalId),
    },
    capturedIntent: item.title,
    description: item.description,
    externalType: item.type,
    externalStatus: item.status,
    kaddoStatus: 'draft',
    kaddoType: opts.type ? opts.type : null,
    writes: false,
  }
}
