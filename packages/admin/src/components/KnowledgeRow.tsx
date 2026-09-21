import { KnowledgeStatus } from './KnowledgeStatus'

type Props = {
  layer: string
  status: string
}

export function KnowledgeRow({ layer, status }: Props) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: 14,
      padding: '4px 0',
    }}>
      <span>{layer}</span>
      <KnowledgeStatus status={status} />
    </div>
  )
}
