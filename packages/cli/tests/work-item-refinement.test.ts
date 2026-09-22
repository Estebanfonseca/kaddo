import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

function tmpDir(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'kaddo-wir-')) }
function write(dir: string, rel: string, content: string) {
  const full = path.join(dir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf-8')
}
function initProject(dir: string, multirepo = true) {
  write(dir, '.kaddo/config.yml', ['project:', '  name: wir', '  state: pre-ai', `  structure: ${multirepo ? 'multirepo' : 'monorepo'}`, 'team:', '  size: small'].join('\n'))
  if (multirepo) write(dir, '.kaddo/modules.yml', ['modules:', '  - id: frontend', '    path: ../frontend', '    role: module'].join('\n'))
}

const REFINED_WI = [
  '---', 'id: WI-050', 'title: Enable registration', 'type: feature', 'status: draft',
  'affected_modules: [core, frontend]',
  'module_coverage:', '  core:', '    status: affected', '  frontend:', '    status: affected',
  'impact_analysis:', '  surfaces:', '    frontend:', '      status: affected',
  'scope_confidence:', '  level: medium', '  reasons: []',
  '---', '',
  '# Enable registration', '',
  '## Current behavior', '', 'Public page uses the beta flow.', '',
  '## Target behavior', '', 'Visitor registers directly.', '',
  '## Entry points', '', 'Public registration page', '',
  '## Acceptance criteria', '', '- A visitor can register.', '',
].join('\n')

describe('VS-099.1: capture parity', () => {
  it('exposes the CLI capture questions keyed by type', async () => {
    const core = await import('../src/core.js')
    const def = core.getWorkItemCaptureDefinition()
    expect(def.types.map((t) => t.value)).toEqual(expect.arrayContaining(['feature', 'chore']))
    expect(def.questions.feature.map((q) => q.field)).toContain('acceptance_criteria')
  })
})

describe('VS-099.1: refinement status (deterministic, Core-owned)', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir(); initProject(dir) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('a freshly captured draft needs refinement', async () => {
    const core = await import('../src/core.js')
    const { id } = core.createWorkItem(dir, { intent: 'Enable registration', type: 'feature' })
    const wi = core.getWorkItem(dir, id)
    expect(wi.refinement.status).toBe('needs-refinement')
    expect(wi.refinement.aspects.modules).toBe(false)
  })

  it('a materially scoped draft is refined — without any lifecycle change', async () => {
    const core = await import('../src/core.js')
    write(dir, 'knowledge/delivery/work-items/draft/WI-050.md', REFINED_WI)
    const wi = core.getWorkItem(dir, 'WI-050')
    expect(wi.status).toBe('draft') // lifecycle unchanged
    expect(wi.refinement.status).toBe('refined')
    expect(wi.refinement.aspects).toMatchObject({ outcome: true, modules: true, acceptance: true })
  })
})

describe('VS-099.1: refinement handoff', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir(); initProject(dir) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('identifies the Work Item and recommends the canonical Kaddo assets', async () => {
    const core = await import('../src/core.js')
    const { id } = core.createWorkItem(dir, { intent: 'Enable regular registration after the beta', type: 'feature' })
    const h = core.buildRefinementHandoff(dir, id)
    expect(h.workItemId).toBe(id)
    expect(h.recommendedAgent).toBe('work-item-agent')
    expect(h.recommendedSkill).toBe('work-item-refinement')
    expect(h.text).toContain(id)
    expect(h.text).toContain('work-item-agent')
    expect(h.text).toContain('work-item-refinement')
    expect(h.text).toContain('Inspect the actual implementation')
    expect(h.text).toContain('Do not implement')
  })

  it('asks a multirepo agent to evaluate the mapped modules', async () => {
    const core = await import('../src/core.js')
    const { id } = core.createWorkItem(dir, { intent: 'X', type: 'feature' })
    const h = core.buildRefinementHandoff(dir, id)
    expect(h.text).toContain('multirepo')
    expect(h.text).toContain('frontend')
  })

  it('omits the multirepo note for a single-repo project', async () => {
    const single = tmpDir(); initProject(single, false)
    const core = await import('../src/core.js')
    const { id } = core.createWorkItem(single, { intent: 'X', type: 'feature' })
    const h = core.buildRefinementHandoff(single, id)
    expect(h.text).not.toContain('multirepo')
    fs.rmSync(single, { recursive: true, force: true })
  })

  it('the handoff contains no secrets or absolute paths', async () => {
    const core = await import('../src/core.js')
    const { id } = core.createWorkItem(dir, { intent: 'X', type: 'feature' })
    const h = core.buildRefinementHandoff(dir, id)
    expect(h.text).not.toMatch(/api[_-]?key|secret|token/i)
    expect(h.text).not.toMatch(/[A-Za-z]:\\|\/home\/|\/Users\//)
  })

  it('throws for an unknown Work Item', async () => {
    const core = await import('../src/core.js')
    expect(() => core.buildRefinementHandoff(dir, 'WI-999')).toThrow()
  })
})
