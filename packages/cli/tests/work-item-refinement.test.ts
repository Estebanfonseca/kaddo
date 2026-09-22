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
function initProject(dir: string) {
  write(dir, '.kaddo/config.yml', ['project:', '  name: wir', '  state: pre-ai', '  structure: multirepo', 'team:', '  size: small'].join('\n'))
  write(dir, '.kaddo/modules.yml', ['modules:', '  - id: frontend', '    path: ../frontend', '    role: module'].join('\n'))
  write(dir, 'knowledge/tech/decisions/ADR-004.md', ['---', 'id: ADR-004', 'type: adr', 'title: Auth strategy', 'status: accepted', '---', '', '# ADR-004', ''].join('\n'))
  write(dir, 'knowledge/product/capabilities.md', ['---', 'id: PROD-1', 'type: capabilities', 'title: Registration', '---', '', '# Registration', ''].join('\n'))
}

const PROPOSAL = {
  title: 'Enable regular registration after beta',
  outcome: { actor: 'New visitor', currentBehavior: 'Public page uses the beta flow.', targetBehavior: 'Visitor registers directly.' },
  journey: { entryPoints: ['Public landing'], flow: ['Landing', 'Sign up', 'Registration API', 'Account created'] },
  affectedModules: ['core', 'frontend'],
  moduleCoverage: [{ id: 'core', status: 'affected' }, { id: 'frontend', status: 'affected', reason: 'Signup page.' }],
  impactAnalysis: [{ surface: 'frontend', status: 'affected' }, { surface: 'feature-flags', status: 'unknown', question: 'Flag?' }],
  scopeConfidence: { level: 'medium', reasons: ['Flows found.'] },
  scopeUnknowns: ['Is registration gated by a flag?'],
  acceptanceCriteria: ['Public signup no longer references beta.', 'A visitor can create an account.'],
  linkedDecisions: ['ADR-004'],
  relatedKnowledge: ['PROD-1'],
}

describe('VS-099.1: capture parity', () => {
  it('exposes the same capture questions the CLI uses, keyed by type', async () => {
    const core = await import('../src/core.js')
    const def = core.getWorkItemCaptureDefinition()
    expect(def.types.map((t) => t.value)).toContain('feature')
    // A feature is K2 — problem/expected_result/impact/acceptance_criteria.
    const fields = def.questions.feature.map((q) => q.field)
    expect(fields).toContain('problem')
    expect(fields).toContain('acceptance_criteria')
  })

  it('create writes capture answers into the draft body', async () => {
    const dir = tmpDir(); initProject(dir)
    const core = await import('../src/core.js')
    const res = core.createWorkItem(dir, { intent: 'Add saved searches', type: 'feature', answers: { problem: 'Users cannot save searches.', acceptance_criteria: 'A search can be saved.\nA saved search can be re-run.' } })
    const raw = fs.readFileSync(path.join(dir, res.path), 'utf-8')
    expect(raw).toContain('## Problem')
    expect(raw).toContain('Users cannot save searches.')
    expect(raw).toContain('A saved search can be re-run.')
    fs.rmSync(dir, { recursive: true, force: true })
  })
})

describe('VS-099.1: agent assets', () => {
  it('exposes the canonical work-item-agent prompt and refinement skill', async () => {
    const core = await import('../src/core.js')
    const assets = core.getWorkItemAgentAssets()
    expect(assets.agentPrompt).toContain('Work Item Agent')
    expect(assets.skill).toContain('work-item-refinement')
  })
})

describe('VS-099.1: context assembly', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir(); initProject(dir) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('includes the Work Item, knowledge, modules and decisions — but no source code', async () => {
    const core = await import('../src/core.js')
    const { id } = core.createWorkItem(dir, { intent: 'Enable registration', type: 'feature' })
    const ctx = core.assembleRefinementContext(dir, id)
    expect(ctx.workItem.id).toBe(id)
    expect(ctx.modules).toEqual(expect.arrayContaining(['core', 'frontend']))
    expect(ctx.decisions.map((d) => d.id)).toContain('ADR-004')
    expect(ctx.knowledge.map((k) => k.id)).toContain('PROD-1')
    expect(ctx.revision).toBeTruthy()
  })
})

