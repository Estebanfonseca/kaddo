import { useState } from 'react'
import type { ImpactEntry } from '../lib/api'
import { StatusBadge } from './StatusBadge'
import { presentCoverageStatus, isPrimaryCoverage, toneToVariant, humanize } from '../lib/presentation'

function Row({ e }: { e: ImpactEntry }) {
  const presented = presentCoverageStatus(e.status)
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 110 }}>{humanize(e.surface)}</span>
      <StatusBadge variant={toneToVariant(presented.tone)}>{presented.label}</StatusBadge>
      {(e.reason || e.question) && (
        <span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>{e.reason ?? e.question}</span>
      )}
    </div>
  )
}

/** Impact per surface. Prioritizes affected/unknown; reviewed/not-applicable behind progressive disclosure. */
export function ImpactAnalysis({ entries }: { entries: ImpactEntry[] }) {
  const [showAll, setShowAll] = useState(false)
  const primary = entries.filter((e) => isPrimaryCoverage(e.status))
  const secondary = entries.filter((e) => !isPrimaryCoverage(e.status))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {primary.map((e) => <Row key={e.surface} e={e} />)}
      {secondary.length > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: 'var(--primary)', fontFamily: 'inherit', fontSize: 13, marginTop: 2,
          }}
        >
          Show {secondary.length} reviewed / not-applicable surface{secondary.length !== 1 ? 's' : ''}
        </button>
      )}
      {showAll && secondary.map((e) => <Row key={e.surface} e={e} />)}
    </div>
  )
}
