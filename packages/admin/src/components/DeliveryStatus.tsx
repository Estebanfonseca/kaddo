import { StatusBadge } from './StatusBadge'
import { presentDeliveryStatus, toneToVariant } from '../lib/presentation'

type Props = { status: string | null | undefined; fallback?: string }

/**
 * Human-readable pill for an implementation/validation/release status.
 * Renders nothing when the status is absent, unless a `fallback` label is given.
 */
export function DeliveryStatus({ status, fallback }: Props) {
  const presented = presentDeliveryStatus(status)
  if (!presented) {
    if (!fallback) return null
    return <StatusBadge variant="muted">{fallback}</StatusBadge>
  }
  return <StatusBadge variant={toneToVariant(presented.tone)}>{presented.label}</StatusBadge>
}
