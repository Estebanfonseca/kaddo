import type { AcceptanceCriterion } from '../lib/api'

type Props = {
  criteria: AcceptanceCriterion[]
  /** True when the Work Item lifecycle is Completed — enables the evidence-context note. */
  completed?: boolean
}

/**
 * Acceptance criteria. Distinguishes criterion definition from acceptance evidence.
 *
 * When a Work Item is Completed but no criterion carries recorded evidence (a valid state for
 * items closed before Kaddo tracked per-criterion evidence), Admin explains the missing evidence
 * — it never reinterprets a pending criterion as an incomplete Work Item. Lifecycle status and
 * acceptance-evidence status are independent dimensions.
 */
export function AcceptanceCriteria({ criteria, completed = false }: Props) {
  const anyVerified = criteria.some((c) => c.checked === true)
  const evidenceNotRecorded = completed && !anyVerified

  return (
    <div>
      {evidenceNotRecorded && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: 3 }}>Evidence status</div>
          <div style={{ fontSize: 14, color: 'var(--foreground)' }}>Not recorded</div>
          <p style={{ fontSize: 13, color: 'var(--foreground-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
            This Work Item is completed, but individual criterion evidence was not recorded.
          </p>
        </div>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {criteria.map((c, i) => {
          // When evidence is not recorded, render neutral markers — never a "pending" verdict.
          const showState = !evidenceNotRecorded && c.checked !== null
          const marker = evidenceNotRecorded ? '○' : c.checked === true ? '✓' : c.checked === false ? '○' : '•'
          const color = c.checked === true && !evidenceNotRecorded ? 'var(--success)' : 'var(--foreground-muted)'
          return (
            <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.5 }}>
              <span aria-hidden style={{ color, fontWeight: 700, flexShrink: 0 }}>{marker}</span>
              <span style={{ color: 'var(--foreground)' }}>
                {c.text}
                {showState && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--foreground-muted)' }}>
                    ({c.checked ? 'verified' : 'pending'})
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
