import { useRouter } from '@tanstack/react-router'
import type { SystemImpactEntity, ReviewedSystemEntity } from '../lib/api'
import { Section } from './Section'
import { nodeCategory } from '../lib/systemMap'

// Work Item SYSTEM IMPACT (VS-101). Read-only visualization of impact the agent proposed and a
// human confirmed into the canonical Work Item, resolved against the semantic topology. The Graph
// widens what was reviewed; it never decides scope, so entities are shown grouped by their confirmed
// classification (affected / reviewed-not-affected / unknown), each navigable into the System Explorer.

const UNKNOWN = 'unknown'

function Chip({ entity, tone, onClick }: { entity: SystemImpactEntity; tone: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={`Open ${entity.label} in the System Explorer`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 'var(--radius)',
        border: `1px solid ${tone}`, background: `color-mix(in srgb, ${tone} 10%, transparent)`,
        color: 'var(--foreground)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
      }}
    >
      <span>{entity.label}</span>
      <span style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>· {nodeCategory(entity.kind).label}{entity.moduleId ? ` · ${entity.moduleId}` : ''}</span>
    </button>
  )
}

function Group({ label, tone, hint, entities, onOpen }: {
  label: string; tone: string; hint: string; entities: SystemImpactEntity[]; onOpen: (nodeId: string) => void
}) {
  if (entities.length === 0) return null
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: tone }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>{entities.length} · {hint}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {entities.map((e) => <Chip key={e.nodeId} entity={e} tone={tone} onClick={() => onOpen(e.nodeId)} />)}
      </div>
    </div>
  )
}

export function SystemImpact({
  workItemId,
  affected,
  reviewed,
  graphRevision,
  refined,
}: {
  workItemId: string
  affected: SystemImpactEntity[]
  reviewed: ReviewedSystemEntity[]
  graphRevision: string | null
  refined: boolean
}) {
  const router = useRouter()
  const openNode = (nodeId: string) => router.navigate({ to: '/system', search: { node: nodeId } })
  const openExplorer = () => router.navigate({ to: '/system', search: { workItem: workItemId } })

  const reviewedNotAffected = reviewed.filter((r) => r.status !== UNKNOWN)
  const unknown = reviewed.filter((r) => r.status === UNKNOWN)
  const hasImpact = affected.length > 0 || reviewed.length > 0

  // Legacy / unrefined Work Items were never assessed against the Graph — don't imply "no impact".
  if (!hasImpact) {
    if (!refined) return null
    return (
      <Section title="System impact">
        <p style={{ fontSize: 13, color: 'var(--foreground-muted)', margin: 0 }}>
          Not assessed against the system Graph. A missing assessment does not mean there is no impact.
        </p>
      </Section>
    )
  }

  return (
    <Section title="System impact">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--foreground-muted)' }}>
          <span><strong style={{ color: 'var(--danger)' }}>{affected.length}</strong> affected</span>
          <span><strong style={{ color: 'var(--foreground)' }}>{reviewedNotAffected.length}</strong> reviewed, not affected</span>
          <span><strong style={{ color: 'var(--warning)' }}>{unknown.length}</strong> unknown</span>
        </div>
        <button
          onClick={openExplorer}
          style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
        >
          View in System Explorer →
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Group label="Affected" tone="var(--danger)" hint="in scope, changing" entities={affected} onOpen={openNode} />
        <Group label="Reviewed, not affected" tone="var(--foreground-muted)" hint="checked, out of scope" entities={reviewedNotAffected} onOpen={openNode} />
        <Group label="Unknown" tone="var(--warning)" hint="needs a decision" entities={unknown} onOpen={openNode} />
      </div>

      {unknown.some((u) => u.reason) && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {unknown.filter((u) => u.reason).map((u) => (
            <div key={u.nodeId} style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>
              <span style={{ fontWeight: 600 }}>{u.label}:</span> {u.reason}
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 12, marginBottom: 0, fontStyle: 'italic' }}>
        Graph-assisted assessment{graphRevision ? ` · graph ${graphRevision}` : ''}. The Graph widens what was reviewed;
        it does not decide scope, and a missing edge does not mean no impact.
      </p>
    </Section>
  )
}
