type Props = {
  projectName: string
}

export function KaddoPageHeader({ projectName }: Props) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>Kaddo Admin</span>
      </div>
      <span className="font-mono" style={{ fontSize: 14, color: 'var(--foreground-muted)' }}>{projectName}</span>
    </header>
  )
}
