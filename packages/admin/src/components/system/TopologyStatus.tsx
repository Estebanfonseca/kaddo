import { useState } from 'react'
import { api, ApiError } from '../../lib/api'
import type { SystemMapProjection } from '../../lib/api'
import { StatusBadge } from '../StatusBadge'

/**
 * Honest topology status. Semantic topology is discovered externally (an agent inspects the repo);
 * Admin only shows the status and lets the human copy an enrichment handoff. It never runs an agent.
 */
export function TopologyStatus({ metadata }: { metadata: SystemMapProjection['metadata'] }) {
  const [text, setText] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const status = metadata.topologyStatus
  const badge = status === 'available' ? <StatusBadge variant="success">Available</StatusBadge>
    : status === 'partial' ? <StatusBadge variant="warning">Partial</StatusBadge>
      : <StatusBadge variant="muted">Unavailable</StatusBadge>

  const copyHandoff = async () => {
    setBusy(true); setError(null)
    try {
      const h = await api.getTopologyHandoff()
      setText(h.text)
      try { await navigator.clipboard?.writeText(h.text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* shown below */ }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The handoff could not be generated.')
    } finally { setBusy(false) }
  }

  const message = status === 'available'
    ? `${metadata.semanticEntityCount} semantic components · ${metadata.technicalRelationshipCount} technical relationships.`
    : status === 'partial'
      ? `${metadata.semanticEntityCount} semantic components known, but coverage is incomplete.`
      : 'Kaddo currently knows Knowledge and Delivery relationships, but does not yet have enough semantic system metadata to describe how the software is structured.'

  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: status === 'available' ? 'transparent' : 'color-mix(in srgb, var(--warning) 8%, transparent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--foreground-muted)' }}>System topology</span>
        {badge}
        <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>{message}</span>
        {status !== 'available' && (
          <button onClick={copyHandoff} disabled={busy} style={{ marginLeft: 'auto', padding: '5px 12px', border: '1px solid var(--primary)', borderRadius: 'var(--radius)', background: 'var(--primary)', color: 'var(--primary-foreground)', cursor: busy ? 'default' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Preparing…' : copied ? '✓ Copied' : 'Copy topology enrichment handoff'}
          </button>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: 'var(--danger)', margin: '8px 0 0' }}>{error}</p>}
      {text && (
        <pre style={{ marginTop: 10, background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-mono)', color: 'var(--foreground)', maxHeight: 220, overflowY: 'auto' }}>{text}</pre>
      )}
    </div>
  )
}
