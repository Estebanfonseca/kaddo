import { StatusBadge } from './StatusBadge'

const statusVariant: Record<string, 'muted' | 'info' | 'warning' | 'danger' | 'success'> = {
  draft: 'muted',
  ready: 'info',
  'in-progress': 'warning',
  blocked: 'danger',
  completed: 'success',
  archived: 'muted',
}

type Props = { status: string }

export function WorkItemStatus({ status }: Props) {
  return <StatusBadge variant={statusVariant[status] ?? 'muted'}>{status}</StatusBadge>
}
