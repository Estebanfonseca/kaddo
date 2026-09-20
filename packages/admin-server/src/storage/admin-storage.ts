export interface SessionRecord {
  id: string
  createdAt: string
  expiresAt: string
}

export interface PreferenceRecord {
  key: string
  value: string
}

export interface CacheRecord {
  key: string
  value: string
  expiresAt: string | null
}

export interface SessionRepository {
  create(session: SessionRecord): void
  findById(id: string): SessionRecord | undefined
  deleteById(id: string): void
  deleteExpired(): void
}

export interface PreferencesRepository {
  get(key: string): string | undefined
  set(key: string, value: string): void
  delete(key: string): void
  all(): PreferenceRecord[]
}

export interface CacheRepository {
  get(key: string): string | undefined
  set(key: string, value: string, ttlMs?: number): void
  delete(key: string): void
  clear(): void
}

export interface AdminStorage {
  initialize(): Promise<void>
  sessions: SessionRepository
  preferences: PreferencesRepository
  cache: CacheRepository
  close(): Promise<void>
}
