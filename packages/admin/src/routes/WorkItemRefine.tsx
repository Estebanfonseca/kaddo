import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from '@tanstack/react-router'
import { api, ApiError } from '../lib/api'
import type { RefinementSession, RefinementProposal } from '../lib/api'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { WorkItemStatus } from '../components/WorkItemStatus'
import { Section, Field } from '../components/Section'
import { ModuleCoverage } from '../components/ModuleCoverage'
import { ImpactAnalysis } from '../components/ImpactAnalysis'
import { AcceptanceCriteria } from '../components/AcceptanceCriteria'
import { ScopeConfidence } from '../components/ScopeConfidence'
import { ValidationPanel } from '../components/editor/ValidationPanel'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StatusBadge } from '../components/StatusBadge'
import { PrimaryButton, SecondaryButton } from '../components/editor/primitives'

const PHASES = ['Preparing project context…', 'Analyzing current behavior…', 'Evaluating affected modules…', 'Building refinement proposal…', 'Validating proposal…']

function ProposalView({ proposal }: { proposal: RefinementProposal }) {
  const o = proposal.outcome ?? {}
  const j = proposal.journey ?? {}
  return (
    <div>
      {(o.actor || o.observableOutcome || o.currentBehavior || o.targetBehavior) && (
        <Section title="Outcome">
          {o.actor && <Field label="Actor" value={o.actor} />}
          {o.observableOutcome && <Field label="Observable outcome" value={o.observableOutcome} />}
          {o.currentBehavior && <Field label="Current behavior" value={o.currentBehavior} />}
          {o.targetBehavior && <Field label="Target behavior" value={o.targetBehavior} />}
        </Section>
      )}
      {(j.entryPoints?.length || j.flow?.length) && (
        <Section title="Journey">
          {j.entryPoints?.length ? <Field label="Entry points" value={j.entryPoints.join(', ')} /> : null}
          {j.flow?.length ? <Field label="End-to-end flow" value={j.flow.join('  →  ')} /> : null}
        </Section>
      )}
      {proposal.affectedModules?.length ? (
        <Section title="Affected modules">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {proposal.affectedModules.map((m) => <span key={m} className="font-mono" style={{ fontSize: 13, padding: '3px 10px', borderRadius: 'var(--radius)', background: 'var(--surface-muted)' }}>{m}</span>)}
          </div>
        </Section>
      ) : null}
      {proposal.moduleCoverage?.length ? <Section title="Module coverage"><ModuleCoverage entries={proposal.moduleCoverage} /></Section> : null}
      {proposal.impactAnalysis?.length ? <Section title="Impact analysis"><ImpactAnalysis entries={proposal.impactAnalysis} /></Section> : null}
      {proposal.scopeConfidence ? <Section title="Scope confidence"><ScopeConfidence level={proposal.scopeConfidence.level} reasons={proposal.scopeConfidence.reasons ?? []} /></Section> : null}
      {proposal.scopeUnknowns?.length ? (
        <Section title="Open scope questions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {proposal.scopeUnknowns.map((u, i) => <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14 }}><span aria-hidden style={{ color: 'var(--warning)' }}>⚠</span><span>{u}</span></div>)}
          </div>
        </Section>
      ) : null}
      {proposal.acceptanceCriteria?.length ? <Section title="Acceptance criteria"><AcceptanceCriteria criteria={proposal.acceptanceCriteria.map((t) => ({ text: t, checked: null }))} /></Section> : null}
      {proposal.linkedDecisions?.length ? (
        <Section title="Linked decisions">{proposal.linkedDecisions.map((d) => <div key={d} className="font-mono" style={{ fontSize: 13 }}>{d}</div>)}</Section>
      ) : null}
    </div>
  )
}