describe('VS-099.1: normalize + validate + apply', () => {
  let dir: string
  beforeEach(() => { dir = tmpDir(); initProject(dir) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  it('normalizes a structured proposal and validates it through Core', async () => {
    const core = await import('../src/core.js')
    const { id } = core.createWorkItem(dir, { intent: 'Enable registration', type: 'feature' })
    const { input, validation } = core.normalizeAndValidateProposal(dir, id, PROPOSAL)
    expect(input.targetBehavior).toContain('registers directly')
    expect(input.affectedModules).toEqual(expect.arrayContaining(['core', 'frontend']))
    expect(input.decisions).toEqual(['ADR-004'])
    expect(input.relatedKnowledge).toEqual(['PROD-1'])
    expect(validation.blocking).toBe(0)
  })

  it('drops unknown module/decision/knowledge references and reports them', async () => {
    const core = await import('../src/core.js')
    const { id } = core.createWorkItem(dir, { intent: 'X', type: 'feature' })
    const { input, validation } = core.normalizeAndValidateProposal(dir, id, {
      ...PROPOSAL,
      affectedModules: ['core', 'ghost'],
      moduleCoverage: [{ id: 'core', status: 'affected' }, { id: 'ghost', status: 'affected' }],
      linkedDecisions: ['ADR-999'],
      relatedKnowledge: ['NOPE-1'],
    })
    expect(input.affectedModules).not.toContain('ghost')
    expect(input.decisions).not.toContain('ADR-999')
    expect(input.relatedKnowledge).not.toContain('NOPE-1')
    expect(validation.findings.some((f) => f.message.includes('ghost'))).toBe(true)
    expect(validation.findings.some((f) => f.message.includes('ADR-999'))).toBe(true)
  })

  it('apply writes through the no-lossy Core writer and keeps the Work Item a Draft', async () => {
    const core = await import('../src/core.js')
    const { id } = core.createWorkItem(dir, { intent: 'Enable registration', type: 'feature' })
    const ctx = core.assembleRefinementContext(dir, id)
    const res = core.applyRefinement(dir, id, PROPOSAL, ctx.revision)
    expect(res.revision).not.toBe(ctx.revision)
    const wi = core.getWorkItem(dir, id)
    expect(wi.status).toBe('draft') // apply never promotes to ready
    expect(wi.targetBehavior).toContain('registers directly')
    expect(wi.affectedModules).toEqual(expect.arrayContaining(['core', 'frontend']))
  })

  it('apply refuses a stale revision (no silent overwrite)', async () => {
    const core = await import('../src/core.js')
    const { id } = core.createWorkItem(dir, { intent: 'X', type: 'feature' })
    expect(() => core.applyRefinement(dir, id, PROPOSAL, 'stale-revision')).toThrow(core.WorkItemWriteError)
  })

  it('preserves unknown metadata when applying (no-lossy)', async () => {
    const core = await import('../src/core.js')
    write(dir, 'knowledge/delivery/work-items/draft/WI-050.md', ['---', 'id: WI-050', 'title: Legacy', 'type: feature', 'status: draft', 'future_key: keep', '---', '', '# Legacy', '', '## Notes section', '', 'Keep me.', ''].join('\n'))
    const ctx = core.assembleRefinementContext(dir, 'WI-050')
    core.applyRefinement(dir, 'WI-050', { outcome: { targetBehavior: 'New target.' } }, ctx.revision)
    const raw = fs.readFileSync(path.join(dir, 'knowledge/delivery/work-items/draft/WI-050.md'), 'utf-8')
    expect(raw).toContain('future_key')
    expect(raw).toContain('Notes section')
    expect(raw).toContain('Keep me.')
    expect(raw).toContain('New target.')
  })
})
