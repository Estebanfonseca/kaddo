---
inclusion: auto
name: kaddo-resources
description: Complete catalog of Kaddo MCP resource URIs. Use when deciding which resource to read for a given situation — project health, Work Items, roadmap, graph, decisions, questions, scan signals, reports, or guard history.
---

# Kaddo MCP Resources — Usage Guide

Resources are readable URIs served by the `@kaddo/mcp` server. Prefer resources for
direct content access; use tools when you need filtering, computation, or writes.

Resources marked **in-memory** are always available — they are computed on the fly
and do not require a prior CLI run. Resources that read files return a hint when the
file is missing; call the matching `kaddo_generate_*` tool and then re-read.

---

## Session orientation (read first)

| URI | When to use | Source |
|-----|------------|--------|
| `kaddo://next-step` | First read of every session. State-aware recommendation: what to do now, with delivery-state counts behind it. | in-memory |
| `kaddo://project-route` | Understand where this project sits in its lifecycle (new / pre-ai / legacy), what steps are done, what is current. | in-memory |
| `kaddo://context-pack` | Full curated LLM context pack — read before any planning or implementation. | `.kaddo/context-pack.md` |
| `kaddo://understand` | Current phase guidance and recommended next action from the CLI's perspective. | `.kaddo/understand.md` |
| `kaddo://explain` | Knowledge maturity overview across all four layers. | `.kaddo/explain.md` |

**Preferred session start sequence:**
1. `kaddo://next-step` — immediate orientation without requiring derived files.
2. `kaddo_project_status` — structured snapshot (includes layers, WI counts, graph quality).
3. `kaddo://context-pack` — full knowledge context before planning.

---

## Work Items and delivery

| URI | When to use | Source |
|-----|------------|--------|
| `kaddo://work-items` | All Work Items as structured JSON (summary + front matter). Useful for a broad scan before filtering with `kaddo_list_work_items`. | `knowledge/delivery/work-items/` |
| `kaddo://roadmap` | Full delivery roadmap markdown — initiatives, candidates, and milestones. | `knowledge/delivery/roadmap.md` |
| `kaddo://work-item-candidates` | WI-CANDIDATE-xxx items parsed from the roadmap, not yet materialized. Read before `kaddo create --from roadmap`. | roadmap parsed in-memory |
| `kaddo://roadmap-quality` | How well roadmap initiatives are grounded in capability domains and signals. Read when planning or reviewing the roadmap. | in-memory |
| `kaddo://roadmap-readiness` | Decision gate: blocking / important / deferred open questions before the roadmap. Read before starting a new initiative. | in-memory |

---

## Knowledge health and open questions

| URI | When to use | Source |
|-----|------------|--------|
| `kaddo://open-questions` | All open questions from business / product / codebase / roadmap, classified by severity (`blocking`, `important`, `deferred`). Read when assessing readiness or when `roadmap-readiness` shows blockers. | in-memory |
| `kaddo://tech-decisions` | ADR candidates vs. materialized ADRs — counts, candidate list, suggested filenames. Read before using the `adr-writing` skill or running `kaddo adr`. | in-memory |
| `kaddo://installed-assets` | Version status of every installed agent and skill: `up-to-date`, `outdated`, `modified`, `missing`. Read when `kaddo_project_status` hints at stale assets. | in-memory |
| `kaddo://scan-signals` | Actionable signals from the last `kaddo scan`: auth, payments, storage, background jobs, migrations, security, etc. Read when planning or when scan.json exists but its signals are unknown. | `.kaddo/scan.json` |

---

## Knowledge graph

| URI | When to use | Source |
|-----|------------|--------|
| `kaddo://graph` | Knowledge graph as JSON + Mermaid. Read before using `kaddo_system_*` tools or `graph-metadata-review` skill. If missing, call `kaddo_generate_graph`. | `.kaddo/graph.json` + `.mmd` |
| `kaddo://graph-hints` | Relationship quality hints — which artifacts have weak or missing relationships. Read at the end of an implementation cycle or when graph quality is `partial`/`sparse`. | `.kaddo/graph-hints.md` + `.json` |

