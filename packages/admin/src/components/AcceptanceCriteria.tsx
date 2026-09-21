import type { AcceptanceCriterion } from '../lib/api'

/**
 * Acceptance criteria. Distinguishes criterion definition from execution evidence:
 * when the model records no per-criterion state, criteria render as plain bullets
 * — Admin never invents a checked/unchecked state.
 */
export function AcceptanceCriteria({ criteria }: { criteria: AcceptanceCriterion[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {criteria.map((c, i) => {
        const marker = c.checked === true ? '✓' : c.checked === false ? '○' : '•'
        const color = c.checked === true ? 'var(--success)' : c.checked === false ? 'var(--foreground-muted)' : 'var(--foreground-muted)'
        return (
          <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.5 }}>
            <span aria-hidden style={{ color, fontWeight: 700, flexShrink: 0 }}>{marker}</span>
            <span style={{ color: 'var(--foreground)' }}>
              {c.text}
              {c.checked !== null && (
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--foreground-muted)' }}>
                  ({c.checked ? 'met' : 'pending'})
                </span>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
