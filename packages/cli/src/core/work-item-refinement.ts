// Work Item refinement — deterministic Core surface for LLM-assisted refinement (VS-099.1).
//
// Kaddo Core stays deterministic and provider-independent: it never calls an LLM. It exposes the
// capture-question definition (so Admin and the CLI ask the SAME questions), assembles the
// refinement context an interface should send to a model, exposes the canonical agentic assets
// (work-item-agent prompt + work-item-refinement skill) so no second prompt is invented, and
// normalizes + validates + applies a structured proposal produced elsewhere.

import {
  getLevel,
  getLevelForType,
  normalizeType,
  WORK_ITEM_TYPES,
  type Question,
} from './knowledge-levels.js'
import { AGENT_PROMPTS } from '../agents/prompts.js'
import { skillById } from '../skills/skills.js'
import { loadConfig } from './config.js'
import { discoverKnowledge } from '../services/knowledge-artifacts.js'
import { loadMappedModules } from '../services/mapped-modules.js'
import {
  getWorkItemForEdit,
  updateWorkItem,
  type WorkItemInput,
  type ValidationFinding,
} from './work-item-write.js'

// --- Capture parity ----------------------------------------------------------

export type CaptureQuestion = { id: string; prompt: string; placeholder: string; field: string; required: boolean }
export type WorkItemCaptureDefinition = {
  types: { value: string; label: string }[]
  /** Capture questions per Work Item type (resolved from its knowledge level). */
  questions: Record<string, CaptureQuestion[]>
}

function toCapture(q: Question): CaptureQuestion {
  return { id: q.id, prompt: q.prompt, placeholder: q.placeholder, field: q.frontMatterField, required: q.required }
}

/** The capture questions the CLI asks — so Admin renders exactly the same, not a rival questionnaire. */
export function getWorkItemCaptureDefinition(): WorkItemCaptureDefinition {
  const questions: Record<string, CaptureQuestion[]> = {}
  for (const type of WORK_ITEM_TYPES) {
    questions[type] = getLevel(getLevelForType(type)).questions.map(toCapture)
  }
  return {
    types: WORK_ITEM_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
    questions,
  }
}

// --- Canonical agentic assets ------------------------------------------------

export type WorkItemAgentAssets = { agentPrompt: string; skill: string | null }

/** The canonical work-item-agent prompt and refinement skill — the source of agentic behavior. */
export function getWorkItemAgentAssets(): WorkItemAgentAssets {
  const agent = AGENT_PROMPTS.find((p) => p.fileName === 'work-item-agent.md')
  const skill = skillById('work-item-refinement')
  return { agentPrompt: agent?.content ?? '', skill: skill?.content ?? null }
}

// --- Context assembly --------------------------------------------------------

export type RefinementKnowledgeRef = { id: string; title: string; layer: string; type?: string; summary?: string }
export type RefinementContext = {
  workItem: { id: string; title: string; status: string; intent: string; current: WorkItemInput }
  project: { name: string; state: string; structure: string }
  modules: string[]
  knowledge: RefinementKnowledgeRef[]
  decisions: { id: string; title: string }[]
  revision: string
}

/**
 * Assemble the deterministic context a model needs to refine a Work Item. Includes the Work Item,
 * relevant Knowledge summaries, registered modules and known decisions. Never includes source code
 * or secrets — those are not part of the knowledge model.
 */
export function assembleRefinementContext(dir: string, workItemId: string): RefinementContext {
  const edit = getWorkItemForEdit(dir, workItemId)
  const config = loadConfig(dir)
  const knowledgeArtifacts = discoverKnowledge(dir).filter(
    (a) => !a.isWorkItem && a.type !== 'skill' && a.type !== 'agent' && a.layer !== 'unknown',
  )
  const decisions = knowledgeArtifacts
    .filter((a) => a.type === 'adr' || /^adr-/i.test(a.id))
    .map((a) => ({ id: a.id, title: a.title || a.id }))
  const knowledge: RefinementKnowledgeRef[] = knowledgeArtifacts
    .filter((a) => !(a.type === 'adr' || /^adr-/i.test(a.id)))
    .map((a) => ({ id: a.id || a.relPath, title: a.title || a.id, layer: a.layer, type: a.type || undefined, summary: a.summary || undefined }))
  const modules = ['core', ...loadMappedModules(dir).map((m) => m.id)].filter((v, i, arr) => arr.indexOf(v) === i)

  return {
    workItem: { id: edit.id, title: edit.title, status: edit.status, intent: edit.summary ?? edit.title, current: stripEdit(edit) },
    project: { name: config?.project.name ?? 'unknown', state: config?.project.state ?? 'unknown', structure: config?.project.structure ?? 'unknown' },
    modules,
    knowledge,
    decisions,
    revision: edit.revision,
  }
}

