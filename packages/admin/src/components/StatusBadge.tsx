type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

const variantStyles: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: 'var(--surface-muted)', color: 'var(--foreground)' },
  success: { bg: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)' },
  warning: { bg: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)' },
  danger: { bg: 'color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)' },
  info: { bg: 'color-mix(in srgb, var(--info) 15%, transparent)', color: 'var(--info)' },
  muted: { bg: 'var(--surface-muted)', color: 'var(--foreground-muted)' },
}

type Props = {
  variant?: BadgeVariant
  children: React.ReactNode
}

export function StatusBadge({ variant = 'default', children }: Props) {
  const { bg, color } = variantStyles[variant]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      borderRadius: 'var(--radius)',
      fontSize: 12,
      fontWeight: 600,
      background: bg,
      color,
    }}>
      {children}
    </span>
  )
}
