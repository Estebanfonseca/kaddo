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
  getModules,
  getProjectReadiness,
  getProjectRoute,
  getFindings,
  getKnowledgeInventory,
  getKnowledgeArtifactDetail,
  getWorkItemsList,
  getWorkItemDetail,
  createWorkItemAdmin,
  getWorkItemEdit,
  updateWorkItemAdmin,
  validateWorkItemAdmin,
  transitionWorkItemAdmin,
  getCaptureDefinition,
  CoreError,
} from './core-adapter.js'
import {
  WorkItemCreateWithAnswersSchema,
  WorkItemUpdateSchema,
  WorkItemTransitionSchema,
  RefinementFeedbackSchema,
  RefinementApplySchema,
} from './contracts/schemas.js'
import { createRefinementService, RefinementProviderError } from './refinement/index.js'
import type { AdminStorage } from './storage/admin-storage.js'

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function statusForCode(code: string): number {
  switch (code) {
    case 'WORK_ITEM_NOT_FOUND':
    case 'REFINEMENT_NOT_FOUND': return 404
    case 'WORK_ITEM_CONFLICT':
    case 'WORK_ITEM_NOT_EDITABLE': return 409
    case 'INVALID_INPUT':
    case 'INVALID_WORK_ITEM_ID':
    case 'INVALID_TRANSITION': return 400
    case 'TIMEOUT': return 504
    case 'PROVIDER_ERROR':
    case 'INVALID_RESPONSE': return 502
    default: return 500
  }
}

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
  // Refinement sessions are operational, in-memory state (disposable, never canonical).
  const refinement = createRefinementService()

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

  // Session validation hook for API routes (skip session + health endpoints)
  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return
    if (request.url.startsWith('/api/v1/admin/session')) return
    if (request.url.startsWith('/api/v1/admin/health')) return
    const cookieSession = request.cookies['kaddo-session']
    if (!sessionManager.validateSession(cookieSession)) {
      reply.code(401).send({ error: { code: 'SESSION_INVALID', message: 'Invalid or expired session.' } })
    }
  })

  // CSRF / origin protection for state-changing requests (VS-099).
  // Combined with the SameSite=strict session cookie, requiring a same-origin Origin header on
  // every write blocks cross-site request forgery. The browser sends Origin on POST/PUT/PATCH/DELETE.
  const allowedOrigin = `http://${host}:${port}`
  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return
    if (!WRITE_METHODS.has(request.method)) return
    const origin = request.headers.origin
    if (!origin || origin !== allowedOrigin) {
      reply.code(403).send({ error: { code: 'FORBIDDEN_ORIGIN', message: 'Cross-origin write requests are not allowed.' } })
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
  app.get<{ Querystring: { status?: string; module?: string; query?: string } }>(
    '/api/v1/admin/work-items',
    async (request) => {
      try {
        const { status, module, query } = request.query
        return getWorkItemsList(projectDir, { status, module, query })
      } catch (err) {
        if (err instanceof CoreError) {
          return { error: { code: err.code, message: err.message } }
        }
        throw err
      }
    },
  )
  // Write operations (VS-099). Each maps CoreError codes to the right HTTP status; a failed write
  // never returns a partial artifact (Core writes atomically).
  const writeHandler = <T>(reply: import('fastify').FastifyReply, fn: () => T) => {
    try {
      return fn()
    } catch (err) {
      if (err instanceof CoreError) {
        return reply.code(statusForCode(err.code)).send({ error: { code: err.code, message: err.message } })
      }
      throw err
    }
  }

  app.get('/api/v1/admin/work-items-capture', coreRoute(() => getCaptureDefinition()))

  app.post('/api/v1/admin/work-items', async (request, reply) => {
    const parsed = WorkItemCreateWithAnswersSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: 'Intent and type are required.' } })
    return writeHandler(reply, () => createWorkItemAdmin(projectDir, parsed.data))
  })

  app.get<{ Params: { workItemId: string } }>('/api/v1/admin/work-items/:workItemId/edit', async (request, reply) => {
    return writeHandler(reply, () => getWorkItemEdit(projectDir, request.params.workItemId))
  })

  app.put<{ Params: { workItemId: string } }>('/api/v1/admin/work-items/:workItemId', async (request, reply) => {
    const parsed = WorkItemUpdateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: 'A Work Item model and expectedRevision are required.' } })
    return writeHandler(reply, () => updateWorkItemAdmin(projectDir, request.params.workItemId, parsed.data))
  })

  app.post<{ Params: { workItemId: string } }>('/api/v1/admin/work-items/:workItemId/validate', async (request, reply) => {
    return writeHandler(reply, () => validateWorkItemAdmin(projectDir, request.params.workItemId))
  })

  app.post<{ Params: { workItemId: string } }>('/api/v1/admin/work-items/:workItemId/transitions/ready', async (request, reply) => {
    const parsed = WorkItemTransitionSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: 'expectedRevision is required.' } })
    return writeHandler(reply, () => transitionWorkItemAdmin(projectDir, request.params.workItemId, 'ready', parsed.data.expectedRevision))
  })

  app.post<{ Params: { workItemId: string } }>('/api/v1/admin/work-items/:workItemId/transitions/draft', async (request, reply) => {
    const parsed = WorkItemTransitionSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: 'expectedRevision is required.' } })
    return writeHandler(reply, () => transitionWorkItemAdmin(projectDir, request.params.workItemId, 'draft', parsed.data.expectedRevision))
  })

  // LLM-assisted refinement (VS-099.1). The Work Item is never modified until Apply.
  const refineHandler = async <T>(reply: import('fastify').FastifyReply, fn: () => Promise<T> | T) => {
    try {
      return await fn()
    } catch (err) {
      if (err instanceof RefinementProviderError || err instanceof CoreError) {
        return reply.code(statusForCode(err.code)).send({ error: { code: err.code, message: err.message } })
      }
      throw err
    }
  }

  app.post<{ Params: { workItemId: string } }>('/api/v1/admin/work-items/:workItemId/refinement', async (request, reply) => {
    return refineHandler(reply, () => refinement.start(projectDir, request.params.workItemId))
  })

  app.post<{ Params: { workItemId: string } }>('/api/v1/admin/work-items/:workItemId/refinement/feedback', async (request, reply) => {
    const parsed = RefinementFeedbackSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: 'refinementId and feedback are required.' } })
    return refineHandler(reply, () => refinement.feedback(projectDir, request.params.workItemId, parsed.data.refinementId, parsed.data.feedback))
  })

  app.post<{ Params: { workItemId: string } }>('/api/v1/admin/work-items/:workItemId/refinement/apply', async (request, reply) => {
    const parsed = RefinementApplySchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: 'refinementId and expectedRevision are required.' } })
    return refineHandler(reply, () => refinement.apply(projectDir, request.params.workItemId, parsed.data.refinementId, parsed.data.expectedRevision))
  })

  app.get<{ Params: { workItemId: string } }>('/api/v1/admin/work-items/:workItemId', async (request, reply) => {
    try {
      return getWorkItemDetail(projectDir, request.params.workItemId)
    } catch (err) {
      if (err instanceof CoreError) {
        const code = err.code === 'WORK_ITEM_NOT_FOUND' ? 404 : err.code === 'INVALID_WORK_ITEM_ID' ? 400 : 500
        return reply.code(code).send({ error: { code: err.code, message: err.message } })
      }
      throw err
    }
  })
  app.get('/api/v1/admin/modules', coreRoute(getModules))
  app.get('/api/v1/admin/readiness', coreRoute(getProjectReadiness))
  app.get('/api/v1/admin/route', coreRoute(getProjectRoute))
  app.get('/api/v1/admin/findings', coreRoute(getFindings))
  app.get('/api/v1/admin/knowledge/inventory', coreRoute(getKnowledgeInventory))
  app.get<{ Params: { artifactId: string } }>('/api/v1/admin/knowledge/artifact/:artifactId', async (request) => {
    try {
      return getKnowledgeArtifactDetail(projectDir, request.params.artifactId)
    } catch (err) {
      if (err instanceof CoreError) {
        return { error: { code: err.code, message: err.message } }
      }
      throw err
    }
  })

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
