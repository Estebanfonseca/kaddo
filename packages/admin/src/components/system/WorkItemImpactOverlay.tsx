import type { WorkItemDetail, SystemImpactEntity, ReviewedSystemEntity } from '../../lib/api'
import { buildImpactRows, impactCounts, type ImpactRow } from '../../lib/impact'

// System Explorer overlay banner for ?workItem= (VS-101 / VS-101.1). Summarizes the Work Item's
// confirmed system impact, keeps EVERY counted entity accessible (counts are selectable and each
// entity is a chip), and warns when Graph coverage is partial so an absent highlight is never read
// as "no impact". Read-only: it visualizes what an agent proposed and a human confirmed.

type Row = ImpactRow

const META: Record<string, { tone: string; label: string }> = {
  affected: { tone: 'var(--danger)', label: 'Affected' },
  'reviewed-not-affected': { tone: 'var(--foreground-muted)', label: 'Reviewed — not affected' },
  unknown: { tone: 'var(--warning)', label: 'Unknown' },
}
const meta = (status: string) => META[status] ?? { tone: 'var(--foreground-muted)', label: status }

function chip(tone: string, onClick: () => void, label: string, key: string) {
  return (
    <button
      key={key}
      onClick={onClick}
      title="Focus in the graph"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 'var(--radius)',
        border: `1px solid ${tone}`, background: `color-mix(in srgb, ${tone} 12%, transparent)`,
        color: 'var(--foreground)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
      }}
    >
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 8, background: tone }} />
      {label}
    </button>
  )
}

export function WorkItemImpactOverlay({
  workItemId,
  wi,
  topologyStatus,
  onClear,
  onSelectNode,
}: {
  workItemId: string
  wi: WorkItemDetail | null
  topologyStatus: 'unavailable' | 'partial' | 'available'
  onClear: () => void
  onSelectNode: (nodeId: string) => void
}) {
  const affected: SystemImpactEntity[] = wi?.affectedSystemEntities ?? []
  const reviewed: ReviewedSystemEntity[] = wi?.reviewedSystemEntities ?? []
  const reviewedNotAffected = reviewed.filter((r) => r.status !== 'unknown')
  const unknown = reviewed.filter((r) => r.status === 'unknown')
  const rows: Row[] = buildImpactRows(affected, reviewed)
  const counts = impactCounts(affected, reviewed)
  const assessed = rows.length > 0

  const focusFirst = (list: { nodeId: string }[]) => list[0] && onSelectNode(list[0].nodeId)

  const countButton = (label: string, n: number, tone: string, list: { nodeId: string }[]) => (
    <button
      onClick={() => focusFirst(list)}
      disabled={n === 0}
      style={{
        display: 'inline-flex', gap: 6, alignItems: 'center', padding: '3px 9px', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)',
        cursor: n === 0 ? 'default' : 'pointer', opacity: n === 0 ? 0.5 : 1, fontSize: 12, fontFamily: 'inherit',
      }}
    >
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 8, background: tone }} />
      {label} <strong>{n}</strong>
    </button>
  )

  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Impact view · <span className="font-mono">{workItemId}</span></span>
        <button
          onClick={onClear}
          style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--foreground-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
        >
          ✕ Clear impact
        </button>
      </div>

      {wi && assessed && (
        <>
          {/* Selectable counts — every count focuses its group, so nothing counted is unreachable. */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {countButton('Affected', counts.affected, 'var(--danger)', affected)}
            {countButton('Reviewed', counts.reviewedNotAffected, 'var(--foreground-muted)', reviewedNotAffected)}
            {countButton('Unknown', counts.unknown, 'var(--warning)', unknown)}
          </div>
          {/* Every entity as a chip. */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {rows.map((e) => chip(meta(e.status).tone, () => onSelectNode(e.nodeId), e.label, `${e.status}:${e.nodeId}`))}
          </div>
        </>
      )}

      {wi && !assessed && (
        <p style={{ fontSize: 12, color: 'var(--foreground-muted)', margin: 0 }}>
          This Work Item has not been assessed against the system Graph. A missing assessment does not mean there is no impact.
        </p>
      )}

      {/* Legend — label + marker, not color alone. */}
      {wi && assessed && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--foreground-muted)' }}>
          {(['affected', 'reviewed-not-affected', 'unknown'] as const).map((s) => (
            <span key={s} style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: 8, background: meta(s).tone }} />{meta(s).label}
            </span>
          ))}
        </div>
      )}

      {topologyStatus === 'partial' && (
        <p style={{ fontSize: 12, color: 'var(--warning)', margin: 0 }}>
          ⚠ Graph coverage is partial. The highlighted entities represent reviewed scope based on the currently known
          topology and repository evidence — entities without a highlight may still be impacted.
        </p>
      )}
      {topologyStatus === 'unavailable' && (
        <p style={{ fontSize: 12, color: 'var(--foreground-muted)', margin: 0 }}>
          No semantic topology is available, so impact cannot be projected onto the graph.
        </p>
      )}
    </div>
  )
}
