// E2E server bootstrap for the Work Item Browser Playwright smoke test.
//
// Assembles a throwaway Kaddo project in a temp dir from the committed fixtures under
// e2e/fixtures/project (kept outside .kaddo/ so git tracks them), then starts the real
// Admin server — the same createAdminServer used by `kaddo admin` — over the built admin
// frontend. Nothing here is canonical: the temp project is disposable.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
// Import the built admin-server directly — the admin package does not depend on it as a package.
const adminServerEntry = path.resolve(here, '..', '..', 'admin-server', 'dist', 'index.js')
const { createAdminServer, SQLiteAdminStorage } = await import(pathToFileURL(adminServerEntry).href)
const fixtureRoot = path.join(here, 'fixtures', 'project')
const adminDist = path.resolve(here, '..', 'dist')
const port = Number(process.env.PORT ?? 41800)
const host = '127.0.0.1'

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaddo-admin-e2e-'))
// knowledge/** are copied verbatim; .kaddo/config.yml is written from the fixture config.
copyDir(path.join(fixtureRoot, 'knowledge'), path.join(projectDir, 'knowledge'))
fs.mkdirSync(path.join(projectDir, '.kaddo'), { recursive: true })
fs.copyFileSync(path.join(fixtureRoot, 'config.yml'), path.join(projectDir, '.kaddo', 'config.yml'))
const fixtureModules = path.join(fixtureRoot, 'modules.yml')
if (fs.existsSync(fixtureModules)) fs.copyFileSync(fixtureModules, path.join(projectDir, '.kaddo', 'modules.yml'))
const fixtureIntegrations = path.join(fixtureRoot, 'integrations.yml')
if (fs.existsSync(fixtureIntegrations)) fs.copyFileSync(fixtureIntegrations, path.join(projectDir, '.kaddo', 'integrations.yml'))

fs.mkdirSync(path.join(projectDir, '.kaddo', 'admin'), { recursive: true })
const storage = new SQLiteAdminStorage(path.join(projectDir, '.kaddo', 'admin', 'admin.db'))
await storage.initialize()

const server = await createAdminServer({ projectDir, storage, staticDir: adminDist, host, port })
await server.start()
// eslint-disable-next-line no-console
console.log(`e2e admin server on http://${host}:${port} (project: ${projectDir})`)

const shutdown = async () => {
  try { await server.stop() } catch {}
  try { fs.rmSync(projectDir, { recursive: true, force: true }) } catch {}
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
