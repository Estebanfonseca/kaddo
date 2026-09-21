import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { api } from '../lib/api'
import { KnowledgeBreadcrumbs } from '../components/KnowledgeBreadcrumbs'
import { KnowledgeArtifactStatus } from '../components/KnowledgeArtifactStatus'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { humanize } from '../lib/presentation'

function Skeleton() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ height: 32, width: 300, background: 'var(--surface-muted)', borderRadius: 'var(--radius)', marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 200, background: 'var(--surface-muted)', borderRadius: 'var(--radius)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </div>
  )
}

export function KnowledgeArtifact() {
  const { layer, artifactId } = useParams({ from: '/knowledge/$layer/$artifactId' })

  const { data, isLoading, error } = useQuery({
    queryKey: ['knowledge-artifact', artifactId],
    queryFn: () => api.getKnowledgeArtifact(artifactId),
    refetchOnWindowFocus: false,
  })

  if (isLoading) return <Skeleton />

  if (error) {
    const message = error.message
    if (message.includes('not found')) {
      return (
        <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
          <KnowledgeBreadcrumbs crumbs={[
            { label: 'Knowledge', path: '/knowledge' },
            { label: humanize(layer), path: `/knowledge/${layer}` },
            { label: artifactId },
          ]} />
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--foreground-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 8px' }}>Artifact not found</h2>
            <p style={{ fontSize: 14 }}>This knowledge artifact does not exist in the project.</p>
          </div>
        </div>
      )
    }
    return (
      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <KnowledgeBreadcrumbs crumbs={[
          { label: 'Knowledge', path: '/knowledge' },
          { label: humanize(layer), path: `/knowledge/${layer}` },
          { label: artifactId },
        ]} />
        <div style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: 16 }}>
          <strong>Artifact unavailable</strong>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--foreground-muted)' }}>{message}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const isMissing = data.status === 'missing'
  const isPlaceholder = data.status === 'placeholder'

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <KnowledgeBreadcrumbs crumbs={[
        { label: 'Knowledge', path: '/knowledge' },
        { label: humanize(data.layer), path: `/knowledge/${data.layer}` },
        { label: data.title },
      ]} />

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>{data.title}</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>{humanize(data.layer)}</span>
          <span style={{ color: 'var(--border-strong)' }}>&middot;</span>
          <KnowledgeArtifactStatus status={data.status} />
        </div>
        <div className="font-mono" style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 6 }}>
          {data.path}
        </div>
      </div>

      {/* Content */}
      {isMissing ? (
        <div style={{ background: 'color-mix(in srgb, var(--danger) 8%, var(--surface))', border: '1px solid color-mix(in srgb, var(--danger) 25%, var(--border))', borderRadius: 'var(--radius)', padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠</div>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--foreground)' }}>Missing</h3>
          <p style={{ fontSize: 14, color: 'var(--foreground-muted)', margin: 0 }}>This knowledge artifact has not been created yet.</p>
        </div>
      ) : isPlaceholder ? (
        <div>
          <div style={{ background: 'color-mix(in srgb, var(--warning) 8%, var(--surface))', border: '1px solid color-mix(in srgb, var(--warning) 25%, var(--border))', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--foreground-muted)', margin: 0 }}>
              ⚠ This artifact exists but does not contain enough useful project knowledge yet.
            </p>
          </div>
          {data.content && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
              <MarkdownRenderer content={data.content} />
            </div>
          )}
        </div>
      ) : data.format !== 'markdown' ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, textAlign: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--foreground)' }}>Unsupported preview format</h3>
          <p className="font-mono" style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>{data.path}</p>
          <p style={{ fontSize: 14, color: 'var(--foreground-muted)' }}>Open through your local project tools.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
          <MarkdownRenderer content={data.content} />
        </div>
      )}

      {/* Metadata */}
      <div style={{ marginTop: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: 0.3, margin: '0 0 12px' }}>Details</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', fontSize: 13 }}>
          <span style={{ color: 'var(--foreground-muted)' }}>Layer</span>
          <span>{humanize(data.layer)}</span>
          <span style={{ color: 'var(--foreground-muted)' }}>Path</span>
          <span className="font-mono" style={{ fontSize: 12 }}>{data.path}</span>
          <span style={{ color: 'var(--foreground-muted)' }}>Status</span>
          <KnowledgeArtifactStatus status={data.status} />
          {data.type && <>
            <span style={{ color: 'var(--foreground-muted)' }}>Type</span>
            <span>{data.type}</span>
          </>}
        </div>
      </div>
    </div>
  )
}
