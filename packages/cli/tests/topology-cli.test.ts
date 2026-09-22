import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

const CLI = path.resolve(__dirname, '..', 'dist', 'index.js')

function tmpDir(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'kaddo-tcli-')) }
function write(dir: string, rel: string, content: string) {
  const full = path.join(dir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf-8')
}
function run(dir: string, args: string[]): { code: number; out: string } {
  try {
    const out = execFileSync('node', [CLI, ...args], { cwd: dir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
    return { code: 0, out }
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string }
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

const GOOD = ['entities:', '  - id: admin-metrics', '    kind: component', '    label: Admin Metrics'].join('\n')
const BAD = ['entities:', '  - id: a', '    kind: component', '    label: A', 'relationships:', '  - from: a', '    to: ghost', '    type: calls'].join('\n')

// Building the CLI dist is part of the normal build; skip if it isn't present.
const hasCli = fs.existsSync(CLI)

describe.skipIf(!hasCli)('VS-100.2.1: topology CLI (reuses Core)', () => {
  let dir: string
  beforeEach(() => {
    dir = tmpDir()
    write(dir, '.kaddo/config.yml', ['project:', '  name: tcli', '  state: pre-ai', '  structure: monorepo', 'team:', '  size: small'].join('\n'))
  })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('validate succeeds for a good proposal and fails for a bad one', () => {
    write(dir, 'good.yml', GOOD)
    write(dir, 'bad.yml', BAD)
    expect(run(dir, ['topology', 'validate', 'good.yml']).code).toBe(0)
    expect(run(dir, ['topology', 'validate', 'bad.yml']).code).toBe(1)
  })

  it('apply --yes writes the canonical artifact; apply refuses a blocking proposal', () => {
    write(dir, 'good.yml', GOOD)
    write(dir, 'bad.yml', BAD)
    const ok = run(dir, ['topology', 'apply', 'good.yml', '--yes'])
    expect(ok.code).toBe(0)
    expect(fs.existsSync(path.join(dir, 'knowledge/tech/system-topology.yml'))).toBe(true)

    const bad = run(dir, ['topology', 'apply', 'bad.yml', '--yes'])
    expect(bad.code).toBe(1)
  })
})
