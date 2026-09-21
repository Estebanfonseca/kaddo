import { DeliveryStatus } from './DeliveryStatus'

type Props = {
  implementationStatus: string | null
  validationStatus: string | null
  releaseStatus: string | null
}

function Cell({ label, status }: { label: string; status: string | null }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--foreground-muted)', marginBottom: 6 }}>{label}</div>
      <DeliveryStatus status={status} fallback="Not assessed" />
    </div>
  )
}

/**
 * Implementation / Validation / Release as three independent delivery dimensions.
 * A blocked release never collapses a completed Work Item into "blocked" — the lifecycle
 * status is shown separately in the header.
 */
export function DeliveryStatusSummary({ implementationStatus, validationStatus, releaseStatus }: Props) {
  return (
    <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
      <Cell label="Implementation" status={implementationStatus} />
      <Cell label="Validation" status={validationStatus} />
      <Cell label="Release" status={releaseStatus} />
    </div>
  )
}
