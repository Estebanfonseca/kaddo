import { Handle, Position } from '@xyflow/react'
import type { SystemMapNode } from '../../lib/api'
import { nodeCategory, DIMENSION_META } from '../../lib/systemMap'

type Data = { node: SystemMapNode; selected: boolean }

/** A single system element. Type/status/dimension are conveyed by label + text + border, not color alone. */
export function SystemNode({ data }: { data: Data }) {
  const { node, selected } = data
  const cat = nodeCategory(node.type)
  const dim = DIMENSION_META[node.dimension]
  return (
    <div
      style={{
        width: 190, minHeight: 58, boxSizing: 'border-box',
        background: 'var(--surface)',
        border: `1px ${dim.border} ${selected ? 'var(--primary)' : 'var(--border)'}`,
        borderLeft: `4px solid ${cat.tone}`,
        borderRadius: 'var(--radius)',
        boxShadow: selected ? '0 0 0 2px color-mix(in srgb, var(--primary) 40%, transparent)' : 'none',
        padding: '8px 10px', overflow: 'hidden',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'var(--border-strong)', width: 6, height: 6 }} />
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--foreground-muted)' }}>{cat.label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.25, wordBreak: 'break-word' }}>{node.label}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
        {node.moduleId && <span className="font-mono" style={{ fontSize: 10, color: 'var(--foreground-muted)' }}>{node.moduleId}</span>}
        {node.status && <span style={{ fontSize: 10, color: 'var(--foreground-muted)' }}>· {node.status}</span>}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--border-strong)', width: 6, height: 6 }} />
    </div>
  )
}

/** A module/repository boundary drawn behind its member nodes. */
export function SystemGroupNode({ data }: { data: { label: string; available: boolean } }) {
  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      border: `1px dashed ${data.available ? 'var(--border-strong)' : 'var(--danger)'}`,
      borderRadius: 'var(--radius)',
      background: 'color-mix(in srgb, var(--surface-muted) 50%, transparent)',
    }}>
      <div style={{ position: 'absolute', top: 4, left: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground-muted)' }}>{data.label}</span>
        {!data.available && <span style={{ fontSize: 10, color: 'var(--danger)' }}>Unavailable</span>}
      </div>
    </div>
  )
}
