import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

// In-memory AdminStorage — avoids node:sqlite so the write endpoints can be exercised directly.
function fakeStorage() {
  const sessions = new Map<string, { id: string; createdAt: string; expiresAt: string }>()
  const prefs = new Map<string, string>()
  const cache = new Map<string, { value: string; expiresAt: string | null }>()
  return {
    initialize: async () => {},
    close: async () => {},
    sessions: {
      create: (s: { id: string; createdAt: string; expiresAt: string }) => { sessions.set(s.id, s) },
      findById: (id: string) => sessions.get(id),
      deleteById: (id: string) => { sessions.delete(id) },
      deleteExpired: () => {},
    },
    preferences: {
      get: (k: string) => prefs.get(k),
      set: (k: string, v: string) => { prefs.set(k, v) },
      delete: (k: string) => { prefs.delete(k) },
      all: () => [...prefs.entries()].map(([key, value]) => ({ key, value })),
    },
    cache: {
      get: (k: string) => cache.get(k)?.value,
      set: (k: string, v: string) => { cache.set(k, { value: v, expiresAt: null }) },
      delete: (k: string) => { cache.delete(k) },
      clear: () => { cache.clear() },
    },
  }
}

const HOST = '127.0.0.1'
const PORT = 4173
const ORIGIN = `http://${HOST}:${PORT}`

function writeFile(dir: string, rel: string, content: string) {
  const full = path.join(dir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf-8')
}

async function boot(dir: string) {
  writeFile(dir, '.kaddo/config.yml', ['project:', '  name: s99', '  state: pre-ai', '  structure: multirepo', 'team:', '  size: small'].join('\n'))
  const { createAdminServer } = await import('../../admin-server/src/server.js')
  const server = await createAdminServer({ projectDir: dir, storage: fakeStorage() as never, host: HOST, port: PORT })
  const app = server.app
  await app.ready()
  const sess = await app.inject({ method: 'GET', url: '/api/v1/admin/session' })
  const cookie = sess.headers['set-cookie'] as string
  return { app, cookie: Array.isArray(cookie) ? cookie[0] : cookie }
}

describe('VS-099: write endpoints', () => {
  let dir: string
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaddo-s99-')) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('creates, edits, validates and transitions a Work Item through the API', async () => {
    const { app, cookie } = await boot(dir)
    const headers = { cookie, origin: ORIGIN }

    const created = await app.inject({ method: 'POST', url: '/api/v1/admin/work-items', headers, payload: { intent: 'Enable registration after beta', type: 'feature' } })
    expect(created.statusCode).toBe(200)
    const { id } = created.json()
    expect(id).toBe('WI-001')

    const edit = await app.inject({ method: 'GET', url: `/api/v1/admin/work-items/${id}/edit`, headers })
    expect(edit.statusCode).toBe(200)
    const model = edit.json()
    expect(model.editable).toBe(true)

    const put = await app.inject({
      method: 'PUT', url: `/api/v1/admin/work-items/${id}`, headers,
      payload: {
        model: {
          ...model,
          targetBehavior: 'Anyone can register.',
          affectedModules: ['core'],
          moduleCoverage: [{ id: 'core', status: 'affected' }],
          scopeConfidence: { level: 'high', reasons: [] },
          acceptanceCriteria: [{ text: 'Works.', checked: null }],
        },
        expectedRevision: model.revision,
      },
    })
    expect(put.statusCode).toBe(200)
    const rev1 = put.json().revision

    const validate = await app.inject({ method: 'POST', url: `/api/v1/admin/work-items/${id}/validate`, headers })
    expect(validate.statusCode).toBe(200)
    expect(validate.json().canMarkReady).toBe(true)

    const ready = await app.inject({ method: 'POST', url: `/api/v1/admin/work-items/${id}/transitions/ready`, headers, payload: { expectedRevision: rev1 } })
    expect(ready.statusCode).toBe(200)
    expect(ready.json().status).toBe('ready')

    await app.close()
  })

  it('rejects writes without a same-origin Origin header (CSRF protection)', async () => {
    const { app, cookie } = await boot(dir)
    const res = await app.inject({ method: 'POST', url: '/api/v1/admin/work-items', headers: { cookie }, payload: { intent: 'x', type: 'feature' } })
    expect(res.statusCode).toBe(403)
    const evil = await app.inject({ method: 'POST', url: '/api/v1/admin/work-items', headers: { cookie, origin: 'http://evil.example' }, payload: { intent: 'x', type: 'feature' } })
    expect(evil.statusCode).toBe(403)
    await app.close()
  })

  it('rejects writes without a valid session', async () => {
    const { app } = await boot(dir)
    const res = await app.inject({ method: 'POST', url: '/api/v1/admin/work-items', headers: { origin: ORIGIN }, payload: { intent: 'x', type: 'feature' } })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('rejects path traversal in the work item id', async () => {
    const { app, cookie } = await boot(dir)
    const headers = { cookie, origin: ORIGIN }
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/work-items/..%2F..%2Fetc/edit', headers })
    expect([400, 404]).toContain(res.statusCode)
    await app.close()
  })

  it('returns 409 on a stale revision (conflict, no overwrite)', async () => {
    const { app, cookie } = await boot(dir)
    const headers = { cookie, origin: ORIGIN }
    const created = await app.inject({ method: 'POST', url: '/api/v1/admin/work-items', headers, payload: { intent: 'x', type: 'feature' } })
    const { id } = created.json()
    const put = await app.inject({
      method: 'PUT', url: `/api/v1/admin/work-items/${id}`, headers,
      payload: { model: { title: 'x', type: 'feature', scopeUnknowns: [], affectedModules: [], moduleCoverage: [], impactAnalysis: [], acceptanceCriteria: [], decisions: [], relatedKnowledge: [], scopeConfidence: null }, expectedRevision: 'stale-revision' },
    })
    expect(put.statusCode).toBe(409)
    expect(put.json().error.code).toBe('WORK_ITEM_CONFLICT')
    await app.close()
  })

  it('unknown work item returns 404', async () => {
    const { app, cookie } = await boot(dir)
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/work-items/WI-999/edit', headers: { cookie, origin: ORIGIN } })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})
