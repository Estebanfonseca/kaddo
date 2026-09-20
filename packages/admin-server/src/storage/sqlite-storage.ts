import { DatabaseSync } from 'node:sqlite'
import type {
  AdminStorage,
  SessionRepository,
  PreferencesRepository,
  CacheRepository,
  SessionRecord,
  PreferenceRecord,
} from './admin-storage.js'

export class SQLiteAdminStorage implements AdminStorage {
  private db: DatabaseSync

  sessions: SessionRepository
  preferences: PreferencesRepository
  cache: CacheRepository

  constructor(private dbPath: string) {
    this.db = new DatabaseSync(dbPath)
    this.db.exec('PRAGMA journal_mode = WAL')

    this.sessions = {
      create: (session: SessionRecord) => {
        this.db.prepare(
          'INSERT OR REPLACE INTO admin_sessions (id, created_at, expires_at) VALUES (?, ?, ?)'
        ).run(session.id, session.createdAt, session.expiresAt)
      },
      findById: (id: string) => {
        const row = this.db.prepare(
          'SELECT id, created_at, expires_at FROM admin_sessions WHERE id = ?'
        ).get(id) as { id: string; created_at: string; expires_at: string } | undefined
        if (!row) return undefined
        return { id: row.id, createdAt: row.created_at, expiresAt: row.expires_at }
      },
      deleteById: (id: string) => {
        this.db.prepare('DELETE FROM admin_sessions WHERE id = ?').run(id)
      },
      deleteExpired: () => {
        const now = new Date().toISOString()
        this.db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(now)
      },
    }

    this.preferences = {
      get: (key: string) => {
        const row = this.db.prepare(
          'SELECT value FROM admin_preferences WHERE key = ?'
        ).get(key) as { value: string } | undefined
        return row?.value
      },
      set: (key: string, value: string) => {
        this.db.prepare(
          'INSERT OR REPLACE INTO admin_preferences (key, value) VALUES (?, ?)'
        ).run(key, value)
      },
      delete: (key: string) => {
        this.db.prepare('DELETE FROM admin_preferences WHERE key = ?').run(key)
      },
      all: (): PreferenceRecord[] => {
        return this.db.prepare('SELECT key, value FROM admin_preferences').all() as PreferenceRecord[]
      },
    }

    this.cache = {
      get: (key: string) => {
        const row = this.db.prepare(
          'SELECT value, expires_at FROM admin_cache WHERE key = ?'
        ).get(key) as { value: string; expires_at: string | null } | undefined
        if (!row) return undefined
        if (row.expires_at && new Date(row.expires_at) < new Date()) {
          this.db.prepare('DELETE FROM admin_cache WHERE key = ?').run(key)
          return undefined
        }
        return row.value
      },
      set: (key: string, value: string, ttlMs?: number) => {
        const expiresAt = ttlMs ? new Date(Date.now() + ttlMs).toISOString() : null
        this.db.prepare(
          'INSERT OR REPLACE INTO admin_cache (key, value, expires_at) VALUES (?, ?, ?)'
        ).run(key, value, expiresAt)
      },
      delete: (key: string) => {
        this.db.prepare('DELETE FROM admin_cache WHERE key = ?').run(key)
      },
      clear: () => {
        this.db.exec('DELETE FROM admin_cache')
      },
    }
  }

  async initialize(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS admin_preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS admin_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at TEXT
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        detail TEXT
      );
    `)
  }

  async close(): Promise<void> {
    this.db.close()
  }
}
