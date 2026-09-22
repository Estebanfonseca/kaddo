import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../lib/api'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Labeled, SelectField, PrimaryButton } from '../components/editor/primitives'

export function WorkItemNew() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: capture } = useQuery({ queryKey: ['work-items-capture'], queryFn: api.getCaptureDefinition })

  const [intent, setIntent] = useState('')
  const [type, setType] = useState('feature')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const types = capture?.types ?? [{ value: 'feature', label: 'Feature' }]
  const questions = capture?.questions[type] ?? []

  const create = async () => {
    if (!intent.trim() || busy) return
    setBusy(true); setError(null)
    try {
      const res = await api.createWorkItem(intent.trim(), type, answers)
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
      // Land on the refine screen — the captured intent is meant to be refined next.
      router.navigate({ to: '/work-items/$workItemId/refine', params: { workItemId: res.id } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The Work Item could not be created.')
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 720, margin: '0 auto' }}>
      <Breadcrumbs crumbs={[{ label: 'Work Items', path: '/work-items' }, { label: 'New' }]} />
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Create Work Item</h2>
      <p style={{ fontSize: 14, color: 'var(--foreground-muted)', margin: '0 0 24px' }}>
        Capture what needs to change in your own words. The Work Item starts as a Draft — you refine the scope with AI next.
      </p>

      <Labeled label="What needs to change?" htmlFor="wi-intent">
        <textarea
          id="wi-intent"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          rows={3}
          placeholder="Enable regular registration after the beta."
          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: 15, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
        />
      </Labeled>

      <SelectField id="wi-type" label="Type" value={type} onChange={(v) => { setType(v); setAnswers({}) }} options={types} />

      {/* CLI-parity capture questions — free text, from Kaddo Core (not a structured schema). */}
      {questions.map((q) => (
        <Labeled key={q.id} label={q.prompt} htmlFor={`cap-${q.id}`}>
          <textarea
            id={`cap-${q.id}`}
            value={answers[q.field] ?? ''}
            onChange={(e) => setAnswers((a) => ({ ...a, [q.field]: e.target.value }))}
            rows={q.field === 'acceptance_criteria' ? 3 : 2}
            placeholder={q.placeholder}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
          />
        </Labeled>
      ))}

      {error && (
        <div style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 16, fontSize: 14 }}>{error}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PrimaryButton onClick={create} disabled={!intent.trim() || busy}>{busy ? 'Creating…' : 'Create draft'}</PrimaryButton>
      </div>
    </div>
  )
}
