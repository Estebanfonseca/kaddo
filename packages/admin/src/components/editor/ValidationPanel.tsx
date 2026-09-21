import type { ValidationResult } from '../../lib/api'
import { StatusBadge } from '../StatusBadge'

const levelMeta: Record<string, { label: string; variant: 'danger' | 'warning' | 'muted'; icon: string }> = {
  blocking: { label: 'Blocking', variant: 'danger', icon: '⚠' },
  warning: { label: 'Warning', variant: 'warning', icon: '⚠' },
  fyi: { label: 'FYI', variant: 'muted', icon: '○' },
}

/** Presents Core validation findings. Admin never invents findings or duplicates Core's rules. */
export function ValidationPanel({ result }: { result: ValidationResult }) {
  const order = ['blocking', 'warning', 'fyi']
  const sorted = [...result.findings].sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))
  const blocking = result.findings.filter((f) => f.level === 'blocking').length

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--foreground-muted)', margin: 0 }}>Validation</h3>
        {result.findings.length === 0
          ? <StatusBadge variant="success">No issues</StatusBadge>
          : blocking > 0
            ? <StatusBadge variant="danger">{blocking} blocking</StatusBadge>
            : <StatusBadge variant="warning">Review</StatusBadge>}
      </div>
      {sorted.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--foreground-muted)', margin: 0 }}>No issues. This Work Item can be marked Ready.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((f, i) => {
            const meta = levelMeta[f.level]
            return (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span aria-hidden style={{ color: meta.variant === 'danger' ? 'var(--danger)' : meta.variant === 'warning' ? 'var(--warning)' : 'var(--foreground-muted)' }}>{meta.icon}</span>
                <div>
                  <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
                  <span style={{ fontSize: 14, marginLeft: 8, color: 'var(--foreground)' }}>{f.message}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
