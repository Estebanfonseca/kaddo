import { useState } from 'react'
import { api, ApiError } from '../../lib/api'
import type { SystemMapProjection, TopologyEnrichmentHandoff } from '../../lib/api'
import { StatusBadge } from '../StatusBadge'

/**
 * Honest topology status with a compact enrichment handoff. Semantic topology is discovered
 * externally (an agent inspects the repo, proposes, a human confirms, Core applies); Admin only
 * shows the status and lets the human copy the handoff. It never runs an agent and never writes.
 * The full handoff stays collapsed so System Explorer — not the prompt — remains the focus.
 */
export function TopologyStatus({ metadata }: { metadata: SystemMapProjection['metadata'] }) {
  const [handoff, setHandoff] = useState<TopologyEnrichmentHandoff | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const status = metadata.topologyStatus
  const badge = status === 'available' ? <StatusBadge variant="success">Available</StatusBadge>
    : status === 'partial' ? <StatusBadge variant="warning">Partial</StatusBadge>
      : <StatusBadge variant="muted">Unavailable</StatusBadge>

  const load = async (): Promise<TopologyEnrichmentHandoff | null> => {
    if (handoff) return handoff
    setBusy(true); setError(null)
    try { const h = await api.getTopologyHandoff(); setHandoff(h); return h }
    catch (err) { setError(err instanceof ApiError ? err.message : 'The handoff could not be generated.'); return null }
    finally { setBusy(false) }
  }

  const copy = async () => {
    const h = await load()
    if (!h) return
    try { await navigator.clipboard?.writeText(h.text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { setExpanded(true) /* clipboard blocked — reveal so the user can copy manually */ }
  }

  const toggle = async () => {
    if (!expanded) { const h = await load(); if (h) setExpanded(true) }
    else setExpanded(false)
  }

  const message = status === 'available'
    ? `${metadata.semanticEntityCount} semantic components · ${metadata.technicalRelationshipCount} technical relationships.`
    : status === 'partial'
      ? `${metadata.semanticEntityCount} semantic components known — Kaddo knows useful topology, but the map is not assumed to be exhaustive.`
      : 'Kaddo currently knows Knowledge and Delivery relationships, but does not yet have enough semantic system metadata to describe how the software is structured.'

  const btn = { padding: '5px 12px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' } as const

  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: status === 'available' ? 'transparent' : 'color-mix(in srgb, var(--warning) 8%, transparent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--foreground-muted)' }}>System topology</span>
        {badge}
        <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>{message}</span>
        {status !== 'available' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>Recommended: <span className="font-mono">architecture-agent</span> · <span className="font-mono">graph-metadata-review</span></span>
            <button onClick={copy} disabled={busy} style={{ ...btn, border: '1px solid var(--primary)', background: 'var(--primary)', color: 'var(--primary-foreground)', opacity: busy ? 0.6 : 1 }}>
              {busy && !handoff ? 'Preparing…' : copied ? '✓ Copied' : 'Copy topology enrichment handoff'}
            </button>
            <button onClick={toggle} disabled={busy} style={{ ...btn, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)' }}>
              {expanded ? 'Hide handoff' : 'View handoff'}
            </button>
          </div>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: 'var(--danger)', margin: '8px 0 0' }}>{error}</p>}
      {expanded && handoff && (
        <pre style={{ marginTop: 10, background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-mono)', color: 'var(--foreground)', maxHeight: 240, overflowY: 'auto' }}>{handoff.text}</pre>
      )}
    </div>
  )
}
