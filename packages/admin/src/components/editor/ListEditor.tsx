import { inputStyle } from './primitives'

type Props = {
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  addLabel?: string
  ariaLabel?: string
}

/** Add / edit / remove a list of short text entries (scope unknowns, confidence reasons). */
export function ListEditor({ items, onChange, placeholder, addLabel = '+ Add', ariaLabel = 'List item' }: Props) {
  const set = (i: number, v: string) => onChange(items.map((x, idx) => (idx === i ? v : x)))
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const add = () => onChange([...items, ''])

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={item}
              placeholder={placeholder}
              aria-label={`${ariaLabel} ${i + 1}`}
              onChange={(e) => set(i, e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={() => remove(i)}
              aria-label={`Remove ${ariaLabel} ${i + 1}`}
              style={{ flexShrink: 0, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--foreground-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        style={{ marginTop: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', fontFamily: 'inherit', fontSize: 13 }}
      >
        {addLabel}
      </button>
    </div>
  )
}