function stripEdit(edit: ReturnType<typeof getWorkItemForEdit>): WorkItemInput {
  const { id: _i, status: _s, revision: _r, path: _p, editable: _e, editableReason: _er, ...input } = edit
  return input
}

// --- Structured proposal -----------------------------------------------------

export type ProposalModuleCoverage = { id: string; status: string; reason?: string }
export type ProposalImpactSurface = { surface: string; status: string; reason?: string; question?: string }
export type WorkItemRefinementProposal = {
  title?: string
  outcome?: { actor?: string; observableOutcome?: string; currentBehavior?: string; targetBehavior?: string }
  journey?: { entryPoints?: string[]; flow?: string[] }
  affectedModules?: string[]
  moduleCoverage?: ProposalModuleCoverage[]
  impactAnalysis?: ProposalImpactSurface[]
  scopeConfidence?: { level: string; reasons?: string[] }
  scopeUnknowns?: string[]
  acceptanceCriteria?: string[]
  linkedDecisions?: string[]
  relatedKnowledge?: string[]
}

export type ProposalValidation = { findings: ValidationFinding[]; blocking: number; warning: number; fyi: number; canApply: boolean }
export type NormalizedRefinement = { input: WorkItemInput; validation: ProposalValidation }

const VALID_COVERAGE = new Set(['affected', 'reviewed-not-affected', 'unknown', 'not-applicable'])
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low'])

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}
function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean) : []
}

/**
 * Normalize a model proposal onto the current Work Item and validate it through Core. Unknown
 * module / decision / knowledge references are dropped and reported as findings — a proposal can
 * never introduce references Core cannot resolve.
 */
