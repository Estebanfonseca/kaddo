import { StatusBadge } from './StatusBadge'
import { presentScopeConfidence, toneToVariant } from '../lib/presentation'

type Props = { level: string | null; reasons?: string[] }

export function ScopeConfidence({ level, reasons = [] }: Props) {
  const presented = presentScopeConfidence(level)
  return (
    <div>
      <StatusBadge variant={toneToVariant(presented.tone)}>{presented.label}</StatusBadge>
      {reasons.length > 0 && (
        <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 14, color: 'var(--foreground-muted)', lineHeight: 1.6 }}>
          {reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
    </div>
  )
}
