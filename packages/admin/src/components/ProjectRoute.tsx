type Props = {
  completed: number
  total: number
  progressPercent: number
  steps: { id: string; label: string; status: string }[]
}

const statusIcon: Record<string, string> = {
  done: '✓',
  current: '●',
  warning: '⚠',
  blocked: '✗',
  next: '○',
  pending: '○',
  optional: '○',
  skipped: '—',
}

const statusColor: Record<string, string> = {
  done: 'var(--success)',
  current: 'var(--primary)',
  warning: 'var(--warning)',
  blocked: 'var(--danger)',
  next: 'var(--foreground-muted)',
  pending: 'var(--foreground-muted)',
  optional: 'var(--foreground-muted)',
  skipped: 'var(--foreground-muted)',
}

export function ProjectRoute({ completed, total, progressPercent, steps }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          background: 'var(--surface-muted)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            borderRadius: 4,
            background: progressPercent === 100 ? 'var(--success)' : 'var(--primary)',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ fontSize: 13, color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>
          {completed} / {total}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {steps.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: statusColor[s.status] ?? 'var(--foreground-muted)', width: 16, textAlign: 'center' }}>
              {statusIcon[s.status] ?? '○'}
            </span>
            <span style={{ color: s.status === 'done' ? 'var(--foreground)' : 'var(--foreground-muted)' }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
