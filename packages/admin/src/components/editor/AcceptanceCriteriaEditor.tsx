import type { AcceptanceCriterion } from '../../lib/api'
import { inputStyle } from './primitives'

type Props = { criteria: AcceptanceCriterion[]; onChange: (criteria: AcceptanceCriterion[]) => void }

/**
 * Acceptance criteria editor. VS-099 edits criterion DEFINITIONS; it preserves any existing
 * verified/pending state loaded from the artifact but does not let the user assert execution
 * evidence here (definition ≠ execution evidence).
 */
export function AcceptanceCriteriaEditor({ criteria, onChange }: Props) {
  const set = (i: number, text: string) => onChange(criteria.map((c, idx) => (idx === i ? { ...c, text } : c)))
  const remove = (i: number) => onChange(criteria.filter((_, idx) => idx !== i))
  const add = () => onChange([...criteria, { text: '', checked: null }])

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {criteria.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={c.text}
              placeholder="A visitor can start registration from the public page."
              aria-label={`Acceptance criterion ${i + 1}`}
              onChange={(e) => set(i, e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            {c.checked !== null && (
              <span style={{ fontSize: 12, color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>{c.checked ? 'verified' : 'pending'}</span>
            )}
            <button onClick={() => remove(i)} aria-label={`Remove criterion ${i + 1}`} style={{ flexShrink: 0, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--foreground-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Remove</button>
          </div>
        ))}
      </div>
      <button onClick={add} style={{ marginTop: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', fontFamily: 'inherit', fontSize: 13 }}>+ Add criterion</button>
    </div>
  )
}
