import { useState } from 'react'

type Step = { id: string; label: string; status: string }

type Props = {
  completed: number
  total: number
  progressPercent: number
  steps: Step[]
}

const statusIcon: Record<string, string> = {
  done: '✓', current: '●', warning: '⚠', blocked: '✗',
  next: '○', pending: '○', optional: '○', skipped: '—',
}

const statusColor: Record<string, string> = {
  done: 'var(--success)', current: 'var(--primary)', warning: 'var(--warning)',
  blocked: 'var(--danger)', next: 'var(--foreground-muted)', pending: 'var(--foreground-muted)',
  optional: 'var(--foreground-muted)', skipped: 'var(--foreground-muted)',
}

export function ProjectRouteSummary({ completed, total, progressPercent, steps }: Props) {
  const [expanded, setExpanded] = useState(false)

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
          color: 'var(--foreground)', fontFamily: 'inherit', fontSize: 14,
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--foreground-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
          Project Route
        </span>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-muted)', overflow: 'hidden' }}>
          <div style={{
            width: `${progressPercent}%`, height: '100%', borderRadius: 3,
            background: progressPercent === 100 ? 'var(--success)' : 'var(--primary)',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ fontSize: 13, color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>
          {completed}/{total}
        </span>
        <span style={{ fontSize: 10, color: 'var(--foreground-muted)', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}>
          ▼
        </span>
      </button>

      {expanded && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 4 }}>
          {steps.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ color: statusColor[s.status] ?? 'var(--foreground-muted)', width: 16, textAlign: 'center' }}>
                {statusIcon[s.status] ?? '○'}
              </span>
              <span style={{ color: s.status === 'done' ? 'var(--foreground)' : 'var(--foreground-muted)' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
