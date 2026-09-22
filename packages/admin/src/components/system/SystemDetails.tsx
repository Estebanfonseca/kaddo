import { useRouter } from '@tanstack/react-router'
import type { SystemMapProjection, SystemMapNode, SystemMapRelationship } from '../../lib/api'
import { ArtifactPath } from '../ArtifactPath'
import { nodeCategory } from '../../lib/systemMap'
import { humanize } from '../../lib/presentation'

type Props = {
  projection: SystemMapProjection
  selectedNodeId: string | null
  selectedEdgeId: string | null
  onClose: () => void
  onSelectNode: (id: string) => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--foreground-muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--foreground)' }}>{children}</div>
    </div>
  )
}

function LinkButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'block', background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', color: 'var(--primary)', fontFamily: 'inherit', fontSize: 14, textAlign: 'left' }}>{children}</button>
  )
}

export function SystemDetails({ projection, selectedNodeId, selectedEdgeId, onClose, onSelectNode }: Props) {
  const router = useRouter()
  const nodeById = new Map(projection.nodes.map((n) => [n.id, n]))

  const node = selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null
  const edge = selectedEdgeId ? projection.relationships.find((r) => r.id === selectedEdgeId) ?? null : null

  return (
    <aside style={{ width: 320, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--surface)', padding: 20, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClose} aria-label="Close details" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-muted)', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      {node && <NodeDetails node={node} projection={projection} nodeById={nodeById} onSelectNode={onSelectNode} router={router} />}
      {!node && edge && <EdgeDetails edge={edge} nodeById={nodeById} />}
      {!node && !edge && <p style={{ fontSize: 14, color: 'var(--foreground-muted)' }}>Select a node or relationship to see details.</p>}
    </aside>
  )
}

function NodeDetails({ node, projection, nodeById, onSelectNode, router }: {
  node: SystemMapNode
  projection: SystemMapProjection
  nodeById: Map<string, SystemMapNode>
  onSelectNode: (id: string) => void
  router: ReturnType<typeof useRouter>
}) {
  const cat = nodeCategory(node.type)

  // Collect neighbours (both directions) and group them by the connected node's dimension so the
  // panel reads as: technical relationships, knowledge context, delivery history, implementation.
  type Neighbour = { id: string; label: string; rel: string; dimension: string }
  const neighbours: Neighbour[] = []
  for (const r of projection.relationships) {
    if (r.source === node.id) { const o = nodeById.get(r.target); if (o) neighbours.push({ id: o.id, label: o.label, rel: `${r.label} →`, dimension: o.dimension }) }
    else if (r.target === node.id) { const o = nodeById.get(r.source); if (o) neighbours.push({ id: o.id, label: o.label, rel: `${r.label} from`, dimension: o.dimension }) }
  }
  const byDim = (d: string) => neighbours.filter((n) => n.dimension === d)
  const technical = byDim('system')
  const knowledge = byDim('knowledge')
  const delivery = byDim('delivery')
  const implementation = byDim('implementation')

  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 12px', wordBreak: 'break-word' }}>{node.label}</h2>
      <Row label="Type">{cat.label}</Row>
      {node.moduleId && <Row label="Module / repository"><span className="font-mono">{node.moduleId}</span></Row>}
      {node.status && <Row label="Status">{humanize(node.status)}</Row>}
      {node.purpose && <Row label="Purpose">{node.purpose}</Row>}

      {technical.length > 0 && (
        <Row label="Relationships">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {technical.map((n, i) => <LinkButton key={i} onClick={() => onSelectNode(n.id)}>{n.rel} {n.label}</LinkButton>)}
          </div>
        </Row>
      )}

      {knowledge.length > 0 && (
        <Row label="Knowledge context">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {knowledge.map((n, i) => <LinkButton key={i} onClick={() => onSelectNode(n.id)}>{n.rel} {n.label}</LinkButton>)}
          </div>
        </Row>
      )}

      {delivery.length > 0 && (
        <Row label="Delivery history">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {delivery.map((n, i) => <LinkButton key={i} onClick={() => onSelectNode(n.id)}>{n.rel} {n.label}</LinkButton>)}
          </div>
        </Row>
      )}

      {implementation.length > 0 && (
        <Row label="Implementation">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {implementation.map((n, i) => <span key={i} className="font-mono" style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>{n.label}</span>)}
          </div>
        </Row>
      )}

      {(node.knowledgeRef || (node.knowledgeRefs && node.knowledgeRefs.length > 0)) && (
        <Row label="Knowledge">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {node.knowledgeRef && (
              <LinkButton onClick={() => router.navigate({ to: '/knowledge/$layer/$artifactId', params: { layer: node.knowledgeRef!.layer, artifactId: node.knowledgeRef!.id } })}>
                {humanize(node.knowledgeRef.layer)} / {node.knowledgeRef.id} →
              </LinkButton>
            )}
            {(node.knowledgeRefs ?? []).map((k) => (
              <LinkButton key={k.id} onClick={() => router.navigate({ to: '/knowledge/$layer/$artifactId', params: { layer: k.layer, artifactId: k.id } })}>
                {humanize(k.layer)} / {k.id} →
              </LinkButton>
            ))}
          </div>
        </Row>
      )}

      {node.provenance && (
        <Row label="Provenance">
          {humanize(node.provenance)}
          {node.evidence && node.evidence.length > 0 && (
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--foreground-muted)', marginTop: 4 }}>
              {node.evidence.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
        </Row>
      )}

      {node.workItemRef && (
        <Row label="Related Work Item">
          <LinkButton onClick={() => router.navigate({ to: '/work-items/$workItemId', params: { workItemId: node.workItemRef! } })}>{node.workItemRef} →</LinkButton>
        </Row>
      )}

      {node.path && <Row label="Path"><ArtifactPath path={node.path} /></Row>}
    </div>
  )
}

function EdgeDetails({ edge, nodeById }: { edge: SystemMapRelationship; nodeById: Map<string, SystemMapNode> }) {
  const source = nodeById.get(edge.source)
  const target = nodeById.get(edge.target)
  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Relationship</h2>
      <Row label="From">{source?.label ?? edge.source}</Row>
      <Row label="To">{target?.label ?? edge.target}</Row>
      <Row label="Type">{edge.label}</Row>
      {source?.moduleId && <Row label="Source module"><span className="font-mono">{source.moduleId}</span></Row>}
      {target?.moduleId && <Row label="Target module"><span className="font-mono">{target.moduleId}</span></Row>}
    </div>
  )
}
