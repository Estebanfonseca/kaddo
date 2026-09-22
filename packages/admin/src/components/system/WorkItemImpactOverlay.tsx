import type { WorkItemDetail } from '../../lib/api'

// System Explorer overlay banner for ?workItem= (VS-101). Summarizes the Work Item's confirmed
// system impact and lets the user jump to any entity. Read-only: it visualizes what an agent
// proposed and a human confirmed — it never mutates scope. It also warns when Graph coverage is
// partial, so an absent highlight is never read as "no impact".

const chipStyle = (tone: string) =>
  ({
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 'var(--radius)',
    border: `1px solid ${tone}`, background: `color-mix(in srgb, ${tone} 12%, transparent)`,
    color: 'var(--foreground)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
  }) as const

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
  const affected = wi?.affectedSystemEntities ?? []
  const reviewed = wi?.reviewedSystemEntities ?? []
  const reviewedNotAffected = reviewed.filter((r) => r.status !== 'unknown')
  const unknown = reviewed.filter((r) => r.status === 'unknown')
  const assessed = affected.length > 0 || reviewed.length > 0

  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>System impact · <span className="font-mono">{workItemId}</span></span>
          {wi && assessed && (
            <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>
              <strong style={{ color: 'var(--danger)' }}>{affected.length}</strong> affected ·{' '}
              <strong>{reviewedNotAffected.length}</strong> reviewed ·{' '}
              <strong style={{ color: 'var(--warning)' }}>{unknown.length}</strong> unknown
            </span>
          )}
        </div>
        <button
          onClick={onClear}
          style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--foreground-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
        >
          ✕ Clear impact
        </button>
      </div>

      {wi && assessed && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {affected.map((e) => (
            <button key={e.nodeId} onClick={() => onSelectNode(e.nodeId)} style={chipStyle('var(--danger)')} title="Focus in the graph">{e.label}</button>
          ))}
          {unknown.map((e) => (
            <button key={e.nodeId} onClick={() => onSelectNode(e.nodeId)} style={chipStyle('var(--warning)')} title="Focus in the graph">{e.label}</button>
          ))}
        </div>
      )}

      {wi && !assessed && (
        <p style={{ fontSize: 12, color: 'var(--foreground-muted)', margin: 0 }}>
          This Work Item has not been assessed against the system Graph. A missing assessment does not mean there is no impact.
        </p>
      )}

      {topologyStatus === 'partial' && (
        <p style={{ fontSize: 12, color: 'var(--warning)', margin: 0 }}>
          ⚠ Graph coverage is partial — entities without a highlight may still be impacted. Verify in the repository.
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
