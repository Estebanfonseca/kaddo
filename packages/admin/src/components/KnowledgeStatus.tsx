import { StatusBadge } from './StatusBadge'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  'Consolidated': 'success',
  'Structured': 'success',
  'Ready': 'success',
  'Useful': 'success',
  'Weak': 'warning',
  'Placeholder': 'warning',
  'Missing': 'danger',
  'Not applicable': 'muted',
  'Managed by core': 'muted',
}

type Props = { status: string }

export function KnowledgeStatus({ status }: Props) {
  return <StatusBadge variant={statusVariant[status] ?? 'muted'}>{status}</StatusBadge>
}
