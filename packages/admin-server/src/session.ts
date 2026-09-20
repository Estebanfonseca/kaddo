import { randomBytes } from 'node:crypto'
import type { AdminStorage } from './storage/admin-storage.js'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export class SessionManager {
  private activeSessionId: string | null = null

  constructor(private storage: AdminStorage) {}

  createSession(): string {
    this.storage.sessions.deleteExpired()
    const id = randomBytes(32).toString('hex')
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
    this.storage.sessions.create({
      id,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    })
    this.activeSessionId = id
    return id
  }

  validateSession(id: string | undefined): boolean {
    if (!id) return false
    const session = this.storage.sessions.findById(id)
    if (!session) return false
    if (new Date(session.expiresAt) < new Date()) {
      this.storage.sessions.deleteById(id)
      return false
    }
    return true
  }

  invalidateSession(id: string): void {
    this.storage.sessions.deleteById(id)
    if (this.activeSessionId === id) this.activeSessionId = null
  }

  invalidateAll(): void {
    if (this.activeSessionId) {
      this.storage.sessions.deleteById(this.activeSessionId)
      this.activeSessionId = null
    }
  }
}
