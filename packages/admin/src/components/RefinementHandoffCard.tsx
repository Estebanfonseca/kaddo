import { useState } from 'react'
import { api, ApiError } from '../lib/api'
import type { RefinementStatus } from '../lib/api'
import { StatusBadge } from './StatusBadge'

type Props = { workItemId: string; refinement: RefinementStatus }

/**
 * Refinement is done externally, next to the repository, by a Kaddo-enabled agent. Admin only
 * hands off: it shows how far the Work Item is refined and lets the human copy agent-agnostic
 * instructions. It never runs a model.
 */
export function RefinementHandoffCard({ workItemId, refinement }: Props) {
  const [text, setText] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const needs = refinement.status === 'needs-refinement'

  const copyHandoff = async () => {
    setBusy(true); setError(null)
    try {
      const h = await api.getRefinementHandoff(workItemId)
      setText(h.text)
      try {
        await navigator.clipboard?.writeText(h.text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch { /* clipboard blocked — the text is shown below to copy manually */ }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The handoff could not be generated.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${needs ? 'var(--warning)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--foreground-muted)', margin: 0 }}>Refinement</h3>
        {needs ? <StatusBadge variant="warning">Needs refinement</StatusBadge> : <StatusBadge variant="success">Refined</StatusBadge>}
      </div>

      <p style={{ fontSize: 14, color: 'var(--foreground)', margin: '0 0 12px', lineHeight: 1.5 }}>
        {needs
          ? 'This Work Item contains the initial intent but has not yet been refined against the project repository. Refine it with a Kaddo-enabled agent that has repository access before preparing it for implementation.'
          : 'This Work Item has been refined. Need changes? Continue refinement with a Kaddo-enabled agent that has repository access.'}
      </p>

      <div style={{ fontSize: 13, color: 'var(--foreground-muted)', marginBottom: 14 }}>
        Recommended: <span className="font-mono">work-item-agent</span> · <span className="font-mono">work-item-refinement</span> skill
      </div>

      <button
        onClick={copyHandoff}
        disabled={busy}
        style={{ padding: '8px 16px', border: '1px solid var(--primary)', borderRadius: 'var(--radius)', background: 'var(--primary)', color: 'var(--primary-foreground)', cursor: busy ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}
      >
        {busy ? 'Preparing…' : copied ? '✓ Copied' : 'Copy refinement handoff'}
      </button>

      {error && <p style={{ fontSize: 13, color: 'var(--danger)', margin: '10px 0 0' }}>{error}</p>}

      {text && (
        <pre style={{ marginTop: 14, background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }}>
          {text}
        </pre>
      )}
    </div>
  )
}
