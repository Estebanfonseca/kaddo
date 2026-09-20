import { StatusBadge } from './StatusBadge'

type Props = { status: string }

function readinessVariant(status: string): 'success' | 'warning' | 'danger' | 'muted' {
  if (status.includes('ready') || status.includes('completed')) return 'success'
  if (status.includes('blocked')) return 'danger'
  if (status.includes('missing') || status.includes('incomplete')) return 'warning'
  return 'muted'
}

export function ReadinessBadge({ status }: Props) {
  return <StatusBadge variant={readinessVariant(status)}>{status}</StatusBadge>
}
