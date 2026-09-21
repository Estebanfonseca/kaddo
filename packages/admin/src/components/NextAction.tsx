import { presentNextAction } from '../lib/presentation'

type Props = {
  readiness: { overall: string; recommendedNextStep: { label: string; command?: string } }
}

export function NextAction({ readiness }: Props) {
  const action = presentNextAction(readiness)
  if (!action) return null

  return (
    <section
      aria-labelledby="next-action-heading"
      style={{
        background: 'color-mix(in srgb, var(--primary) 8%, var(--surface))',
        border: '1px solid color-mix(in srgb, var(--primary) 25%, var(--border))',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        <span id="next-action-heading">Next action</span>
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', marginBottom: action.description || action.agent ? 6 : 0 }}>
        {action.title}
      </div>

      {action.description && (
        <div style={{ fontSize: 13, color: 'var(--foreground-muted)', marginBottom: action.agent || action.command ? 8 : 0 }}>
          {action.description}
        </div>
      )}

      {(action.agent || action.command) && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {action.agent && (
            <span className="font-mono" style={{
              display: 'inline-block',
              padding: '2px 8px',
              background: 'color-mix(in srgb, var(--primary) 15%, var(--surface))',
              borderRadius: 3,
              fontSize: 12,
              color: 'var(--primary)',
              fontWeight: 500,
            }}>
              {action.agent}
            </span>
          )}
          {action.command && (
            <code className="font-mono" style={{
              display: 'inline-block',
              padding: '2px 8px',
              background: 'var(--surface-muted)',
              borderRadius: 3,
              fontSize: 12,
              color: 'var(--foreground-muted)',
            }}>
              {action.command}
            </code>
          )}
        </div>
      )}
    </section>
  )
}
