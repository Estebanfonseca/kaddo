# power-kaddo

A Kiro Power that brings [Kaddo](https://kaddo.trycatch.tv/es/) — the Knowledge Driven
Development toolkit — natively into Kiro.

The power connects Kiro to the Kaddo MCP server, loads structured KDD steering, and
ships eight agent skills so Kiro can act as a first-class expert in the Kaddo lifecycle:
context reading, Work Item refinement, implementation planning, ownership, graph
metadata, ADR writing, capsule writing, and learning capture.

---

## Requirements

| Requirement | Notes |
|-------------|-------|
| Kiro IDE | Powers support required |
| Node.js ≥ 18 | `npx` must be available in PATH |
| Kaddo CLI | `npm install -g @kaddo/cli` |
| Initialized repo | `.kaddo/` and `knowledge/` directories must exist |

Initialize a repo that doesn't have them yet:

```bash
kaddo init
kaddo scan
```

---

## Installation

### 1. Install the power in Kiro

Open the Kiro Powers panel and install **power-kaddo**, or point Kiro to this
directory if installing locally.

### 2. Configure the MCP server

Add the Kaddo MCP server to your workspace MCP config at `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "kaddo": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@kaddo/mcp"],
      "env": {
        "KADDO_PROJECT_DIR": "/absolute/path/to/your/project"
      }
    }
  }
}
```

Set `KADDO_PROJECT_DIR` to the absolute path of the repository root where `.kaddo/`
lives. You can also set it as a system environment variable instead of hardcoding it.

### 3. Verify the connection

In Kiro, open the MCP Server panel and confirm the `kaddo` server shows as connected.
Then ask Kiro:

> "What is the current Kaddo project status?"

Kiro will call `kaddo_project_status` and report back.

---

## Included skills

| Skill | Group | Purpose |
|-------|-------|---------|
| `adr-writing` | tech | Write Architecture Decision Records consistently |
| `work-item-refinement` | delivery | Sharpen a draft Work Item into a ready, implementable item — including impact analysis, scope confidence, module coverage and readiness preview |
| `implementation-planning` | delivery | Produce a reviewed plan before writing any code, including branch strategy and delivery protocol |
| `learning-capture` | delivery | Document what was learned when closing a Work Item, with graph refresh and knowledge update checklist |
| `ownership-suggestion` | tech | Propose precise `code:` ownership globs for Guard |
| `graph-metadata-review` | tech | Turn `kaddo graph export` hints into front matter proposals, using system graph traversal for impact widening |
| `module-context-refinement` | tech | Refine a multirepo module's `module-context.md` using MCP multirepo tools |
| `capsule-writing` | integration | Write Knowledge Capsules for unmapped external systems |

Skills are also exposed as **MCP Prompts** under `skill-<id>` (e.g. `skill-adr-writing`)
so MCP clients that support prompt invocation can call them directly.

---

## Steering files

| File | Inclusion | Purpose |
|------|-----------|---------|
| `power-kaddo.md` | always | Core KDD principles, strict agent rules, MCP-first strategy, Work Item lifecycle, Guard and multirepo awareness |
| `getting-started.md` | always | Prerequisites, operating moments, full CLI reference, all MCP tools with parameters, full resources catalog |
| `onboarding.md` | auto | 5-step session workflow — project health, goal identification, deep dive, implementation, closure |
| `resources.md` | auto | Complete MCP resource catalog with usage guidance — when to read which URI |

---

## MCP tools

The `@kaddo/mcp` server exposes **30 tools** to Kiro. Kiro never needs to scan the
source repository directly.

### Read-only tools

| Tool | Key parameters | Purpose |
|------|---------------|---------|
| `kaddo_project_status` | — | Compact project health snapshot |
| `kaddo_list_work_items` | `status?` `type?` `knowledge_level?` | Filter Work Items |
| `kaddo_get_work_item` | `id` | Full Work Item by ID (summary + markdown) |
| `kaddo_mark_work_item_ready` | `id`, `confirm?: boolean` | Preview readiness or transition draft → ready |
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
| `kaddo_get_work_item_context` | `workItemId`, `includeModuleContexts?`, `includeBranchStrategy?`, `includeGuardExpectations?` | Composite context for a multirepo Work Item |
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

> Results from `kaddo_system_*` are **candidates to investigate** — not confirmed scope.
> Present findings to the human before expanding a Work Item's scope.

### Derived tools (write only under `.kaddo/` — deterministic, no LLM)

Call when a resource reports a missing file; then re-read the resource.

| Tool | Key parameters | Writes |
|------|---------------|--------|
| `kaddo_generate_context` | — | `.kaddo/context-pack.md` + `.json` |
| `kaddo_generate_explain` | — | `.kaddo/explain.md` + `.json` |
| `kaddo_generate_understand` | — | `.kaddo/understand.md` |
| `kaddo_generate_graph` | `scope?: 'active'\|'all'` | `.kaddo/graph.json` + `.mmd` + `graph-hints.md` + `graph-hints.json` (4 files) |
| `kaddo_generate_capsule_draft` | — | `.kaddo/exports/<project>.capsule.md` + `.json` |
| `kaddo_generate_impact_report` | `format?`, `scope?`, `output?` | `.kaddo/reports/impact-report.md` |
| `kaddo_generate_savings_report` | `format?`, `scope?`, `output?` | `.kaddo/reports/savings-report.md` |
| `kaddo_generate_drift_report` | `format?`, `output?` | `.kaddo/reports/drift-report.md` |
| `kaddo_generate_questions_report` | `format?`, `output?` | `.kaddo/reports/questions-report.md` |

`format` accepts `'markdown'` (default) or `'json'`. `scope` accepts `'active'` or `'all'`.

---

## MCP resources

The server also exposes **24 resource URIs** (plus one per installed skill).
Resources are readable directly — no tool call needed.

### Session orientation
| URI | Source | Notes |
|-----|--------|-------|
| `kaddo://next-step` | in-memory | **First read every session.** State-aware next-action recommendation. |
| `kaddo://project-route` | in-memory | Lifecycle progress map (new / pre-ai / legacy). |
| `kaddo://context-pack` | `.kaddo/context-pack.md` | Full curated LLM context. |
| `kaddo://understand` | `.kaddo/understand.md` | Phase guidance + CLI-recommended next step. |
| `kaddo://explain` | `.kaddo/explain.md` | Knowledge maturity overview. |

### Work Items and delivery
| URI | Source | Notes |
|-----|--------|-------|
| `kaddo://work-items` | `knowledge/delivery/work-items/` | All Work Items as JSON. |
| `kaddo://roadmap` | `knowledge/delivery/roadmap.md` | Full delivery roadmap. |
| `kaddo://work-item-candidates` | roadmap (in-memory) | WI-CANDIDATE-xxx items pending materialization. |
| `kaddo://roadmap-quality` | in-memory | Roadmap grounding in capabilities / domains. |
| `kaddo://roadmap-readiness` | in-memory | Blocking / important / deferred question gate. |

### Knowledge health
| URI | Source | Notes |
|-----|--------|-------|
| `kaddo://open-questions` | in-memory | Open questions classified by severity. |
| `kaddo://tech-decisions` | in-memory | ADR candidates vs. materialized decisions. |
| `kaddo://installed-assets` | in-memory | Agents / skills version status. |
| `kaddo://scan-signals` | `.kaddo/scan.json` | Actionable signals from `kaddo scan`. |

### Graph
| URI | Source | Notes |
|-----|--------|-------|
| `kaddo://graph` | `.kaddo/graph.json` + `.mmd` | Knowledge graph. |
| `kaddo://graph-hints` | `.kaddo/graph-hints.md` + `.json` | Relationship quality hints. |

### Agents, skills, capsules
| URI | Source | Notes |
|-----|--------|-------|
| `kaddo://agents` | `knowledge/agents/` | Installed agent prompts. |
| `kaddo://skills` | `knowledge/skills/` | Installed skills list. |
| `kaddo://skills/<id>` | per-skill file | One skill's full instructions. |
| `kaddo://capsules` | `.kaddo/external.yml` | External Knowledge Capsules. |

### Reports and guard history
| URI | Source | Notes |
|-----|--------|-------|
| `kaddo://guard-history` | `.kaddo/history/guard-runs.jsonl` | Requires `kaddo guard --record`. |
| `kaddo://impact-report` | `.kaddo/reports/` or in-memory | Knowledge Impact Report. |
| `kaddo://savings-report` | `.kaddo/reports/` or in-memory | Estimated Savings Report. |
| `kaddo://drift-report` | `.kaddo/reports/` or in-memory | Drift Trend Report. |

---

## Typical session flow

```
1. kaddo://next-step                         → immediate orientation
   kaddo_project_status                      → structured health snapshot
   └─ if missing artifacts → kaddo_generate_*

2. kaddo_list_work_items (status: "ready")   → identify next Work Item
   kaddo://work-item-candidates              → if no WIs exist yet
   kaddo://roadmap-readiness                 → check for blocking questions
   └─ if only drafts → work-item-refinement skill

3. kaddo_get_work_item("<WI-ID>")            → deep dive
   kaddo_suggest_branch_strategy("<WI-ID>")  → branch + commit format
   kaddo_get_work_item_context (multirepo)   → composite context
   kaddo_system_impact_candidates            → if low scope confidence

4. implementation-planning skill             → produce plan, get human approval

5. write code following the plan
   └─ suggest kaddo guard after each meaningful change

6. learning-capture skill                    → document what was learned
   kaddo_list_graph_hints (active_only)      → review new dependencies
   graph-metadata-review skill               → propose front matter updates
   kaddo_generate_graph                      → refresh graph (4 files)
   kaddo_generate_explain                    → refresh knowledge maturity
   kaddo://guard-history                     → review drift patterns
   kaddo://open-questions                    → confirm no unresolved questions
```

See `dev.kiro/steering/onboarding.md` for the full 5-step workflow.
See `dev.kiro/steering/resources.md` for resource usage guidance.

---

## Work Item lifecycle

```
draft → ready → in-progress → blocked → completed → archived
```

Files live under `knowledge/delivery/work-items/<state>/`.

`kaddo ready <id>` (CLI) or `kaddo_mark_work_item_ready(confirm: true)` (MCP) moves the
file from `draft/` to `ready/`. Only the human triggers this — never Kiro unilaterally.

---

## Notable CLI commands

Beyond the common commands (`init`, `scan`, `context`, `guard`, `explain`):

| Command | Purpose |
|---------|---------|
| `kaddo ready <id>` | Validate and transition a draft WI to ready |
| `kaddo questions` | List open questions classified by readiness severity |
| `kaddo drift` | Drift trend report from guard history |
| `kaddo savings` | Estimated context-efficiency savings report |
| `kaddo adr` | List ADR candidates vs. materialized decisions |
| `kaddo topology validate <f>` | Validate a topology proposal before applying |
| `kaddo topology apply <f>` | Apply topology → `knowledge/tech/system-topology.yml` |
| `kaddo tech organize` | Move discovery files to `knowledge/tech/discovery/` |
| `kaddo classify` | Classification Drift from diff signals |
| `kaddo ignore` | Ignore a guard FYI with a reason |
| `kaddo admin` | Local web UI on port 4173 (SQLite at `.kaddo/admin/admin.db`) |
| `kaddo guard --record` | Record this guard run to guard-history |
| `kaddo guard --workspace` | Run guard across mapped multirepo modules |

---

## Adapters

Generate a native instruction file for your AI coding tool:

```bash
kaddo adapters install kiro          # write AGENTS.md for Kiro
kaddo adapters install claude        # write CLAUDE.md for Claude Code
kaddo adapters install codex         # write AGENTS.md for Codex / OpenCode
kaddo adapters install kiro --inject # update only the Kaddo block in a team-owned file
kaddo adapters install kiro --force  # overwrite an existing file
kaddo adapters status                # check install state of each adapter
```

---

## Project structure

```
power-kaddo/
├── plugin.json                          # Power manifest
├── mcp.json                             # MCP server declaration
├── README.md                            # This file
├── dev.kiro/
│   └── steering/
│       ├── power-kaddo.md               # Core rules (always)
│       ├── getting-started.md           # CLI & MCP reference with parameters (always)
│       ├── onboarding.md                # 5-step session workflow (auto)
│       └── resources.md                 # MCP resource catalog with usage guidance (auto)
└── skills/
    ├── adr-writing/SKILL.md
    ├── capsule-writing/SKILL.md
    ├── graph-metadata-review/SKILL.md
    ├── implementation-planning/SKILL.md
    ├── learning-capture/SKILL.md
    ├── module-context-refinement/SKILL.md
    ├── ownership-suggestion/SKILL.md
    └── work-item-refinement/SKILL.md
```

---

## License

MIT — see [Kaddo](https://kaddo.trycatch.tv/es/) for the full project.
