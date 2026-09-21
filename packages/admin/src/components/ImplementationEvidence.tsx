import type { EvidenceRepo } from '../lib/api'
import { StatusBadge } from './StatusBadge'
import { presentDeliveryStatus, toneToVariant } from '../lib/presentation'

/** Per-repository implementation evidence (VS-094). Multirepo entries are clearly distinguished. */
export function ImplementationEvidence({ repos }: { repos: EvidenceRepo[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {repos.map((r) => {
        const presented = presentDeliveryStatus(r.status)
        return (
          <div key={r.module} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span className="font-mono" style={{ fontSize: 13, fontWeight: 700 }}>{r.module}</span>
              {presented
                ? <StatusBadge variant={toneToVariant(presented.tone)}>{presented.label}</StatusBadge>
                : <StatusBadge variant="muted">{r.status}</StatusBadge>}
              <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>{r.role}</span>
            </div>

            {r.changedPaths.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: 3 }}>Changed paths</div>
                <ul className="font-mono" style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--foreground-muted)', lineHeight: 1.6 }}>
                  {r.changedPaths.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}

            {r.validations.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {r.validations.map((v, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--foreground-muted)', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span className="font-mono">{v.command}</span>
                    <span>— {v.status}</span>
                  </div>
                ))}
              </div>
            )}

            {r.migrations.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {r.migrations.map((m, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>
                    Migration <span className="font-mono">{m.id}</span> ({m.environment}) — {m.status}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
