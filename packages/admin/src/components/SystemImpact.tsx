import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import type { SystemImpactEntity, ReviewedSystemEntity, GraphCoverage } from '../lib/api'
import { Section } from './Section'
import { nodeCategory } from '../lib/systemMap'
import { buildImpactRows, impactCounts, coverageNotice, type ImpactRow } from '../lib/impact'

// Work Item SYSTEM IMPACT (VS-101 / VS-101.1). Read-only visualization of impact the agent proposed
// and a human confirmed, resolved against the semantic topology. Beyond the classification, it
// explains WHY each entity was reviewed, HOW the Graph surfaced it, and WHAT evidence was found in
// the repository — evidence, never chain-of-thought. The Graph widens what was reviewed; it never
// decides scope, and a missing edge is not proof of no impact.

type Row = ImpactRow

const STATUS_META: Record<string, { tone: string; label: string }> = {
  affected: { tone: 'var(--danger)', label: 'Affected' },
  'reviewed-not-affected': { tone: 'var(--foreground-muted)', label: 'Reviewed — not affected' },
  unknown: { tone: 'var(--warning)', label: 'Unknown' },
}
function statusMeta(status: string) {
  return STATUS_META[status] ?? { tone: 'var(--foreground-muted)', label: status }
}

function GraphReason({ entity }: { entity: SystemImpactEntity }) {
  if (!entity.graphReason) return null
  const { relationship, path } = entity.graphReason
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Graph reason</div>
      <div className="font-mono" style={{ fontSize: 12, color: 'var(--foreground)' }}>
        {path.length > 0 ? path.join('  →  ') : entity.label}
        {relationship ? <span style={{ color: 'var(--foreground-muted)' }}>{'  ·  '}{relationship}</span> : null}
      </div>
    </div>
  )
}

function EntityRow({ entity, onOpen }: { entity: Row; onOpen: (nodeId: string) => void }) {
  const [open, setOpen] = useState(false)
  const meta = statusMeta(entity.status)
  const hasEvidence = Boolean(entity.reason || entity.graphReason || entity.evidenceSummary || entity.evidenceRefs.length)
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
        {/* Marker + label, not color alone. */}
        <span aria-hidden style={{ width: 9, height: 9, borderRadius: 9, background: meta.tone, flex: '0 0 auto' }} />
        <button
          onClick={() => onOpen(entity.nodeId)}
          title={`Open ${entity.label} in the System Explorer`}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}
        >
          {entity.label}
        </button>
        <span style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>· {nodeCategory(entity.kind).label}{entity.moduleId ? ` · ${entity.moduleId}` : ''}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: meta.tone }}>{meta.label}</span>
        {hasEvidence && (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            style={{ padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--foreground-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
          >
            {open ? 'Hide evidence' : 'View evidence'}
          </button>
        )}
      </div>
      {open && hasEvidence && (
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--surface-muted)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entity.reason && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Why reviewed</div>
              <div style={{ fontSize: 13 }}>{entity.reason}</div>
            </div>
          )}
          <GraphReason entity={entity} />
          {(entity.evidenceSummary || entity.evidenceRefs.length > 0) && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Repository evidence</div>
              {entity.evidenceSummary && <div style={{ fontSize: 13 }}>{entity.evidenceSummary}</div>}
              {entity.evidenceRefs.length > 0 && (
                <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                  {entity.evidenceRefs.map((r) => (
                    <li key={r} className="font-mono" style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Conclusion</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: meta.tone }}>{meta.label}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function CoverageBanner({ coverage }: { coverage: GraphCoverage }) {
  const notice = coverageNotice(coverage)
  if (!notice) return null
  const partial = notice.level === 'partial'
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', marginBottom: 12, borderRadius: 'var(--radius)', border: `1px solid ${partial ? 'var(--warning)' : 'var(--border)'}`, background: `color-mix(in srgb, ${partial ? 'var(--warning)' : 'var(--foreground-muted)'} 8%, transparent)` }}>
      <span aria-hidden>{partial ? '⚠' : 'ℹ'}</span>
      <div style={{ fontSize: 12.5, color: 'var(--foreground)' }}>
        <strong>{notice.title}.</strong> {notice.body}
      </div>
    </div>
  )
}

export function SystemImpact({
  workItemId,
  affected,
  reviewed,
  graphRevision,
  graphCoverage,
  refined,
}: {
  workItemId: string
  affected: SystemImpactEntity[]
  reviewed: ReviewedSystemEntity[]
  graphRevision: string | null
  graphCoverage: GraphCoverage
  refined: boolean
}) {
  const router = useRouter()
  const openNode = (nodeId: string) => router.navigate({ to: '/system', search: { node: nodeId } })
  const openExplorer = () => router.navigate({ to: '/system', search: { workItem: workItemId } })

  // Every counted entity is a row, so summary counts always match what is visible (AC8–AC10).
  const rows = buildImpactRows(affected, reviewed)
  const counts = impactCounts(affected, reviewed)
  const hasImpact = rows.length > 0

  // Legacy / unrefined Work Items were never assessed against the Graph — don't imply "no impact".
  if (!hasImpact) {
    if (!refined) return null
    return (
      <Section title="System impact">
        <CoverageBanner coverage={graphCoverage} />
        <p style={{ fontSize: 13, color: 'var(--foreground-muted)', margin: 0 }}>
          Not assessed against the system Graph. A missing assessment does not mean there is no impact.
        </p>
      </Section>
    )
  }

  return (
    <Section title="System impact">
      <CoverageBanner coverage={graphCoverage} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--foreground-muted)' }}>
          <span><strong style={{ color: 'var(--danger)' }}>{counts.affected}</strong> affected</span>
          <span><strong style={{ color: 'var(--foreground)' }}>{counts.reviewedNotAffected}</strong> reviewed, not affected</span>
          <span><strong style={{ color: 'var(--warning)' }}>{counts.unknown}</strong> unknown</span>
        </div>
        <button
          onClick={openExplorer}
          style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
        >
          View in System Explorer →
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((e) => <EntityRow key={`${e.status}:${e.nodeId}`} entity={e} onOpen={openNode} />)}
      </div>

      <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 12, marginBottom: 0, fontStyle: 'italic' }}>
        Graph-assisted assessment{graphRevision ? ` · graph ${graphRevision}` : ''}. The Graph widens what was reviewed;
        it does not decide scope, and a missing edge does not mean no impact.
      </p>
    </Section>
  )
}