export function WorkItemRefine() {
  const { workItemId } = useParams({ from: '/work-items/$workItemId/refine' })
  const router = useRouter()
  const queryClient = useQueryClient()
  const editQuery = useQuery({ queryKey: ['work-item-edit', workItemId], queryFn: () => api.getWorkItemEdit(workItemId), refetchOnWindowFocus: false, retry: false })

  const [phase, setPhase] = useState<'idle' | 'running' | 'review' | 'applied'>('idle')
  const [session, setSession] = useState<RefinementSession | null>(null)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<null | 'apply' | 'reopen'>(null)
  const [applied, setApplied] = useState<{ affectedModules: string[]; confidence?: string; unknowns: number } | null>(null)

  const run = async (fn: () => Promise<RefinementSession>) => {
    setPhase('running'); setError(null)
    try {
      setSession(await fn())
      setPhase('review')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Refinement could not be completed. Your Work Item has not been modified.')
      setPhase('idle')
    }
  }

  const apply = async () => {
    if (!session) return
    setDialog(null)
    try {
      await api.applyRefinement(workItemId, session.refinementId, session.sourceRevision)
      setApplied({ affectedModules: session.proposal.affectedModules ?? [], confidence: session.proposal.scopeConfidence?.level, unknowns: session.proposal.scopeUnknowns?.length ?? 0 })
      setPhase('applied')
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
      queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409
        ? 'This Work Item changed while the refinement was running. The proposal has not been applied. Run refinement again using the latest version.'
        : err instanceof ApiError ? err.message : 'The refinement could not be applied.')
    }
  }

  const reopen = async () => {
    setDialog(null)
    try {
      await api.transitionDraft(workItemId, editQuery.data!.revision)
      await editQuery.refetch()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The Work Item could not be reopened.')
    }
  }

  if (editQuery.isLoading) return <div style={{ padding: 24 }}>Loading…</div>
  if (editQuery.error) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: 820, margin: '0 auto' }}>
        <Breadcrumbs crumbs={[{ label: 'Work Items', path: '/work-items' }, { label: workItemId }]} />
        <p style={{ fontSize: 14, color: 'var(--foreground-muted)' }}>{(editQuery.error as Error).message}</p>
      </div>
    )
  }
  const data = editQuery.data!

  return (
    <div style={{ padding: '24px 32px', maxWidth: 820, margin: '0 auto', paddingBottom: 48 }}>
      <Breadcrumbs crumbs={[{ label: 'Work Items', path: '/work-items' }, { label: data.id, path: `/work-items/${data.id}` }, { label: 'Refine' }]} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground-muted)' }}>{data.id}</span>
        <WorkItemStatus status={data.status} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 12px' }}>{data.title}</h2>

      {error && (
        <div role="alert" style={{ margin: '0 0 16px', padding: 12, borderRadius: 'var(--radius)', fontSize: 14, background: 'color-mix(in srgb, var(--danger) 12%, transparent)', border: '1px solid var(--danger)' }}>
          {error} {phase === 'idle' && session === null && <button onClick={() => run(() => api.startRefinement(workItemId))} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Retry</button>}
        </div>
      )}

      {/* Non-draft: refinement is not available until reopened. */}
      {data.status !== 'draft' ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <p style={{ fontSize: 14, marginTop: 0 }}>{data.editableReason ?? `A ${data.status} Work Item cannot be refined.`}</p>
          {data.status === 'ready' && <PrimaryButton onClick={() => setDialog('reopen')}>Reopen as Draft</PrimaryButton>}
        </div>
      ) : phase === 'applied' && applied ? (
        <div style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)', border: '1px solid var(--success)', borderRadius: 'var(--radius)', padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Refinement applied</h3>
          <p style={{ fontSize: 14, margin: '0 0 12px' }}>{data.id} remains Draft.</p>
          <div style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            {applied.confidence && <div>Scope confidence: <strong>{applied.confidence}</strong></div>}
            <div>Affected modules: <strong>{applied.affectedModules.join(', ') || 'none'}</strong></div>
            {applied.unknowns > 0 && <div>{applied.unknowns} open scope question{applied.unknowns !== 1 ? 's' : ''}</div>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <PrimaryButton onClick={() => router.navigate({ to: '/work-items/$workItemId', params: { workItemId } })}>View Work Item</PrimaryButton>
            <SecondaryButton onClick={() => router.navigate({ to: '/work-items/$workItemId/edit', params: { workItemId } })}>Edit &amp; Validate</SecondaryButton>
          </div>
        </div>
      ) : phase === 'running' ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>Refining Work Item</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PHASES.map((p) => <div key={p} style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>{p}</div>)}
          </div>
          <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 14 }}>This does not modify the Work Item.</p>
        </div>
      ) : phase === 'review' && session ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--foreground-muted)', margin: 0 }}>AI refinement proposal</h3>
            <StatusBadge variant="warning">Not applied</StatusBadge>
          </div>
          {session.contextUsed.length > 0 && (
            <p style={{ fontSize: 12, color: 'var(--foreground-muted)', margin: '0 0 8px' }}>
              Context used: {session.contextUsed.map((c) => `${c.layer}/${c.title}`).join(' · ')}
            </p>
          )}
          <ProposalView proposal={session.proposal} />

          <div style={{ marginTop: 24 }}>
            <ValidationPanel result={{ findings: session.validation.findings, canMarkReady: session.validation.canApply }} />
          </div>

          <Section title="Need adjustments?">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              aria-label="Refinement feedback"
              placeholder="The frontend registration page is also affected. Review the public CTA and beta messaging."
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
            />
          </Section>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap' }}>
            <SecondaryButton onClick={() => { setSession(null); setPhase('idle'); setFeedback('') }}>Discard</SecondaryButton>
            <SecondaryButton onClick={() => run(() => api.refinementFeedback(workItemId, session.refinementId, feedback.trim()))} disabled={!feedback.trim()}>Refine again</SecondaryButton>
            <PrimaryButton onClick={() => setDialog('apply')}>Apply refinement</PrimaryButton>
          </div>
        </div>
      ) : (
        // idle
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--foreground-muted)', margin: '0 0 8px' }}>Captured intent</h3>
          <p style={{ fontSize: 15, margin: '0 0 6px' }}>{data.summary || data.title}</p>
          <p style={{ fontSize: 13, color: 'var(--foreground-muted)', margin: '0 0 16px' }}>Work Item refinement has not been performed yet.</p>
          <PrimaryButton onClick={() => run(() => api.startRefinement(workItemId))}>Refine with AI</PrimaryButton>
        </div>
      )}

      {dialog === 'apply' && (
        <ConfirmDialog title={`Apply this refinement to ${data.id}?`} confirmLabel="Apply refinement" onCancel={() => setDialog(null)} onConfirm={apply}>
          The proposal will update the Work Item artifact. The Work Item will remain Draft. No Git commit will be created.
        </ConfirmDialog>
      )}
      {dialog === 'reopen' && (
        <ConfirmDialog title="Reopen as Draft?" confirmLabel="Reopen as Draft" onCancel={() => setDialog(null)} onConfirm={reopen}>
          This Work Item is Ready. Reopen it as Draft to refine its scope.
        </ConfirmDialog>
      )}
    </div>
  )
}
