---
inclusion: always
---

# Getting Started with Kaddo

## Prerequisites

Before using Kaddo tools, ensure:

1. The Kaddo MCP server is running and connected to Kiro.
2. You are in the root of the repository.
3. The `.kaddo/` directory and `knowledge/` directory exist.

If `.kaddo/` or `knowledge/` are missing, run `kaddo init` followed by `kaddo scan`
before starting any agent work.

## The KDD Philosophy

Knowledge-Driven Development means we never code based on assumptions.

- Business rules belong in `knowledge/business/`.
- Product knowledge belongs in `knowledge/product/`.
- Architecture decisions belong in `knowledge/tech/decisions/`.
- Delivery planning belongs in `knowledge/delivery/`.
- Code is simply the execution of that knowledge.

KDD is a prior concept in software engineering. Kaddo is a **practical implementation of
KDD principles for AI-assisted software development** — it applies them; it did not invent them.

## Knowledge layers

| Layer | Path | Contains |
|-------|------|----------|
| Business | `knowledge/business/` | business.md, problem, users, value proposition |
| Product | `knowledge/product/` | product.md, roadmap, capabilities |
| Tech | `knowledge/tech/` | current-state.md, codebase.md, decisions/, standards.md, security.md, stack.md, git-strategy.md, system-topology.yml |
| Delivery | `knowledge/delivery/` | roadmap.md, work-items/ (draft/ ready/ in-progress/ blocked/ completed/ archived/) |

## Work Item lifecycle — file locations

Work Items live under `knowledge/delivery/work-items/` organized by lifecycle state:

```
knowledge/delivery/work-items/
  draft/        ← being refined; not ready for implementation
  ready/        ← scope confirmed; implementation can start
  in-progress/  ← actively being implemented
  blocked/      ← waiting on a dependency or decision
  completed/    ← done and validated
  archived/     ← no longer active
```

`kaddo ready <id>` (CLI) or `kaddo_mark_work_item_ready` with `confirm: true` (MCP)
moves the file from `draft/` to `ready/` and sets `status: ready` in front matter.
Only the human triggers this transition — never Kiro.

Legacy work items without lifecycle subfolders are still recognized (backward-compatible).

## Operating moments

Kaddo matures a project through four moments — not a flat list of commands:

| Moment | Purpose | Key commands / agents |
|--------|---------|----------------------|
| **Base** | Set up workspace and knowledge structure | `init`, `bootstrap`, `scan`, `add agents`, `context`, `understand` |
| **Definition** | Turn the idea into clear knowledge | business-agent, product-agent, capability-agent, codebase-agent, architecture-agent |
| **Projection** | Turn knowledge into a delivery plan | roadmap-agent, backlog-agent, `create --from roadmap`, work-item-agent, ownership-agent |
| **Execution** | Build, verify and keep knowledge in sync | implementation-agent, `scan`, `owners suggest`, `guard`, `explain` |

## Kaddo CLI quick reference

### Base commands
```bash
kaddo init                  # Initialize repo: state, language, structure
kaddo bootstrap             # New projects: create initial knowledge base (Business→Tech→Delivery)
kaddo scan                  # Detect stack and technical signals → .kaddo/scan.json
kaddo context               # Build context pack for the LLM → .kaddo/context-pack.md
kaddo add agents            # Install agent prompt packs into knowledge/agents/
kaddo add skills            # Install reusable skills into knowledge/skills/
kaddo understand            # Guided CLI → LLM handoff plan (.kaddo/understand.md)
kaddo explain               # Summarize current project knowledge (.kaddo/explain.md)
```

### Delivery commands
```bash
kaddo create --from roadmap # Turn a roadmap candidate into a Work Item
kaddo ready <id>            # Validate and transition a draft WI → ready (moves file to ready/)
kaddo owners suggest        # Declare code: ownership globs
kaddo guard                 # Detect drift between code and knowledge
kaddo guard --staged        # Run guard against staged changes only
kaddo guard --ci            # Non-blocking JSON output for CI/PR
kaddo guard --record        # Record this guard run to .kaddo/history/guard-runs.jsonl
kaddo guard --workspace     # Opt-in: run guard across mapped multirepo modules
kaddo classify              # Classification Drift: diff signals vs. WI type/level
kaddo ignore                # Ignore a guard FYI with a reason
```

### Knowledge observability
```bash
kaddo status                # Project knowledge observability snapshot
kaddo explain               # Full knowledge explanation (human or --for agent)
kaddo questions             # List open questions classified by readiness severity
kaddo drift                 # Drift trend report from recorded guard history
kaddo savings               # Estimated savings report (context efficiency metrics)
kaddo savings init          # Initialize .kaddo/savings.yml with calibration prompts
kaddo history               # Guard/drift history log
kaddo learn                 # Record a learning artifact
```

