import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

function fakeStorage() {
  const sessions = new Map<string, { id: string; createdAt: string; expiresAt: string }>()
  const prefs = new Map<string, string>()
  const cache = new Map<string, { value: string; expiresAt: string | null }>()
  return {
    initialize: async () => {}, close: async () => {},
    sessions: {
      create: (s: { id: string; createdAt: string; expiresAt: string }) => { sessions.set(s.id, s) },
      findById: (id: string) => sessions.get(id),
      deleteById: (id: string) => { sessions.delete(id) }, deleteExpired: () => {},
    },
    preferences: { get: (k: string) => prefs.get(k), set: (k: string, v: string) => { prefs.set(k, v) }, delete: (k: string) => { prefs.delete(k) }, all: () => [] },
    cache: { get: (k: string) => cache.get(k)?.value, set: (k: string, v: string) => { cache.set(k, { value: v, expiresAt: null }) }, delete: (k: string) => { cache.delete(k) }, clear: () => { cache.clear() } },
  }
}

const HOST = '127.0.0.1'; const PORT = 4173; const ORIGIN = `http://${HOST}:${PORT}`

function write(dir: string, rel: string, content: string) {
  const full = path.join(dir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf-8')
}

async function boot(dir: string) {
  write(dir, '.kaddo/config.yml', ['project:', '  name: r1', '  state: pre-ai', '  structure: multirepo', 'team:', '  size: small'].join('\n'))
  write(dir, '.kaddo/modules.yml', ['modules:', '  - id: frontend', '    path: ../frontend', '    role: module'].join('\n'))
  const { createAdminServer } = await import('../../admin-server/src/server.js')
  const server = await createAdminServer({ projectDir: dir, storage: fakeStorage() as never, host: HOST, port: PORT })
  const app = server.app
  await app.ready()
  const sess = await app.inject({ method: 'GET', url: '/api/v1/admin/session' })
  const cookie = sess.headers['set-cookie'] as string
  return { app, headers: { cookie: Array.isArray(cookie) ? cookie[0] : cookie, origin: ORIGIN } }
}

describe('VS-099.1: capture parity + refinement flow', () => {
  let dir: string
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaddo-r1-')) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('exposes the CLI capture definition and creates with answers', async () => {
    const { app, headers } = await boot(dir)
    const cap = await app.inject({ method: 'GET', url: '/api/v1/admin/work-items-capture', headers })
    expect(cap.statusCode).toBe(200)
    expect(cap.json().questions.feature.map((q: { field: string }) => q.field)).toContain('acceptance_criteria')

    const created = await app.inject({ method: 'POST', url: '/api/v1/admin/work-items', headers, payload: { intent: 'Add saved searches', type: 'feature', answers: { problem: 'Users cannot save searches.' } } })
    expect(created.statusCode).toBe(200)
    const raw = fs.readFileSync(path.join(dir, `knowledge/delivery/work-items/draft/${created.json().id}-add-saved-searches.md`), 'utf-8')
    expect(raw).toContain('Users cannot save searches.')
    await app.close()
  })

  it('runs refinement, iterates on feedback, and applies through Core (stays Draft)', async () => {
    const { app, headers } = await boot(dir)
    const created = await app.inject({ method: 'POST', url: '/api/v1/admin/work-items', headers, payload: { intent: 'Enable regular registration after the beta', type: 'feature' } })
    const id = created.json().id

    // Start — structured proposal, Work Item unchanged.
    const startRes = await app.inject({ method: 'POST', url: `/api/v1/admin/work-items/${id}/refinement`, headers })
    expect(startRes.statusCode).toBe(200)
    const s1 = startRes.json()
    expect(s1.status).toBe('ready-for-review')
    expect(s1.proposal.outcome.targetBehavior).toBeTruthy()
    expect(s1.proposal.affectedModules).toContain('core')
    expect(s1.proposal.affectedModules).not.toContain('frontend') // conservative first pass
    expect(s1.validation).toBeDefined()
    // Provider metadata carries no secret.
    expect(JSON.stringify(s1)).not.toMatch(/api[_-]?key/i)

    // The Work Item was not modified by refinement.
    const beforeApply = await app.inject({ method: 'GET', url: `/api/v1/admin/work-items/${id}`, headers })
    expect(beforeApply.json().affectedModules).toEqual([])

    // Feedback adds frontend.
    const fb = await app.inject({ method: 'POST', url: `/api/v1/admin/work-items/${id}/refinement/feedback`, headers, payload: { refinementId: s1.refinementId, feedback: 'Review the frontend. The public registration page still shows beta messaging.' } })
    expect(fb.statusCode).toBe(200)
    const s2 = fb.json()
    expect(s2.proposal.affectedModules).toContain('frontend')

    // Apply — writes through Core; lifecycle stays draft.
    const apply = await app.inject({ method: 'POST', url: `/api/v1/admin/work-items/${id}/refinement/apply`, headers, payload: { refinementId: s2.refinementId, expectedRevision: s2.sourceRevision } })
    expect(apply.statusCode).toBe(200)
    expect(apply.json().status).toBe('draft')

    const afterApply = await app.inject({ method: 'GET', url: `/api/v1/admin/work-items/${id}`, headers })
    expect(afterApply.json().affectedModules).toEqual(expect.arrayContaining(['core', 'frontend']))
    expect(afterApply.json().status).toBe('draft') // apply never promotes to ready
    await app.close()
  })

  it('marks the proposal stale and refuses to apply after an external change', async () => {
    const { app, headers } = await boot(dir)
    const created = await app.inject({ method: 'POST', url: '/api/v1/admin/work-items', headers, payload: { intent: 'X', type: 'feature' } })
    const id = created.json().id
    const start = (await app.inject({ method: 'POST', url: `/api/v1/admin/work-items/${id}/refinement`, headers })).json()

    // External modification.
    const filePath = path.join(dir, `knowledge/delivery/work-items/draft/${id}-x.md`)
    fs.writeFileSync(filePath, fs.readFileSync(filePath, 'utf-8') + '\n<!-- external -->\n', 'utf-8')

    const apply = await app.inject({ method: 'POST', url: `/api/v1/admin/work-items/${id}/refinement/apply`, headers, payload: { refinementId: start.refinementId, expectedRevision: start.sourceRevision } })
    expect(apply.statusCode).toBe(409)
    expect(apply.json().error.code).toBe('WORK_ITEM_CONFLICT')
    expect(fs.readFileSync(filePath, 'utf-8')).toContain('external') // not overwritten
    await app.close()
  })

  it('refuses to refine a non-draft Work Item', async () => {
    const { app, headers } = await boot(dir)
    const created = await app.inject({ method: 'POST', url: '/api/v1/admin/work-items', headers, payload: { intent: 'X', type: 'feature' } })
    const id = created.json().id
    const edit = (await app.inject({ method: 'GET', url: `/api/v1/admin/work-items/${id}/edit`, headers })).json()
    // Make it ready (a bare draft has only warnings, no blocking).
    const ready = await app.inject({ method: 'POST', url: `/api/v1/admin/work-items/${id}/transitions/ready`, headers, payload: { expectedRevision: edit.revision } })
    expect(ready.statusCode).toBe(200)

    const refine = await app.inject({ method: 'POST', url: `/api/v1/admin/work-items/${id}/refinement`, headers })
    expect(refine.statusCode).toBe(409)
    expect(refine.json().error.code).toBe('WORK_ITEM_NOT_EDITABLE')
    await app.close()
  })

  it('requires a same-origin write and rejects unknown refinement sessions', async () => {
    const { app, headers } = await boot(dir)
    const created = await app.inject({ method: 'POST', url: '/api/v1/admin/work-items', headers, payload: { intent: 'X', type: 'feature' } })
    const id = created.json().id
    // No origin → CSRF blocked.
    const noOrigin = await app.inject({ method: 'POST', url: `/api/v1/admin/work-items/${id}/refinement`, headers: { cookie: headers.cookie } })
    expect(noOrigin.statusCode).toBe(403)
    // Unknown session → 404.
    const badApply = await app.inject({ method: 'POST', url: `/api/v1/admin/work-items/${id}/refinement/apply`, headers, payload: { refinementId: 'ref_nope', expectedRevision: 'x' } })
    expect(badApply.statusCode).toBe(404)
    await app.close()
  })
})
