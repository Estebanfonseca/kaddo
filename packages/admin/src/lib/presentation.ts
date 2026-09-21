export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

export type StatusPresentation = {
  label: string
  tone: Tone
  description?: string
}

export type NextActionPresentation = {
  title: string
  description?: string
  agent?: string
  command?: string
}

const readinessMap: Record<string, StatusPresentation> = {
  'delivery-completed': { label: 'Delivery completed', tone: 'success' },
  'delivery-completed-release-blocked': { label: 'Delivery completed', tone: 'warning', description: 'Release blocked' },
  'ready': { label: 'Ready', tone: 'success' },
  'initialized': { label: 'Initialized', tone: 'neutral' },
  'completed-only': { label: 'Completed', tone: 'success', description: 'Further workflow steps available' },
}

export function presentReadiness(canonical: string, nextStep?: string): StatusPresentation {
  const mapped = readinessMap[canonical]
  if (mapped) return mapped

  if (canonical === 'not-applicable') {
    return {
      label: 'Needs attention',
      tone: 'warning',
      description: nextStep ?? 'Additional configuration required',
    }
  }

  if (canonical.includes('blocked')) return { label: humanize(canonical), tone: 'danger' }
  if (canonical.includes('completed') || canonical.includes('ready')) return { label: humanize(canonical), tone: 'success' }
  if (canonical.includes('missing') || canonical.includes('incomplete')) return { label: humanize(canonical), tone: 'warning' }

  return { label: humanize(canonical), tone: 'neutral' }
}

export function humanize(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

export function presentStructure(structure: string): string {
  return humanize(structure)
}

export function presentKnowledgeCount(layers: { status: string }[]): { ready: number; total: number } {
  const ready = layers.filter((l) => l.status !== 'Missing' && l.status !== 'Not applicable').length
  return { ready, total: layers.length }
}

export function presentWorkItemsSummary(byState: Record<string, number>, total: number): string {
  const completed = byState['completed'] ?? 0
  const active = total - completed - (byState['archived'] ?? 0)
  const parts: string[] = []
  if (completed > 0) parts.push(`${completed} completed`)
  if (active > 0) parts.push(`${active} active`)
  if (parts.length === 0 && total === 0) return 'No work items'
  return parts.join(' · ')
}

export function presentNextAction(
  readiness: { overall: string; recommendedNextStep: { label: string; command?: string } },
): NextActionPresentation | null {
  const { recommendedNextStep } = readiness
  if (!recommendedNextStep.label) return null

  const agentMatch = recommendedNextStep.label.match(/(?:Use |run )?(\S+-agent)/i)
  const agent = agentMatch?.[1]
  const title = recommendedNextStep.label.replace(/^Use \S+-agent to /i, '').replace(/\b\w/, (c) => c.toUpperCase())

  return {
    title,
    agent,
    command: recommendedNextStep.command,
    description: recommendedNextStep.label,
  }
}

export function presentRouteAttention(steps: { status: string }[]): { label: string; tone: Tone } | null {
  const warning = steps.find((s) => s.status === 'warning')
  const blocked = steps.find((s) => s.status === 'blocked')
  if (blocked) return { label: 'Blocked', tone: 'danger' }
  if (warning) return { label: 'Needs attention', tone: 'warning' }
  const pending = steps.filter((s) => s.status !== 'done' && s.status !== 'skipped' && s.status !== 'optional')
  if (pending.length > 0) return { label: `${pending.length} steps pending`, tone: 'neutral' }
  return null
}

export function toneToColor(tone: Tone): string {
  switch (tone) {
    case 'success': return 'var(--success)'
    case 'warning': return 'var(--warning)'
    case 'danger': return 'var(--danger)'
    case 'info': return 'var(--info)'
    case 'neutral': return 'var(--foreground-muted)'
  }
}
