import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../lib/api'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Labeled, SelectField, PrimaryButton } from '../components/editor/primitives'

const TYPES = [
  { value: 'feature', label: 'Feature' },
  { value: 'bugfix', label: 'Bug fix' },
  { value: 'hotfix', label: 'Hotfix' },
  { value: 'spike', label: 'Spike' },
  { value: 'chore', label: 'Chore' },
  { value: 'refactor', label: 'Refactor' },
]

export function WorkItemNew() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [intent, setIntent] = useState('')
  const [type, setType] = useState('feature')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const create = async () => {
    if (!intent.trim() || busy) return
    setBusy(true); setError(null)
    try {
      const res = await api.createWorkItem(intent.trim(), type)
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
      router.navigate({ to: '/work-items/$workItemId/edit', params: { workItemId: res.id } })
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
        Start with what needs to change. You'll refine the scope next; the Work Item begins as a Draft.
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

      <SelectField id="wi-type" label="Type" value={type} onChange={setType} options={TYPES} />

      {error && (
        <div style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PrimaryButton onClick={create} disabled={!intent.trim() || busy}>{busy ? 'Creating…' : 'Create draft'}</PrimaryButton>
      </div>
    </div>
  )
}
