---
inclusion: always
---

# Kaddo Expert Power

This power brings the Kaddo framework into Kiro, making Kiro a native expert in KDD
(Knowledge Driven Development).

## Core principles

- Never write code based on assumptions. Knowledge comes first.
- Business rules belong in `knowledge/business/`.
- Product knowledge belongs in `knowledge/product/`.
- Architecture decisions belong in `knowledge/tech/decisions/`.
- Delivery plans belong in `knowledge/delivery/`.
- Code is the execution of that knowledge — not the other way around.

> KDD is a prior concept in software engineering. Kaddo applies it to AI-assisted
> software development; it did not invent it.

## How to orient yourself

- For project prerequisites, CLI reference and MCP tools → `getting-started.md`
- For the step-by-step session workflow → `onboarding.md`

## Strict rules

- Always read the context pack before proposing or implementing anything.
- Never invent Work Items, ADRs, capabilities, modules, or paths that don't exist in the knowledge base.
- Never start coding without an approved implementation plan.
- Never commit or push — suggest only; the human always confirms.
- When Guard signals a drift, surface it to the human before continuing.
- Never mark a Work Item as ready — that is `kaddo_mark_work_item_ready` with `confirm=true`, and only after the human explicitly confirms.
- Never resolve open questions silently — surface them and wait for human input.
- When `kaddo_generate_*` is needed to produce a missing derived artifact, call it, then re-read the resource before acting on it.

## Knowledge layers and what lives in each

| Layer | Path | Minimum artifacts |
|-------|------|------------------|
| Business | `knowledge/business/` | `business.md` |
| Product | `knowledge/product/` | `product.md`, `roadmap.md` |
| Tech | `knowledge/tech/` | `current-state.md`, `codebase.md`, `decisions/` |
| Delivery | `knowledge/delivery/` | `roadmap.md`, `work-items/` |

Optional modules add: `standards.md`, `security.md`, `stack.md`, `git-strategy.md`,
module descriptors under `knowledge/tech/modules/<id>/`, and Knowledge Capsules.

## Work Item lifecycle

Work Items live under `knowledge/delivery/work-items/` and move through:

```
draft → ready → in-progress → blocked → completed → archived
```

Only `ready` Work Items may be implemented. Transitions are triggered by the human via
`kaddo ready <id>` (CLI) or `kaddo_mark_work_item_ready` (MCP) — never by Kiro unilaterally.

Key front-matter fields to be aware of:

```yaml
type: feature | bug | task | spike | migration
status: draft | ready | in-progress | blocked | completed | archived
code:           # ownership globs — guard uses these
capabilities:   # related capabilities
decisions:      # related ADRs
affected_modules: # multirepo modules this WI touches
scope_confidence:
  level: high | medium | low
  reasons: []
impact_analysis:
  surfaces:
    product: { status: affected | reviewed-not-affected | unknown | not-applicable }
    frontend: ...
    backend: ...
module_coverage:
  <module-id>: { status: affected | ... }
refined_by:     # agent or human that refined this item
release_gates:  # optional: prerequisites for release
```

## MCP-first reading strategy

Before reading files directly, always prefer MCP tools:

1. `kaddo_project_status` — overall health snapshot.
2. `kaddo_list_work_items` — find what to work on.
3. `kaddo_get_work_item` — deep dive on a specific WI.
4. `kaddo_get_work_item_context` — composite context for multirepo WIs.
5. `kaddo_list_graph_hints` — spot weak or missing relationships.
6. `kaddo_system_impact_candidates` — widen impact scope before planning.

If a derived file is missing (context-pack.md, explain.json, graph.json, etc.), call
the matching `kaddo_generate_*` tool before attempting to read it. Never tell the human
"the file is missing" without first trying to regenerate it.

## Multirepo awareness

When `isModuleRepo: true` is returned by `kaddo_project_status`:
- This is a **module** repository, not the core. Do not create Work Items here.
- Agents and skills are managed by the core system repository.
- Use `module-context-refinement` skill to enrich `module-context.md`.
- Use `kaddo_get_module_context` and `kaddo_validate_work_item_modules` for cross-repo scope.

When `affected_modules` is present in a Work Item, validate with
`kaddo_validate_work_item_modules` before planning implementation.

## Guard and ownership

Guard is non-blocking. A FYI means knowledge *may* be drifting — it does not block.

When Guard signals drift:
1. Surface the FYI to the human with the affected artifact ID and the changed paths.
2. Ask whether the artifact should be updated before continuing.
3. Never assume the artifact is already current.

Ownership is declared in front-matter `code:` globs — not in a central file.
Propose globs with the `ownership-suggestion` skill; the human applies with `kaddo owners suggest`.

## System graph

The system graph in `.kaddo/graph.json` maps entities (capabilities, ADRs, Work Items,
modules, capsules) and their relationships. Tools prefixed `kaddo_system_*` traverse it.

Results from `kaddo_system_impact_candidates` are **candidates to investigate**, not
confirmed scope. Never update a Work Item's scope based on graph traversal alone — present
findings to the human for confirmation.

## Context efficiency

Kaddo reduces the Repository Exploration Tax: instead of scanning the repo, Kiro starts
from the structured context pack. This leads to better decisions and lower token
consumption as a side effect — not as a goal.

Always start from `kaddo://context-pack` or `kaddo_project_status`. Only read source files
when the knowledge base explicitly points to them or when implementing code.
