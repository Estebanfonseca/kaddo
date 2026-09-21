import type { CoverageEntry } from '../lib/api'
import { StatusBadge } from './StatusBadge'
import { presentCoverageStatus, toneToVariant } from '../lib/presentation'

/** Per-module evaluation status. Canonical `affected_modules` values, human-readable coverage. */
export function ModuleCoverage({ entries }: { entries: CoverageEntry[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {entries.map((e) => {
        const presented = presentCoverageStatus(e.status)
        return (
          <div key={e.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span className="font-mono" style={{ fontSize: 13, fontWeight: 600, minWidth: 90 }}>{e.id}</span>
            <StatusBadge variant={toneToVariant(presented.tone)}>{presented.label}</StatusBadge>
            {e.reason && <span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>{e.reason}</span>}
          </div>
        )
      })}
    </div>
  )
}
