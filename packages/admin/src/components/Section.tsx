import type { ReactNode } from 'react'

/** A titled content block used across the Work Item detail screen. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h3 style={{
        fontSize: 12, fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase',
        letterSpacing: 0.4, margin: '0 0 12px',
      }}>
        {title}
      </h3>
      {children}
    </section>
  )
}

/** A label/value pair for prose fields (Actor, Current behavior, …). */
export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--foreground)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{value}</div>
    </div>
  )
}
