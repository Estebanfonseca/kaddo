import { useState } from 'react'
import { FindingBadge } from './FindingBadge'
import { presentFindingsSummary } from '../lib/presentation'

type Finding = { level: string; message: string }

type Props = {
  blocking: number
  warning: number
  fyi: number
  items: Finding[]
}

export function FindingSummary({ blocking, warning, fyi, items }: Props) {
  const [expanded, setExpanded] = useState(false)
  const presentation = presentFindingsSummary(blocking, warning, fyi)

  if (presentation.total === 0) {
    return (
      <div
        role="status"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          Findings
        </span>
        <span style={{ fontSize: 13, color: 'var(--success)' }}>
          ✓ No findings
        </span>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '16px 18px',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`Findings: ${presentation.label}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          border: 'none', background: 'none', cursor: 'pointer', padding: 0,
          color: 'var(--foreground)', fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          Findings
        </span>
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          {blocking > 0 && <FindingBadge level="blocking" count={blocking} />}
          {warning > 0 && <FindingBadge level="warning" count={warning} />}
          {fyi > 0 && <FindingBadge level="fyi" count={fyi} />}
        </div>
        <span style={{ fontSize: 10, color: 'var(--foreground-muted)', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}>
          ▼
        </span>
      </button>

      {expanded && items.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
          {items.map((f, i) => (
            <div key={i} style={{ color: 'var(--foreground-muted)' }}>
              <span style={{ textTransform: 'capitalize', fontWeight: 600, color: `var(--finding-${f.level})` }}>{f.level}: </span>
              {f.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
