import { inputStyle } from './primitives'
import { ListEditor } from './ListEditor'

type Confidence = { level: string; reasons: string[] } | null

const LEVELS = [
  { value: 'none', label: 'Not assessed' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

/** Scope confidence editor. Admin never computes confidence — the human sets it. */
export function ScopeConfidenceEditor({ value, onChange }: { value: Confidence; onChange: (v: Confidence) => void }) {
  const level = value?.level ?? 'none'
  const reasons = value?.reasons ?? []

  const setLevel = (l: string) => {
    if (l === 'none') onChange(null)
    else onChange({ level: l, reasons })
  }
  const setReasons = (r: string[]) => {
    if (level === 'none') return
    onChange({ level, reasons: r })
  }

  return (
    <div>
      <select aria-label="Scope confidence level" value={level} onChange={(e) => setLevel(e.target.value)} style={{ ...inputStyle, width: 'auto', marginBottom: 12 }}>
        {LEVELS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {level !== 'none' && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: 6 }}>Reasons</div>
          <ListEditor items={reasons} onChange={setReasons} placeholder="e.g. Backend behavior confirmed." addLabel="+ Add reason" ariaLabel="Confidence reason" />
        </div>
      )}
    </div>
  )
}
