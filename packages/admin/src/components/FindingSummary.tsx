import { useState } from 'react'
import { FindingBadge } from './FindingBadge'

type Finding = { level: string; message: string }

type Props = {
  blocking: number
  warning: number
  fyi: number
  items: Finding[]
}

export function FindingSummary({ blocking, warning, fyi, items }: Props) {
  const [expanded, setExpanded] = useState(false)
  const total = blocking + warning + fyi
  if (total === 0) return null

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
          <FindingBadge level="blocking" count={blocking} />
          <FindingBadge level="warning" count={warning} />
          <FindingBadge level="fyi" count={fyi} />
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
