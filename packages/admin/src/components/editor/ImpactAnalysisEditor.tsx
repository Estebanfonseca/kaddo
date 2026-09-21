import type { ImpactEntry } from '../../lib/api'
import { inputStyle } from './primitives'

export const IMPACT_SURFACES = [
  'frontend', 'backend', 'database', 'configuration', 'feature-flags', 'content',
  'authentication', 'notifications', 'analytics', 'documentation', 'operations',
]

const STATUS_OPTIONS = [
  { value: 'none', label: 'Not evaluated' },
  { value: 'affected', label: 'Affected' },
  { value: 'reviewed-not-affected', label: 'Reviewed — not affected' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'not-applicable', label: 'Not applicable' },
]

function label(surface: string): string {
  return surface.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

type Props = { impact: ImpactEntry[]; onChange: (impact: ImpactEntry[]) => void }

/** Impact-per-surface editor. Surfaces left "Not evaluated" are omitted from the artifact. */
export function ImpactAnalysisEditor({ impact, onChange }: Props) {
  const statusOf = (s: string) => impact.find((i) => i.surface === s)?.status ?? 'none'
  const reasonOf = (s: string) => impact.find((i) => i.surface === s)?.reason ?? ''

  const setStatus = (surface: string, status: string) => {
    const next = impact.filter((i) => i.surface !== surface)
    if (status !== 'none') next.push({ surface, status, ...(reasonOf(surface) ? { reason: reasonOf(surface) } : {}) })
    onChange(next)
  }
  const setReason = (surface: string, reason: string) => {
    onChange(impact.map((i) => (i.surface === surface ? { ...i, reason: reason || undefined } : i)))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {IMPACT_SURFACES.map((surface) => {
        const status = statusOf(surface)
        return (
          <div key={surface} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 500, minWidth: 130 }}>{label(surface)}</span>
            <select aria-label={`Impact on ${label(surface)}`} value={status} onChange={(e) => setStatus(surface, e.target.value)} style={{ ...inputStyle, width: 'auto', flex: '0 1 220px' }}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {(status === 'affected' || status === 'unknown') && (
              <input type="text" value={reasonOf(surface)} placeholder="Note (optional)" aria-label={`Impact note for ${label(surface)}`} onChange={(e) => setReason(surface, e.target.value)} style={{ ...inputStyle, flex: '1 1 160px' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
