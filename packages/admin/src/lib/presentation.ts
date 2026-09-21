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

export type FindingsPresentation = {
  total: number
  label: string
  tone: Tone
}

export type RoutePresentation = {
  completed: number
  total: number
  label: string
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

export function presentModulesSummary(total: number): string {
  if (total === 0) return 'No modules registered'
  return 'Registered'
}

export function presentFindingsSummary(blocking: number, warning: number, fyi: number): FindingsPresentation {
  const total = blocking + warning + fyi
  if (total === 0) return { total: 0, label: 'No findings', tone: 'success' }

  const parts: string[] = []
  if (blocking > 0) parts.push(`${blocking} blocking`)
  if (warning > 0) parts.push(`${warning} warning${warning > 1 ? 's' : ''}`)
  if (fyi > 0) parts.push(`${fyi} FYI`)

  const tone: Tone = blocking > 0 ? 'danger' : warning > 0 ? 'warning' : 'info'
  return { total, label: parts.join(' · '), tone }
}

export function presentRoute(completed: number, total: number): RoutePresentation {
  return { completed, total, label: 'Overall Kaddo workflow coverage' }
}

export function presentNextAction(
  readiness: { overall: string; recommendedNextStep: { label: string; command?: string } },
): NextActionPresentation | null {
  const { recommendedNextStep } = readiness
  if (!recommendedNextStep.label) return null

  const agentMatch = recommendedNextStep.label.match(/(?:Use |run )?(\S+-agent)/i)
  const agent = agentMatch?.[1]

  let title = recommendedNextStep.label
  if (agent) {
    title = title.replace(/^Use \S+-agent to /i, '')
  }
  title = title.replace(/\(.*?\)\s*\.?$/, '').trim()
  title = title.replace(/\b\w/, (c) => c.toUpperCase())
  if (title.endsWith('.')) title = title.slice(0, -1)

  const description = agent
    ? `Use ${agent} to ${title.charAt(0).toLowerCase()}${title.slice(1)}.`
    : undefined

  return { title, description, agent, command: recommendedNextStep.command }
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