---

## Agents, skills, and capsules

| URI | When to use | Source |
|-----|------------|--------|
| `kaddo://agents` | List of installed agent prompts with descriptions. Read when deciding which agent to activate. | `knowledge/agents/` |
| `kaddo://skills` | List of installed reusable skills. Read when composing an agent workflow. | `knowledge/skills/` |
| `kaddo://skills/<id>` | Full instructions for one skill (e.g. `kaddo://skills/adr-writing`). Read instead of `kaddo_get_skill` when you know the skill ID and want direct content. | `knowledge/skills/<id>/skill.md` |
| `kaddo://capsules` | All registered external Knowledge Capsules. Read before planning integration work. | `.kaddo/external.yml` + `external/` |

---

## Reports and guard history

| URI | When to use | Source |
|-----|------------|--------|
| `kaddo://guard-history` | Recorded guard runs (JSONL). Read when analyzing drift trends or before calling `kaddo_generate_drift_report`. Requires `kaddo guard --record` to have been run at least once. | `.kaddo/history/guard-runs.jsonl` |
| `kaddo://impact-report` | Knowledge Impact Report. Returns the last written report or builds one in memory. Read when assessing knowledge coverage quality. | `.kaddo/reports/impact-report.md` or in-memory |
| `kaddo://savings-report` | Estimated context-efficiency savings. Returns the last written report or builds in memory. Read when reporting on KDD value. | `.kaddo/reports/savings-report.md` or in-memory |
| `kaddo://drift-report` | Drift trend over time from guard history. Returns the last written report or builds in memory. Read when reviewing recurring drift patterns. | `.kaddo/reports/drift-report.md` or in-memory |

---

## Resource vs. tool — when to use which

| Situation | Prefer |
|-----------|--------|
| Start of session, no filters needed | Resource: `kaddo://next-step`, then `kaddo://context-pack` |
| Find next Work Item | Tool: `kaddo_list_work_items(status: "ready")` |
| Read one specific Work Item | Tool: `kaddo_get_work_item("<id>")` |
| Browse all Work Items | Resource: `kaddo://work-items` |
| Check for open questions | Resource: `kaddo://open-questions` |
| Check roadmap blockers | Resource: `kaddo://roadmap-readiness` |
| Review ADR candidates | Resource: `kaddo://tech-decisions` |
| Get one skill's instructions | Resource: `kaddo://skills/<id>` or Tool: `kaddo_get_skill` |
| Get graph for system analysis | Resource: `kaddo://graph` → then Tool: `kaddo_system_*` |
| Review post-implementation hints | Tool: `kaddo_list_graph_hints(active_only: true)` |
| Check scan signals | Resource: `kaddo://scan-signals` |
| Review guard history | Resource: `kaddo://guard-history` |
| Missing derived file | Tool: `kaddo_generate_*` → re-read resource |

---

## Handling missing resources

When any resource returns a "not found / run X first" message:

| Resource | Missing message | Fix |
|----------|----------------|-----|
| `kaddo://context-pack` | "Run `kaddo context` first" | Call `kaddo_generate_context` |
| `kaddo://explain` | "Run `kaddo explain` first" | Call `kaddo_generate_explain` |
| `kaddo://understand` | "Run `kaddo understand` first" | Call `kaddo_generate_understand` |
| `kaddo://graph` | "Run `kaddo graph export` first" | Call `kaddo_generate_graph` |
| `kaddo://graph-hints` | "Run `kaddo graph export` first" | Call `kaddo_generate_graph` |
| `kaddo://guard-history` | "No guard history recorded" | Suggest `kaddo guard --record` to the human |
| `kaddo://scan-signals` | "Run `kaddo scan` first" | Suggest `kaddo scan` to the human |
| `kaddo://roadmap` | "Create roadmap.md first" | Suggest the roadmap-agent to the human |