export function normalizeAndValidateProposal(dir: string, workItemId: string, proposal: WorkItemRefinementProposal): NormalizedRefinement {
  const ctx = assembleRefinementContext(dir, workItemId)
  const knownModules = new Set(ctx.modules)
  const knownDecisions = new Set(ctx.decisions.map((d) => d.id))
  const knownKnowledge = new Set(ctx.knowledge.map((k) => k.id))
  const extraFindings: ValidationFinding[] = []

  const input: WorkItemInput = { ...ctx.workItem.current }

  if (str(proposal.title)) input.title = str(proposal.title)!
  const o = proposal.outcome ?? {}
  if (str(o.actor) !== undefined) input.actor = str(o.actor)
  if (str(o.observableOutcome) !== undefined) input.outcome = str(o.observableOutcome)
  if (str(o.currentBehavior) !== undefined) input.currentBehavior = str(o.currentBehavior)
  if (str(o.targetBehavior) !== undefined) input.targetBehavior = str(o.targetBehavior)

  const j = proposal.journey ?? {}
  if (j.entryPoints) input.entryPoints = strList(j.entryPoints).join('\n')
  if (j.flow) input.endToEndFlow = strList(j.flow).map((s) => `- ${s}`).join('\n')

  if (proposal.moduleCoverage) {
    input.moduleCoverage = proposal.moduleCoverage
      .filter((c) => {
        if (!knownModules.has(c.id)) { extraFindings.push({ level: 'warning', message: `Proposed module "${c.id}" is not registered and was not included.` }); return false }
        return VALID_COVERAGE.has(c.status)
      })
      .map((c) => ({ id: c.id, status: c.status, ...(str(c.reason) ? { reason: str(c.reason) } : {}) }))
  }
  // affected_modules: proposal's, filtered to known, plus coverage-affected (kept consistent).
  const affected = new Set<string>()
  for (const m of proposal.affectedModules ?? []) if (knownModules.has(m)) affected.add(m)
  for (const c of input.moduleCoverage) if (c.status === 'affected') affected.add(c.id)
  if (proposal.affectedModules || proposal.moduleCoverage) input.affectedModules = [...affected]

  if (proposal.impactAnalysis) {
    input.impactAnalysis = proposal.impactAnalysis
      .filter((s) => VALID_COVERAGE.has(s.status) && str(s.surface))
      .map((s) => ({ surface: str(s.surface)!, status: s.status, ...(str(s.reason) ? { reason: str(s.reason) } : {}), ...(str(s.question) ? { question: str(s.question) } : {}) }))
  }

  if (proposal.scopeConfidence && VALID_CONFIDENCE.has(proposal.scopeConfidence.level)) {
    input.scopeConfidence = { level: proposal.scopeConfidence.level, reasons: strList(proposal.scopeConfidence.reasons) }
  }

  if (proposal.scopeUnknowns) input.scopeUnknowns = strList(proposal.scopeUnknowns)
  if (proposal.acceptanceCriteria) input.acceptanceCriteria = strList(proposal.acceptanceCriteria).map((t) => ({ text: t, checked: null }))

  if (proposal.linkedDecisions) {
    input.decisions = proposal.linkedDecisions.filter((id) => {
      if (!knownDecisions.has(id)) { extraFindings.push({ level: 'warning', message: `Proposed decision "${id}" does not exist and was not linked.` }); return false }
      return true
    })
  }
  if (proposal.relatedKnowledge) {
    input.relatedKnowledge = proposal.relatedKnowledge.filter((id) => {
      if (!knownKnowledge.has(id)) { extraFindings.push({ level: 'warning', message: `Proposed knowledge "${id}" could not be resolved and was not linked.` }); return false }
      return true
    })
  }

  // Validate the normalized model by writing to a throwaway evaluation is unnecessary — reuse the
  // same rule set validateWorkItem applies, computed on the candidate input directly.
  const findings = [...extraFindings, ...evaluate(input, knownModules)]
  const blocking = findings.filter((f) => f.level === 'blocking').length
  const warning = findings.filter((f) => f.level === 'warning').length
  const fyi = findings.filter((f) => f.level === 'fyi').length
  return { input, validation: { findings, blocking, warning, fyi, canApply: true } }
}

/** The same consistency/completeness checks validateWorkItem runs, applied to a candidate input. */
function evaluate(input: WorkItemInput, knownModules: Set<string>): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  for (const c of input.moduleCoverage) {
    if (c.status === 'affected' && !input.affectedModules.includes(c.id)) {
      findings.push({ level: 'blocking', message: `${c.id} is marked affected in module coverage but is missing from affected_modules.` })
    }
  }
  for (const m of input.affectedModules) {
    if (!knownModules.has(m)) findings.push({ level: 'blocking', message: `Module "${m}" is not registered in this project.` })
  }
  if (!input.targetBehavior?.trim()) findings.push({ level: 'warning', message: 'Target behavior is not defined.' })
  if (input.acceptanceCriteria.length === 0) findings.push({ level: 'warning', message: 'No acceptance criteria have been defined.' })
  if (input.scopeConfidence?.level === 'low') findings.push({ level: 'warning', message: 'Scope confidence is Low.' })
  if (!input.scopeConfidence) findings.push({ level: 'warning', message: 'Scope confidence has not been assessed.' })
  for (const s of input.impactAnalysis) if (s.status === 'unknown') findings.push({ level: 'fyi', message: `Impact on ${s.surface} is unknown.` })
  return findings
}

/**
 * Apply an approved proposal to the Work Item through the canonical no-lossy writer. The Work Item
 * stays a Draft; a stale revision is refused by updateWorkItem. Returns the new revision.
 */
export function applyRefinement(dir: string, workItemId: string, proposal: WorkItemRefinementProposal, expectedRevision: string): { revision: string; path: string } {
  const { input } = normalizeAndValidateProposal(dir, workItemId, proposal)
  return updateWorkItem(dir, workItemId, input, expectedRevision)
}