### Knowledge enrichment
```bash
kaddo adr                   # List ADR candidates vs. materialized decisions (alias: kaddo decisions)
kaddo tech organize         # Move discovery files to knowledge/tech/discovery/
kaddo topology validate <f> # Validate a topology proposal YAML before applying
kaddo topology apply <f>    # Apply a topology proposal → knowledge/tech/system-topology.yml
```

### Multirepo commands
```bash
kaddo modules map           # Register a secondary repo as a module
kaddo modules list          # List mapped modules
kaddo modules discover      # Auto-discover sibling repos as Kaddo modules
kaddo module --init         # Initialize a module descriptor in the current repo
kaddo module --show         # Show this module's descriptor
kaddo capsule export        # Export a Knowledge Capsule draft (.kaddo/exports/)
kaddo capsule add <path>    # Import an external Knowledge Capsule into context
```

### Reports
```bash
kaddo report impact         # Knowledge Impact Report (alias: kaddo impact)
kaddo savings               # Estimated Savings Report (alias: kaddo report savings)
kaddo drift                 # Drift Trend Report (alias: kaddo report drift)
```

### Admin
```bash
kaddo admin                 # Local web UI on port 4173 (SQLite at .kaddo/admin/admin.db)
kaddo admin --port <n>      # Override port
kaddo admin --no-open       # Don't auto-open the browser
```

### Adapters (generate native instruction files)
```bash
kaddo adapters install kiro          # Write AGENTS.md for Kiro
kaddo adapters install claude        # Write CLAUDE.md for Claude Code
kaddo adapters install codex         # Write AGENTS.md for Codex / OpenCode
kaddo adapters install kiro --inject # Update only the Kaddo block in an existing file
kaddo adapters install kiro --force  # Overwrite an existing adapter file
kaddo adapters status                # Check install state of each adapter
kaddo adapters list                  # List supported adapters
```

## MCP server — tools reference

The `@kaddo/mcp` server exposes these tools to Kiro. Prefer tools over reading files directly.

### Status and Work Items
| Tool | Key parameters | Purpose |
|------|---------------|---------|
| `kaddo_project_status` | — | Compact project health snapshot |
| `kaddo_list_work_items` | `status?` `type?` `knowledge_level?` | Filter Work Items |
| `kaddo_get_work_item` | `id` | Full Work Item by ID (summary + markdown) |
| `kaddo_mark_work_item_ready` | `id`, `confirm?: boolean` | Preview readiness or transition draft → ready |

### Knowledge artifacts
| Tool | Key parameters | Purpose |
|------|---------------|---------|
| `kaddo_list_capsules` | — | External Knowledge Capsules |
| `kaddo_get_capsule` | `id` | One capsule by ID |
| `kaddo_list_agents` | — | Installed agent prompts |
| `kaddo_get_agent_prompt` | `name` | One agent prompt by name |
| `kaddo_list_skills` | — | Installed reusable skills |
| `kaddo_get_skill` | `id` | One skill by ID |
| `kaddo_list_graph_hints` | `artifact_type?` `severity?` `active_only?` | Graph relationship hints |

### Multirepo tools
| Tool | Key parameters | Purpose |
|------|---------------|---------|
| `kaddo_modules_list` | `includeWarnings?` | List mapped modules and config status |
| `kaddo_get_module_context` | `module`, `includeTech?`, `includeWarnings?` | Local knowledge context for a module |
| `kaddo_validate_work_item_modules` | `workItemId` | Validate `affected_modules` coherence |
| `kaddo_get_work_item_context` | `workItemId`, `includeModuleContexts?`, `includeBranchStrategy?`, `includeGuardExpectations?` | Composite context for a multirepo WI |
| `kaddo_suggest_branch_strategy` | `workItemId` | Branch name, commit format, safety checklist |
| `kaddo_export_capsule` | `scope?`, `module?` | Export a Knowledge Capsule draft |
| `kaddo_modules_discover` | `apply?`, `confirm?` | Discover sibling repos as Kaddo modules |

### System graph traversal (impact candidates — never confirmed scope)
| Tool | Key parameters | Purpose |
|------|---------------|---------|
| `kaddo_system_search` | `query` | Search semantic topology by label / kind / purpose |
| `kaddo_system_node` | `nodeId` | One entity plus its relationships |
| `kaddo_system_neighbors` | `nodeId`, `maxDepth?`, `maxNodes?`, `relationshipTypes?`, `moduleId?` | Bounded BFS neighborhood |
| `kaddo_system_paths` | `from`, `to`, `maxDepth?` | Directed paths between two entities |
| `kaddo_system_impact_candidates` | `seeds[]`, `maxDepth?`, `maxNodes?`, `relationshipTypes?`, `moduleId?` | Impact candidates from seed entities |

### Derived tools (write only under `.kaddo/` — deterministic, no LLM)
Call when a resource reports a missing file; then re-read the resource.

