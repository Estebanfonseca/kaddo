import { useRouter } from '@tanstack/react-router'
import { KnowledgeStatus } from './KnowledgeStatus'

type Props = {
  layer: string
  status: string
  navigable?: boolean
}

export function KnowledgeRow({ layer, status, navigable = false }: Props) {
  const router = useRouter()
  const layerId = layer.toLowerCase()

  if (navigable) {
    return (
      <button
        onClick={() => router.navigate({ to: '/knowledge/$layer', params: { layer: layerId } })}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14,
          padding: '6px 4px', width: '100%', border: 'none', background: 'none', cursor: 'pointer',
          fontFamily: 'inherit', borderRadius: 4, transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-muted)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
      >
        <span style={{ color: 'var(--foreground)' }}>{layer}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KnowledgeStatus status={status} />
          <span style={{ color: 'var(--foreground-muted)', fontSize: 14 }}>→</span>
        </div>
      </button>
    )
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14,
      padding: '4px 0',
    }}>
      <span>{layer}</span>
      <KnowledgeStatus status={status} />
    </div>
  )
}
