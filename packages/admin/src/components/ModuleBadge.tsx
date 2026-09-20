import { StatusBadge } from './StatusBadge'

type Props = { role: string; available: boolean }

export function ModuleBadge({ role, available }: Props) {
  if (!available) return <StatusBadge variant="danger">Unavailable</StatusBadge>
  if (role === 'core') return <StatusBadge variant="info">Core</StatusBadge>
  return <StatusBadge variant="success">Module</StatusBadge>
}
