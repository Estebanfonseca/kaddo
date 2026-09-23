import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { api } from '../lib/api'
import type { IntegrationSummary, ExternalWorkItem, ImportPreviewResult } from '../lib/api'

// Integration foundation surface (VS-102). Read-first: list integrations, verify status, browse
// external work items. Import is explicit and human-confirmed — it previews first, requires a Kaddo
// type (never inferred), and only then creates a canonical Draft. No secrets are ever shown.

const STATUS_TONE: Record<string, string> = {
  available: 'var(--success)', configured: 'var(--foreground-muted)', unauthorized: 'var(--danger)',
  unavailable: 'var(--warning)', 'invalid-config': 'var(--danger)', disabled: 'var(--foreground-muted)',
}
function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--foreground)' }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 8, background: STATUS_TONE[status] ?? 'var(--foreground-muted)' }} />{status}
    </span>
  )
}

function Cap({ on, label }: { on: boolean; label: string }) {
  return <span style={{ fontSize: 12, color: on ? 'var(--foreground)' : 'var(--foreground-muted)' }}>{on ? '✓' : '✗'} {label}</span>
}

function ImportPanel({ integrationId, item, onClose }: { integrationId: string; item: ExternalWorkItem; onClose: () => void }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [type, setType] = useState('')
  const { data: types } = useQuery({ queryKey: ['capture-def'], queryFn: () => api.getCaptureDefinition() })
  const { data: preview, isLoading } = useQuery<ImportPreviewResult>({
    queryKey: ['import-preview', integrationId, item.externalId],
    queryFn: () => api.getImportPreview(integrationId, item.externalId),
    retry: false,
  })
  const doImport = useMutation({
    mutationFn: () => api.importExternalWorkItem(integrationId, item.externalId, type),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['import-preview', integrationId, item.externalId] })
      router.navigate({ to: '/work-items/$workItemId', params: { workItemId: res.workItemId } })
    },
  })

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginTop: 10, background: 'var(--surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--foreground-muted)', margin: 0 }}>Import work item</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-muted)', fontSize: 13 }}>✕</button>
      </div>
      {isLoading && <p style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>Loading preview…</p>}
      {preview?.duplicate ? (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 14 }}>Already imported as <strong className="font-mono">{preview.duplicate.workItemId}</strong> — “{preview.duplicate.title}”.</p>
          <button
            onClick={() => router.navigate({ to: '/work-items/$workItemId', params: { workItemId: preview.duplicate!.workItemId } })}
            style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 13 }}
          >
            View Work Item
          </button>
        </div>
      ) : preview ? (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13 }}><span style={{ color: 'var(--foreground-muted)' }}>Source:</span> {preview.preview.source.provider} · {preview.preview.source.externalId}</div>
          <div style={{ fontSize: 13 }}><span style={{ color: 'var(--foreground-muted)' }}>Captured intent:</span> {preview.preview.capturedIntent}</div>
          <div style={{ fontSize: 13 }}><span style={{ color: 'var(--foreground-muted)' }}>Will create:</span> a Draft Work Item (needs refinement)</div>
          {preview.preview.externalType && (
            <div style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>External type “{preview.preview.externalType}” — choose the Kaddo type explicitly (never inferred):</div>
          )}
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Kaddo Work Item type" style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: 13, fontFamily: 'inherit', alignSelf: 'flex-start' }}>
            <option value="">Choose Kaddo Work Item type…</option>
            {(types?.types ?? []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <p style={{ fontSize: 12, color: 'var(--foreground-muted)', margin: 0 }}>No project files have been modified yet.</p>
          <div>
            <button
              disabled={!type || doImport.isPending}
              onClick={() => doImport.mutate()}
              style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: type ? 'var(--primary)' : 'var(--surface-muted)', color: type ? 'var(--primary-foreground, #fff)' : 'var(--foreground-muted)', cursor: type ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
            >
              {doImport.isPending ? 'Importing…' : 'Import as Draft'}
            </button>
          </div>
          {doImport.isError && <p style={{ fontSize: 12, color: 'var(--danger)' }}>{(doImport.error as Error).message}</p>}
        </div>
      ) : null}
    </div>
  )
}

