import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { KnowledgeArtifactSummary } from '../../lib/api'

type Props = {
  decisions: string[]
  relatedKnowledge: string[]
  onDecisions: (ids: string[]) => void
  onRelatedKnowledge: (ids: string[]) => void
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

function Checklist({ artifacts, selected, onToggle, emptyLabel }: {
  artifacts: KnowledgeArtifactSummary[]; selected: string[]; onToggle: (id: string) => void; emptyLabel: string
}) {
  if (artifacts.length === 0) return <p style={{ fontSize: 13, color: 'var(--foreground-muted)', margin: 0 }}>{emptyLabel}</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {artifacts.map((a) => (
        <label key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={selected.includes(a.id)} onChange={() => onToggle(a.id)} />
          <span><span className="font-mono" style={{ fontWeight: 600 }}>{a.id}</span> — {a.title}</span>
        </label>
      ))}
    </div>
  )
}

/** Select linked ADRs and related Knowledge from artifacts Core already knows — never arbitrary paths. */
export function RelationshipSelector({ decisions, relatedKnowledge, onDecisions, onRelatedKnowledge }: Props) {
  const { data } = useQuery({ queryKey: ['knowledge-inventory'], queryFn: api.getKnowledgeInventory })
  const artifacts = (data?.layers ?? []).flatMap((l) => l.artifacts)
  const adrs = artifacts.filter((a) => a.type === 'adr' || /^adr-/i.test(a.id))
  const knowledge = artifacts.filter((a) => !(a.type === 'adr' || /^adr-/i.test(a.id)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Linked decisions</div>
        <Checklist artifacts={adrs} selected={decisions} onToggle={(id) => onDecisions(toggle(decisions, id))} emptyLabel="No decisions recorded in this project." />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Related Knowledge</div>
        <Checklist artifacts={knowledge} selected={relatedKnowledge} onToggle={(id) => onRelatedKnowledge(toggle(relatedKnowledge, id))} emptyLabel="No knowledge artifacts available." />
      </div>
    </div>
  )
}
