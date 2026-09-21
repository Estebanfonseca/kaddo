import { useRouter } from '@tanstack/react-router'
import type { WorkItemListItem } from '../lib/api'
import { WorkItemStatus } from './WorkItemStatus'
import { DeliveryStatus } from './DeliveryStatus'
import { presentScopeConfidence } from '../lib/presentation'

/** A single Work Item card in the browser. Shows id, title, lifecycle, modules and delivery signals. */
export function WorkItemRow({ item }: { item: WorkItemListItem }) {
  const router = useRouter()
  const scope = item.scopeConfidenceLevel ? presentScopeConfidence(item.scopeConfidenceLevel) : null

  return (
    <button
      onClick={() => router.navigate({ to: '/work-items/$workItemId', params: { workItemId: item.id } })}
      style={{
        display: 'block', width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: 16, transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground-muted)' }}>{item.id}</span>
        <WorkItemStatus status={item.status} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: '4px 0 8px' }}>{item.title}</div>

      {item.affectedModules.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {item.affectedModules.map((m) => (
            <span key={m} className="font-mono" style={{
              fontSize: 11, padding: '1px 8px', borderRadius: 'var(--radius)',
              background: 'var(--surface-muted)', color: 'var(--foreground-muted)',
            }}>{m}</span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {item.status === 'completed' && item.implementationStatus && (
          <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>
            Implementation <DeliveryStatus status={item.implementationStatus} />
          </span>
        )}
        {item.validationStatus === 'accepted-with-exceptions' && (
          <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>
            Validation <DeliveryStatus status={item.validationStatus} />
          </span>
        )}
        {item.releaseStatus === 'blocked' && (
          <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>
            Release <DeliveryStatus status={item.releaseStatus} />
          </span>
        )}
        {scope && item.status !== 'completed' && (
          <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>{scope.label} scope confidence</span>
        )}
      </div>
    </button>
  )
}
