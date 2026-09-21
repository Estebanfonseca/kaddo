import { StatusBadge } from './StatusBadge'

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'muted' }> = {
  'available': { label: 'Available', variant: 'success' },
  'missing': { label: 'Missing', variant: 'danger' },
  'placeholder': { label: 'Needs content', variant: 'warning' },
  'not-applicable': { label: 'Not applicable', variant: 'muted' },
  'unknown': { label: 'Unknown', variant: 'muted' },
}

export function KnowledgeArtifactStatus({ status }: { status: string }) {
  const mapped = statusMap[status] ?? { label: status, variant: 'muted' as const }
  return <StatusBadge variant={mapped.variant}>{mapped.label}</StatusBadge>
}
