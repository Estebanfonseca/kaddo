import { StatusBadge } from './StatusBadge'

const levelVariant: Record<string, 'danger' | 'warning' | 'muted'> = {
  blocking: 'danger',
  warning: 'warning',
  fyi: 'muted',
}

type Props = { level: string; count?: number }

export function FindingBadge({ level, count }: Props) {
  return (
    <StatusBadge variant={levelVariant[level] ?? 'muted'}>
      {count !== undefined ? `${count} ${level}` : level}
    </StatusBadge>
  )
}
