import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { ReadinessBadge } from '../components/ReadinessBadge'
import { FindingBadge } from '../components/FindingBadge'
import { KnowledgeStatus } from '../components/KnowledgeStatus'
import { ModuleBadge } from '../components/ModuleBadge'
import { ProjectRoute } from '../components/ProjectRoute'
import { EmptyState } from '../components/EmptyState'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: 20,
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function StatValue({ value, label }: { value: number | string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--foreground)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ padding: 24 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          height: 120,
          background: 'var(--surface-muted)',
          borderRadius: 'var(--radius)',
          marginBottom: 16,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </div>
  )
}

export function Overview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['overview'],
    queryFn: api.getOverview,
    refetchOnWindowFocus: true,
  })

  if (isLoading) return <Skeleton />
  if (error) return (
    <div style={{ padding: 24 }}>
      <div style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: 16 }}>
        <strong>Error loading project</strong>
        <p style={{ margin: '4px 0 0', fontSize: 14 }}>{error.message}</p>
      </div>
    </div>
  )
  if (!data) return <EmptyState title="No project data" description="Could not load project information." />

  const { project, knowledge, workItems, modules, readiness, route, findings } = data

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      {/* Project header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>{project.name}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="font-mono" style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>{project.structure}</span>
          <span style={{ color: 'var(--border-strong)' }}>&middot;</span>
          <ReadinessBadge status={readiness.overall} />
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Card title="Knowledge">
          <StatValue value={knowledge.layers.filter((l) => l.status !== 'Missing' && l.status !== 'Not applicable').length} label="Layers ready" />
        </Card>
        <Card title="Work Items">
          <StatValue value={workItems.total} label="Total" />
        </Card>
        <Card title="Modules">
          <StatValue value={modules.modules.length} label="Registered" />
        </Card>
      </div>

      {/* Work Items by state */}
      {workItems.total > 0 && (
        <Card title="Work Items">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
            {Object.entries(workItems.byState).filter(([, v]) => v > 0).map(([state, count]) => (
              <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{count}</span>
                <span style={{ color: 'var(--foreground-muted)', textTransform: 'capitalize' }}>{state}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div style={{ height: 16 }} />

      {/* Knowledge layers */}
      <Card title="Knowledge">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {knowledge.layers.map((l) => (
            <div key={l.layer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
              <span>{l.layer}</span>
              <KnowledgeStatus status={l.status} />
            </div>
          ))}
        </div>
      </Card>

      <div style={{ height: 16 }} />

      {/* Modules */}
      {modules.modules.length > 0 && (
        <>
          <Card title="Modules">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {modules.modules.map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                  <div>
                    <span className="font-mono" style={{ fontWeight: 600 }}>{m.id}</span>
                    {m.path && <span style={{ color: 'var(--foreground-muted)', marginLeft: 8, fontSize: 12 }}>{m.path}</span>}
                  </div>
                  <ModuleBadge role={m.role} available={m.available} />
                </div>
              ))}
            </div>
          </Card>
          <div style={{ height: 16 }} />
        </>
      )}

      {/* Project Route */}
      <Card title="Project Route">
        <ProjectRoute
          completed={route.completed}
          total={route.total}
          progressPercent={route.progressPercent}
          steps={route.steps}
        />
      </Card>

      <div style={{ height: 16 }} />

      {/* Readiness */}
      <Card title="Readiness">
        <div style={{ fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>Overall</span>
            <ReadinessBadge status={readiness.overall} />
          </div>
          {readiness.recommendedNextStep.label && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--foreground-muted)' }}>
              <span style={{ fontWeight: 600 }}>Next: </span>
              {readiness.recommendedNextStep.label}
              {readiness.recommendedNextStep.command && (
                <code className="font-mono" style={{
                  display: 'inline-block',
                  marginLeft: 6,
                  padding: '1px 6px',
                  background: 'var(--surface-muted)',
                  borderRadius: 3,
                  fontSize: 12,
                }}>
                  {readiness.recommendedNextStep.command}
                </code>
              )}
            </div>
          )}
        </div>
      </Card>

      <div style={{ height: 16 }} />

      {/* Findings */}
      <Card title="Findings">
        <div style={{ display: 'flex', gap: 12, marginBottom: findings.items.length > 0 ? 12 : 0, flexWrap: 'wrap' }}>
          <FindingBadge level="blocking" count={findings.blocking} />
          <FindingBadge level="warning" count={findings.warning} />
          <FindingBadge level="fyi" count={findings.fyi} />
        </div>
        {findings.items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
            {findings.items.map((f, i) => (
              <div key={i} style={{ color: 'var(--foreground-muted)' }}>
                <span style={{ textTransform: 'capitalize', fontWeight: 600, color: `var(--finding-${f.level})` }}>{f.level}: </span>
                {f.message}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
