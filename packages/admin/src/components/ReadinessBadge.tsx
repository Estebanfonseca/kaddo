import { StatusBadge } from './StatusBadge'
import { presentReadiness } from '../lib/presentation'

type Props = { status: string }

function toneToVariant(tone: string): 'success' | 'warning' | 'danger' | 'muted' {
  if (tone === 'success') return 'success'
  if (tone === 'warning') return 'warning'
  if (tone === 'danger') return 'danger'
  return 'muted'
}

export function ReadinessBadge({ status }: Props) {
  const presentation = presentReadiness(status)
  return <StatusBadge variant={toneToVariant(presentation.tone)}>{presentation.label}</StatusBadge>
}
