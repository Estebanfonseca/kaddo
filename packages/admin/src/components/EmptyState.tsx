type Props = {
  title: string
  description?: string
}

export function EmptyState({ title, description }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      color: 'var(--foreground-muted)',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>{title}</p>
      {description && <p style={{ fontSize: 14, margin: 0 }}>{description}</p>}
    </div>
  )
}
