import { useRouter } from '@tanstack/react-router'

type Crumb = { label: string; path?: string }

export function KnowledgeBreadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const router = useRouter()

  return (
    <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: 'var(--foreground-muted)', marginBottom: 16 }}>
      {crumbs.map((c, i) => (
        <span key={i}>
          {i > 0 && <span style={{ margin: '0 6px' }}>/</span>}
          {c.path ? (
            <button
              onClick={() => router.navigate({ to: c.path! })}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: 'var(--primary)', fontFamily: 'inherit', fontSize: 'inherit',
                textDecoration: 'none',
              }}
            >
              {c.label}
            </button>
          ) : (
            <span style={{ color: 'var(--foreground)' }}>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
