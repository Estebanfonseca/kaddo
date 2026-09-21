import type { CoverageEntry } from '../../lib/api'
import { inputStyle } from './primitives'

const COVERAGE_OPTIONS = [
  { value: 'none', label: 'Not evaluated' },
  { value: 'affected', label: 'Affected' },
  { value: 'reviewed-not-affected', label: 'Reviewed — not affected' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'not-applicable', label: 'Not applicable' },
]

type Props = {
  /** Module ids known to Core (includes `core`). */
  modules: string[]
  coverage: CoverageEntry[]
  onChange: (coverage: CoverageEntry[]) => void
}

/**
 * Module coverage editor. Each Core-registered module gets a coverage status; affected_modules is
 * derived from the modules marked "Affected", keeping the two consistent for the user. Core still
 * validates the final consistency.
 */
export function ModulesEditor({ modules, coverage, onChange }: Props) {
  const statusOf = (id: string) => coverage.find((c) => c.id === id)?.status ?? 'none'
  const reasonOf = (id: string) => coverage.find((c) => c.id === id)?.reason ?? ''

  const setStatus = (id: string, status: string) => {
    const next = coverage.filter((c) => c.id !== id)
    if (status !== 'none') next.push({ id, status, ...(reasonOf(id) ? { reason: reasonOf(id) } : {}) })
    onChange(next)
  }
  const setReason = (id: string, reason: string) => {
    onChange(coverage.map((c) => (c.id === id ? { ...c, reason: reason || undefined } : c)))
  }

  if (modules.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>No modules are registered for this project.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {modules.map((id) => {
        const status = statusOf(id)
        return (
          <div key={id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, background: 'var(--surface)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, minWidth: 90 }}>{id}</span>
              <select aria-label={`Coverage for ${id}`} value={status} onChange={(e) => setStatus(id, e.target.value)} style={{ ...inputStyle, width: 'auto', flex: '0 1 240px' }}>
                {COVERAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {status !== 'none' && (
              <input
                type="text"
                value={reasonOf(id)}
                placeholder="Reason (optional)"
                aria-label={`Coverage reason for ${id}`}
                onChange={(e) => setReason(id, e.target.value)}
                style={{ ...inputStyle, marginTop: 8 }}
              />
            )}
          </div>
        )
      })}
      <p style={{ fontSize: 12, color: 'var(--foreground-muted)', margin: 0 }}>
        Modules marked <strong>Affected</strong> become the Work Item's affected modules.
      </p>
    </div>
  )
}
