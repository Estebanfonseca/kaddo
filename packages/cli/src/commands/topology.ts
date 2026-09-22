// kaddo topology — validate and apply a semantic topology proposal (VS-100.2.1).
//
// An external agent inspects the repository and builds a topology PROPOSAL (a YAML file). Kaddo
// Core validates it deterministically and, after explicit human confirmation, applies it to the
// canonical artifact atomically. No LLM, no git. CLI and MCP share the same Core logic.

import { readFile, exists, cwd, join } from '../utils/fs.js'
import { loadConfig } from '../core/config.js'
import {
  validateTopologyProposal,
  applyTopologyProposal,
  topologyRevision,
  TopologyWriteError,
  type TopologyValidation,
} from '../core/system-topology.js'
import { intro, outro, log, confirm, cancel } from '../utils/ui.js'

function requireProject(dir: string) {
  if (!loadConfig(dir)) {
    log.error('No Kaddo project was found in the current directory.')
    process.exit(1)
  }
}

function readProposal(dir: string, file: string): string {
  const abs = join(dir, file)
  if (!exists(abs) && !exists(file)) {
    log.error(`Proposal file not found: ${file}`)
    process.exit(1)
  }
  return readFile(exists(abs) ? abs : file)
}

function printFindings(v: TopologyValidation): void {
  log.info(`${v.entityCount} entities · ${v.relationshipCount} relationships`)
  log.info(`${v.blocking} blocking · ${v.warning} warning`)
  for (const f of v.findings) {
    const line = `[${f.level}] ${f.message}`
    if (f.level === 'blocking') log.error(line)
    else log.warn(line)
  }
}

export async function runTopologyValidate(file: string): Promise<void> {
  const dir = cwd()
  requireProject(dir)
  intro('kaddo topology validate')
  const proposal = readProposal(dir, file)
  const v = validateTopologyProposal(dir, proposal)
  printFindings(v)
  if (v.canApply) outro('Proposal is valid. Apply it with `kaddo topology apply`.')
  else { outro('Proposal has blocking findings and cannot be applied.'); process.exit(1) }
}

export async function runTopologyApply(file: string, opts: { yes?: boolean } = {}): Promise<void> {
  const dir = cwd()
  requireProject(dir)
  intro('kaddo topology apply')
  const proposal = readProposal(dir, file)
  const v = validateTopologyProposal(dir, proposal)
  printFindings(v)
  if (!v.canApply) { cancel('Cannot apply: the proposal has blocking findings.'); process.exit(1) }

  if (!opts.yes) {
    const ok = await confirm({ message: `Apply this topology enrichment to ${join('', 'knowledge/tech/system-topology.yml')}? (writes the project artifact; no Git commit is created)` })
    if (!ok) { cancel('Apply cancelled.'); process.exit(0) }
  }

  try {
    // The revision the proposal was validated against — protects against a concurrent change.
    const result = applyTopologyProposal(dir, proposal, topologyRevision(dir))
    outro(`Applied. ${result.entitiesNew} new / ${result.entitiesUpdated} updated entities, ${result.relationshipsNew} new relationships.`)
  } catch (err) {
    if (err instanceof TopologyWriteError) { cancel(err.message); process.exit(1) }
    throw err
  }
}
