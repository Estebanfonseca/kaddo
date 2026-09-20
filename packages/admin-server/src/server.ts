import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { SessionManager } from './session.js'
import {
  getProjectOverview,
  getProjectSummary,
  getKnowledgeSummary,
  getWorkItemSummary,
  getModules,
  getProjectReadiness,
  getProjectRoute,
  getFindings,
  CoreError,
} from './core-adapter.js'
import type { AdminStorage } from './storage/admin-storage.js'

export type AdminServerOptions = {
  projectDir: string
  storage: AdminStorage
  staticDir?: string
  host?: string
  port?: number
}

export async function createAdminServer(opts: AdminServerOptions) {
  const { projectDir, storage, staticDir, host = '127.0.0.1', port = 4173 } = opts

  const app = Fastify({ logger: false })
  const sessionManager = new SessionManager(storage)

  await app.register(fastifyCookie)
  await app.register(fastifyCors, {
    origin: `http://${host}:${port}`,
    credentials: true,
  })

  if (staticDir) {
    await app.register(fastifyStatic, {
      root: path.resolve(staticDir),
      prefix: '/',
      wildcard: false,
    })
  }

  // Create session on server start
  const sessionId = sessionManager.createSession()

  // Session validation hook for API routes
  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return
    const cookieSession = request.cookies['kaddo-session']
    if (!sessionManager.validateSession(cookieSession)) {
      reply.code(401).send({ error: { code: 'SESSION_INVALID', message: 'Invalid or expired session.' } })
    }
  })

  // Health check (not protected)
  app.get('/api/v1/admin/health', async () => ({ status: 'ok' }))

  // Session endpoint — sets the cookie
  app.get('/api/v1/admin/session', async (_request, reply) => {
    reply.setCookie('kaddo-session', sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 86400,
    })
    return { status: 'active' }
  })

  // Core domain endpoints
  const coreRoute = <T>(handler: (dir: string) => T) => {
    return async () => {
      try {
        return handler(projectDir)
      } catch (err) {
        if (err instanceof CoreError) {
          return { error: { code: err.code, message: err.message } }
        }
        throw err
      }
    }
  }

  app.get('/api/v1/admin/overview', coreRoute(getProjectOverview))
  app.get('/api/v1/admin/project', coreRoute(getProjectSummary))
  app.get('/api/v1/admin/knowledge', coreRoute(getKnowledgeSummary))
  app.get('/api/v1/admin/work-items', coreRoute(getWorkItemSummary))
  app.get('/api/v1/admin/modules', coreRoute(getModules))
  app.get('/api/v1/admin/readiness', coreRoute(getProjectReadiness))
  app.get('/api/v1/admin/route', coreRoute(getProjectRoute))
  app.get('/api/v1/admin/findings', coreRoute(getFindings))

  // SPA fallback: serve index.html for non-API, non-static routes
  if (staticDir) {
    app.setNotFoundHandler(async (_request, reply) => {
      return reply.sendFile('index.html')
    })
  }

  return {
    app,
    sessionId,
    sessionManager,
    start: async () => {
      await app.listen({ host, port })
      return `http://${host}:${port}`
    },
    stop: async () => {
      sessionManager.invalidateAll()
      await app.close()
      await storage.close()
    },
  }
}
