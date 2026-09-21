import type { ReleaseGateEntry } from '../lib/api'
import { StatusBadge } from './StatusBadge'
import { presentGateStatus, toneToVariant, humanize } from '../lib/presentation'

/** Release gates. A pending/blocked gate is a release condition — distinct from a scope unknown. */
export function ReleaseGates({ gates }: { gates: ReleaseGateEntry[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {gates.map((g) => {
        const presented = presentGateStatus(g.status)
        const marker = presented.tone === 'danger' ? '⚠' : '○'
        return (
          <div key={g.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span aria-hidden style={{ color: presented.tone === 'danger' ? 'var(--danger)' : 'var(--foreground-muted)' }}>{marker}</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{humanize(g.id)}</span>
            <StatusBadge variant={toneToVariant(presented.tone)}>{presented.label}</StatusBadge>
            {g.reason && <span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>{g.reason}</span>}
          </div>
        )
      })}
    </div>
  )
}
