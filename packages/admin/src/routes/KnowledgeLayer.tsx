import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from '@tanstack/react-router'
import { api } from '../lib/api'
import { KnowledgeBreadcrumbs } from '../components/KnowledgeBreadcrumbs'
import { KnowledgeArtifactStatus } from '../components/KnowledgeArtifactStatus'
import { KnowledgeStatus } from '../components/KnowledgeStatus'

function Skeleton() {
  return (
    <div style={{ padding: 24 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ height: 60, background: 'var(--surface-muted)', borderRadius: 'var(--radius)', marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </div>
  )
}

export function KnowledgeLayer() {
  const { layer } = useParams({ from: '/knowledge/$layer' })
  const router = useRouter()

  const { data, isLoading, error } = useQuery({
    queryKey: ['knowledge-inventory'],
    queryFn: api.getKnowledgeInventory,
    refetchOnWindowFocus: true,
  })

  if (isLoading) return <Skeleton />
  if (error) return (
    <div style={{ padding: 24 }}>
      <div style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: 16 }}>
        <strong>Error loading knowledge</strong>
        <p style={{ margin: '4px 0 0', fontSize: 14 }}>{error.message}</p>
      </div>
    </div>
  )

  const layerData = data?.layers.find((l) => l.id === layer)
  if (!layerData) return (
    <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--foreground-muted)' }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>Layer not found</h2>
      <p style={{ fontSize: 14 }}>Knowledge layer "{layer}" does not exist.</p>
    </div>
  )

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <KnowledgeBreadcrumbs crumbs={[
        { label: 'Knowledge', path: '/knowledge' },
        { label: layerData.label },
      ]} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{layerData.label}</h2>
        <KnowledgeStatus status={layerData.status} />
      </div>

      <p style={{ fontSize: 14, color: 'var(--foreground-muted)', margin: '0 0 20px' }}>
        {layerData.artifacts.length} artifact{layerData.artifacts.length !== 1 ? 's' : ''}
      </p>

      {layerData.artifacts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--foreground-muted)' }}>
          <p style={{ fontSize: 14 }}>No artifacts in this layer.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {layerData.artifacts.map((a) => (
            <button
              key={a.id}
              onClick={() => router.navigate({ to: '/knowledge/$layer/$artifactId', params: { layer, artifactId: a.id } })}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                padding: '14px 18px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{a.title}</div>
                <div className="font-mono" style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>{a.path}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <KnowledgeArtifactStatus status={a.status} />
                <span style={{ color: 'var(--foreground-muted)', fontSize: 14 }}>→</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
