---
name: work-item-refinement
description: Standardize how a Work Item is sharpened from a rough idea into a ready, implementable item.
---

## When to use

When improving a draft Work Item, or turning a backlog idea / roadmap candidate into a ready item.

## Inputs

The context pack (`kaddo_project_status` + `kaddo_get_work_item`), and the Work Item (draft or
candidate). For multirepo projects, also `kaddo_get_work_item_context` and
`kaddo_validate_work_item_modules`.

## Output

An improved Work Item with all sections filled, front matter complete, and a readiness preview
from `kaddo_mark_work_item_ready` (without `confirm`) listing any remaining warnings.

## Steps

1. **Outcome framing** — identify actor, current behavior, target behavior, observable completion.
2. **Journey reconstruction** — map entry point, interaction, service/API, state change, response,
   final outcome. Required for user-facing changes.
3. **Surface review** — evaluate each surface with one of: `affected`, `reviewed-not-affected`,
   `unknown`, `not-applicable`:
   - product/UI, frontend, backend, database, configuration, feature flags,
     content/copy, authentication/authorization, notifications, analytics,
     documentation, operations/release.
   - Record in `impact_analysis.surfaces` front-matter.
4. **Module review** — for multirepo, evaluate each mapped module using
   `kaddo_get_module_context` and record in `module_coverage` front-matter.
   - Call `kaddo_validate_work_item_modules` to check coherence.
5. **Scope confidence** — declare `scope_confidence.level` (`high`/`medium`/`low`) with reasons.
   If `low`, call `kaddo_system_impact_candidates` using related capability/ADR IDs as seeds
   and surface findings before proceeding.
6. **Completeness review** — confirm: outcome covered, journey covered, modules assessed,
   unknowns visible, acceptance criteria end-to-end, scope and out-of-scope coherent.
7. **Readiness preview** — call `kaddo_mark_work_item_ready("<WI-ID>")` without `confirm`.
   Present warnings to the human. Do **not** call with `confirm: true` — that is the human's action.

## Front-matter fields to populate

```yaml
---
type: feature | bug | task | spike | migration
id: WI-XXX
title: ""
status: draft
knowledge_level: K1 | K2 | K3
summary: ""
code:
  - src/...   # ownership globs — use ownership-suggestion skill
capabilities:
  - capability-id
decisions:
  - ADR-XXX
affected_modules:
  - module-id   # multirepo only
scope_confidence:
  level: high | medium | low
  reasons:
    - ""
impact_analysis:
  surfaces:
    product: { status: affected | reviewed-not-affected | unknown | not-applicable }
    frontend: { status: ... }
    backend: { status: ... }
    database: { status: ... }
    configuration: { status: ... }
    authentication: { status: ... }
    notifications: { status: ... }
    analytics: { status: ... }
    documentation: { status: ... }
    operations: { status: ... }
module_coverage:
  <module-id>: { status: affected | reviewed-not-affected | unknown | not-applicable, reason: "" }
scope_unknowns:
  - ""
refined_by: ""
release_gates:
  - { id: "gate-id", status: pending | met | waived, reason: "" }
---
```

## Rules

- Do not implement code.
- Do not expand scope without explicit confirmation from the human.
- Do not create mega Work Items — split when it covers multiple outcomes.
- Keep acceptance criteria testable and include at least one end-to-end criterion for user-facing changes.
- Do not reduce a product intent to the first technical implementation found.
- Evaluate surfaces and modules before proposing files.
- `scope_unknowns` must surface all modules/surfaces with status `unknown` — never hide them.
- This skill refines scope and acceptance criteria but does **not** approve implementation readiness.
  Readiness requires human confirmation via `kaddo ready` CLI or `kaddo_mark_work_item_ready` with `confirm: true`.

## Quality checklist

- [ ] Actor and outcome are identified.
- [ ] Current and target behavior are documented.
- [ ] Journey is reconstructed for user-facing changes.
- [ ] All surfaces evaluated with explicit statuses in `impact_analysis.surfaces`.
- [ ] All modules evaluated in `module_coverage` (multirepo).
- [ ] `scope_confidence` declared with reasons.
- [ ] `scope_unknowns` lists every `unknown` surface/module.
- [ ] Problem and expected result are unambiguous.
- [ ] Scope and out-of-scope are explicit.
- [ ] Acceptance criteria include end-to-end validation when applicable.
- [ ] Open questions are surfaced, not hidden.
- [ ] `refined_by` is set.
- [ ] `release_gates` declared if prerequisites exist.
- [ ] Readiness preview shown to human (`kaddo_mark_work_item_ready` without confirm).

## Example output

A Work Item markdown with all sections above filled in, ending with the readiness preview
output (warnings list or "ready candidate") for the human to review and confirm.