| Tool | Key parameters | Writes |
|------|---------------|--------|
| `kaddo_generate_context` | — | `.kaddo/context-pack.md` + `.json` |
| `kaddo_generate_explain` | — | `.kaddo/explain.md` + `.json` |
| `kaddo_generate_understand` | — | `.kaddo/understand.md` |
| `kaddo_generate_graph` | `scope?: 'active'\|'all'` (default: `active`) | `.kaddo/graph.json` + `.mmd` + `graph-hints.md` + `graph-hints.json` |
| `kaddo_generate_capsule_draft` | — | `.kaddo/exports/<project>.capsule.md` + `.json` |
| `kaddo_generate_impact_report` | `format?: 'markdown'\|'json'`, `scope?: 'active'\|'all'`, `output?` | `.kaddo/reports/impact-report.md` |
| `kaddo_generate_savings_report` | `format?: 'markdown'\|'json'`, `scope?: 'active'\|'all'`, `output?` | `.kaddo/reports/savings-report.md` |
| `kaddo_generate_drift_report` | `format?: 'markdown'\|'json'`, `output?` | `.kaddo/reports/drift-report.md` |
| `kaddo_generate_questions_report` | `format?: 'markdown'\|'json'`, `output?` | `.kaddo/reports/questions-report.md` |

> `kaddo_generate_graph` writes **4 files** — not 2. Both the graph (`.json` + `.mmd`)
> and the hints (`.md` + `.json`) are regenerated together.

## MCP server — resources reference

Resources are readable URIs — use them for direct content access without a tool call.
See `resources.md` (auto-included when needed) for full usage guidance.

| URI | What it reads | When to use |
|-----|--------------|-------------|
| `kaddo://context-pack` | `.kaddo/context-pack.md` | Start of every session |
| `kaddo://explain` | `.kaddo/explain.md` | Knowledge maturity overview |
| `kaddo://understand` | `.kaddo/understand.md` | Current phase + recommended next step |
| `kaddo://next-step` | in-memory delivery state | State-aware next action recommendation |
| `kaddo://project-route` | in-memory lifecycle map | Where the project sits (new/pre-ai/legacy) |
| `kaddo://work-items` | `knowledge/delivery/work-items/` | All Work Items as JSON |
| `kaddo://roadmap` | `knowledge/delivery/roadmap.md` | Delivery roadmap |
| `kaddo://work-item-candidates` | roadmap parsed | WI-CANDIDATE-xxx items pending materialization |
| `kaddo://roadmap-quality` | in-memory | Roadmap grounding in capabilities/domains |
| `kaddo://roadmap-readiness` | in-memory | Blocking/important/deferred question gate |
| `kaddo://open-questions` | in-memory | All open questions classified by severity |
| `kaddo://tech-decisions` | in-memory | ADR candidates vs. materialized decisions |
| `kaddo://graph` | `.kaddo/graph.json` + `.mmd` | Knowledge graph |
| `kaddo://graph-hints` | `.kaddo/graph-hints.md` + `.json` | Graph relationship hints |
| `kaddo://capsules` | `.kaddo/external.yml` + `external/` | External Knowledge Capsules |
| `kaddo://agents` | `knowledge/agents/` | Installed agent prompts |
| `kaddo://skills` | `knowledge/skills/` | Installed reusable skills |
| `kaddo://skills/<id>` | `knowledge/skills/<id>/skill.md` | One skill's full instructions |
| `kaddo://scan-signals` | `.kaddo/scan.json` | Actionable signals from `kaddo scan` |
| `kaddo://guard-history` | `.kaddo/history/guard-runs.jsonl` | Recorded guard runs |
| `kaddo://installed-assets` | in-memory | Agents/skills version status (up-to-date/outdated) |
| `kaddo://impact-report` | `.kaddo/reports/impact-report.md` or in-memory | Knowledge Impact Report |
| `kaddo://savings-report` | `.kaddo/reports/savings-report.md` or in-memory | Estimated Savings Report |
| `kaddo://drift-report` | `.kaddo/reports/drift-report.md` or in-memory | Drift Trend Report |

> Resources marked "in-memory" are computed on read — they do not require a prior CLI run.
> Resources that read files return a hint message when the file is missing.

## Skills as MCP Prompts

Installed skills are also exposed as **MCP Prompts** under `skill-<id>` (e.g. `skill-adr-writing`).
MCP clients that support prompt invocation can call a skill directly as a prompt.
This is in addition to the `kaddo://skills/<id>` resource and `kaddo_get_skill` tool.

## Two-layer model

| Layer | Responsibility |
|-------|---------------|
| CLI   | Deterministic: init, scan, create work items, detect drift — no LLM |
| LLM (Kiro) | Understanding: extract capabilities, reconstruct architecture, propose roadmap, plan implementation |

The CLI never calls an LLM. Kiro never replaces the CLI.
The MCP server gives Kiro structured context so it never needs to scan the repo directly.
