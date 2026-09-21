import { presentNextAction } from '../lib/presentation'

type Props = {
  readiness: { overall: string; recommendedNextStep: { label: string; command?: string } }
}

export function NextAction({ readiness }: Props) {
  const action = presentNextAction(readiness)
  if (!action) return null

  return (
    <div style={{
      background: 'color-mix(in srgb, var(--primary) 8%, var(--surface))',
      border: '1px solid color-mix(in srgb, var(--primary) 25%, var(--border))',
      borderRadius: 'var(--radius)',
      padding: '14px 18px',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>→</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
            {action.title}
          </div>
          {action.command && (
            <code className="font-mono" style={{
              display: 'inline-block',
              marginTop: 4,
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
      </div>
    </div>
  )
}