function IntegrationCard({ integration }: { integration: IntegrationSummary }) {
  const [open, setOpen] = useState(false)
  const [importing, setImporting] = useState<ExternalWorkItem | null>(null)
  const canBrowse = integration.status !== 'disabled' && integration.status !== 'invalid-config' && integration.capabilities?.workItems.list
  const status = useQuery({ queryKey: ['integration-status', integration.id], queryFn: () => api.getIntegrationStatus(integration.id), enabled: canBrowse, retry: false })
  const items = useQuery({ queryKey: ['external-items', integration.id], queryFn: () => api.getExternalWorkItems(integration.id), enabled: open && Boolean(canBrowse), retry: false })

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 12, background: 'var(--surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{integration.displayName} <span className="font-mono" style={{ fontSize: 12, color: 'var(--foreground-muted)', fontWeight: 400 }}>· {integration.id}</span></div>
          <div style={{ marginTop: 4, display: 'flex', gap: 12, alignItems: 'center' }}>
            <StatusBadge status={status.data?.status ?? integration.status} />
            {integration.capabilities && (
              <span style={{ display: 'inline-flex', gap: 10 }}>
                <Cap on={integration.capabilities.workItems.read} label="Read" />
                <Cap on={integration.capabilities.workItems.list} label="List" />
                <Cap on={integration.capabilities.workItems.import} label="Import" />
              </span>
            )}
          </div>
        </div>
        {canBrowse && (
          <button onClick={() => setOpen((o) => !o)} style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            {open ? 'Hide work items' : 'Browse work items'}
          </button>
        )}
      </div>

      {integration.findings.map((f, i) => (
        <p key={i} style={{ fontSize: 12, color: f.level === 'blocking' ? 'var(--danger)' : 'var(--warning)', margin: '6px 0 0' }}>[{f.level}] {f.message}</p>
      ))}

      {open && canBrowse && (
        <div style={{ marginTop: 12 }}>
          {items.isLoading && <p style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>Loading…</p>}
          {items.isError && <p style={{ fontSize: 13, color: 'var(--danger)' }}>{(items.error as Error).message}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.data?.items.map((it) => (
              <div key={it.externalId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div>
                  <span className="font-mono" style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>{it.externalId}</span>{' '}
                  <span style={{ fontSize: 14 }}>{it.title}</span>
                  {it.status && <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}> · {it.status}</span>}
                </div>
                {integration.capabilities?.workItems.import && (
                  <button onClick={() => setImporting(it)} style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Import</button>
                )}
              </div>
            ))}
          </div>
          {importing && <ImportPanel integrationId={integration.id} item={importing} onClose={() => setImporting(null)} />}
        </div>
      )}
    </div>
  )
}

export function Integrations() {
  const { data, isLoading, error } = useQuery({ queryKey: ['integrations'], queryFn: () => api.getIntegrations(), retry: false })

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Integrations</h2>
      <p style={{ fontSize: 14, color: 'var(--foreground-muted)', margin: '0 0 20px' }}>
        Connect Kaddo to external work systems. External items can originate work; the Kaddo Work Item
        stays the source of truth. Reading never imports — import is explicit and creates a Draft.
      </p>
      {isLoading && <p style={{ color: 'var(--foreground-muted)' }}>Loading…</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{(error as Error).message}</p>}
      {data && data.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--foreground-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔌</div>
          <p style={{ fontSize: 14, margin: 0 }}>No integrations are configured. Declare them in <span className="font-mono">.kaddo/integrations.yml</span>.</p>
        </div>
      )}
      {data?.map((i) => <IntegrationCard key={i.id} integration={i} />)}
    </div>
  )
}
