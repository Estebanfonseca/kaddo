---
name: implementation-planning
description: Standardize the plan produced before implementation starts, including branch strategy and delivery protocol.
---

## When to use

Before writing any code for a ready Work Item.

## Inputs

- Context pack (`kaddo_project_status` + `kaddo_get_work_item("<WI-ID>")`).
- Branch strategy from `kaddo_suggest_branch_strategy("<WI-ID>")`.
- For multirepo: `kaddo_get_work_item_context` (composite context across affected modules).
- For low `scope_confidence` or `unknown` module coverage: `kaddo_system_impact_candidates`
  results reviewed and confirmed by the human.

## Output

A numbered implementation plan presented to the human for approval before any code is written.

## Steps

1. **Pre-implementation scope review** — verify these are consistent:
   - Expected result vs current behavior in the Work Item.
   - `impact_analysis.surfaces` vs what the plan actually touches.
   - `module_coverage` vs `affected_modules` — flag contradictions (e.g. a user-facing
     change where `frontend` is `reviewed-not-affected`).
   - Any `scope_unknowns` — resolve or explicitly acknowledge as out of scope.
   - `release_gates` — list any gates that must be met before release.
2. **Branch strategy** — present the branch name and commit format from
   `kaddo_suggest_branch_strategy`. The first action in implementation is always creating
   this branch. Work never lands on `main` / `master` directly.
3. **Module validation** (multirepo) — if `affected_modules` is set, run
   `kaddo_validate_work_item_modules` and surface any incoherence to the human.
4. **Technical scope** — list files to change and why, grouped by layer
   (business logic / API / data / frontend / config / tests / knowledge artifacts).
5. **Risks and mitigations** — note breaking changes, migration needs, security surface,
   performance implications, and Guard expectations (which `code:` globs will be touched).
6. **Validations** — define how each acceptance criterion will be verified (unit test,
   integration test, manual check, `kaddo guard` pass).
7. **Out of scope** — explicitly list what is not being done in this Work Item.
8. **Implementation steps** — numbered, ordered, small enough to be atomic.
9. **Stop criteria** — define when to pause and ask the human:
   - Scope creep detected.
   - Blocking dependency found.
   - A surface marked `unknown` turns out to be affected.
   - Guard signals unexpected drift.
10. **Knowledge update checklist** — what knowledge artifacts need updating after
    implementation: capabilities, ADRs, current-state.md, module-context.md, etc.

## Delivery protocol

After the human approves the plan:

1. Create the branch (`git checkout -b <branch-name>`) — suggest the command, human runs it.
2. Implement step by step.
3. After each meaningful change: suggest `kaddo guard` and review output.
4. At completion: suggest `kaddo scan` to refresh technical signals.
5. Suggest the commit message in conventional-commits format (`type(scope): description`).
6. Never run `git commit` or `git push` — suggest only, human confirms.

## Rules

- Do not start coding without human confirmation of this plan.
- Do not expand scope without updating the Work Item first.
- Never make commits or push — suggest only.
- Never skip the branch-first step — code never lands directly on `main`.
- If a `release_gate` is unmet, surface it before starting implementation, not after.
- If `scope_confidence` is `low`, acknowledge unresolved unknowns explicitly in the plan.

## Quality checklist

- [ ] Pre-implementation scope review is documented.
- [ ] Branch name and commit format are specified (from `kaddo_suggest_branch_strategy`).
- [ ] Module coherence validated (multirepo).
- [ ] Scope and expected files are explicit, grouped by layer.
- [ ] Risks and Guard expectations are listed.
- [ ] Validations map to acceptance criteria.
- [ ] Out of scope is explicit.
- [ ] Stop criteria are defined.
- [ ] Knowledge update checklist is present.
- [ ] Plan ends with a request for human confirmation before coding starts.

## Example output

A numbered plan covering the ten sections above, followed by:

> "Plan ready. Please confirm to proceed with implementation, or let me know what to adjust."
