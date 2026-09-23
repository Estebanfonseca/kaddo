---
inclusion: auto
name: kaddo-onboarding
description: Kaddo session workflow. Use when starting a new work session, picking up a Work Item, or when the user asks what to do next in a Kaddo project.
---

# Kaddo Onboarding & Session Workflow

When starting a new work session, follow this exact sequence.
Do not skip steps. Do not start coding without completing Steps 1–3.

---

## Step 1 — Assess Project Health

Understand the current state of the repository before anything else.

**Actions (in order):**
1. Read `kaddo://next-step`.
   - This is always available (in-memory) and gives an immediate state-aware orientation:
     current phase, recommended next action, and delivery-state counts.
   - If the project has no knowledge base yet, it will say so explicitly.
2. Execute `kaddo_project_status` for the structured snapshot:
   - If it fails with "needs explain.json", call `kaddo_generate_explain`, then retry.
   - If it fails with "needs context-pack.md", call `kaddo_generate_context`, then retry.
3. Check:
   - Knowledge layer maturity (Business / Product / Tech / Delivery).
   - Count of Work Items by lifecycle state (draft / ready / in-progress / blocked).
   - Graph quality and number of unreviewed hints in `.kaddo/graph-hints.json`.
   - Whether `isModuleRepo: true` (module repo vs core repo — different workflow applies).
   - Capsule count (external integrations the system depends on).
   - Whether `kaddo://open-questions` has any blocking questions — read it if `roadmap-readiness`
     shows blockers.

**If the project has no `.kaddo/context-pack.md` yet:**
- Call `kaddo_generate_context`. Confirm with the human before proceeding.

**If the project has no graph yet:**
- Call `kaddo_generate_graph`. Produces `.kaddo/graph.json`, `.mmd`, `graph-hints.md`, and
  `graph-hints.json`.

**If scan signals are needed (e.g. for planning a new Work Item):**
- Read `kaddo://scan-signals` — this surfaces the actionable signals from the last
  `kaddo scan` run (auth, payments, storage, migrations, etc.).

---

## Step 2 — Identify the Next Goal

Find what needs to be built based on the knowledge base.

**Actions:**
1. Execute `kaddo_list_work_items` with `status: "ready"`.
   - If no ready items, check `status: "draft"` to see what needs refinement.
   - Phase 0 items (monorepo init, OpenAPI contracts, infrastructure) always take
     precedence over feature implementation.
   - If no Work Items exist at all, read `kaddo://work-item-candidates` to find
     WI-CANDIDATE-xxx items in the roadmap that can be materialized with
     `kaddo create --from roadmap`.
2. Read `kaddo://roadmap-readiness` before starting a new initiative — check for
   blocking questions that should be resolved first.
3. Present top-priority Work Items to the human — never auto-select.
4. Wait for human selection before proceeding.

**If there are only draft Work Items:**
- Apply the `work-item-refinement` skill on the most important draft.
- Once refined, use `kaddo_mark_work_item_ready` (without `confirm`) to preview readiness.
- Present warnings to the human, and ask them to confirm with `confirm: true` before
  proceeding. The human can also run `kaddo ready <id>` from the CLI — both move the
  file from `work-items/draft/` to `work-items/ready/`.

---

## Step 3 — Deep Dive into the Work Item

Once the human selects a Work Item, prepare the full implementation context.
**Do not write any code until the human approves the plan from this step.**

**Actions (in order):**
1. Execute `kaddo_get_work_item("<WI-ID>")` to read the full context, front matter, scope,
   acceptance criteria, open questions, and scope confidence.
2. If the Work Item has `affected_modules`, execute:
   - `kaddo_validate_work_item_modules("<WI-ID>")` to check cross-repo coherence.
   - `kaddo_get_work_item_context("<WI-ID>", includeModuleContexts: true, includeBranchStrategy: true, includeGuardExpectations: true)`
     for the full composite context across affected modules.
3. Execute `kaddo_suggest_branch_strategy("<WI-ID>")` to establish:
   - The correct Git branch name per the project's git strategy.
   - Commit message format.
   - Safety checklist (scan, ownership, guard, knowledge update).
4. If `scope_confidence.level` is `low` or `module_coverage` contains `unknown` entries:
   - Read `kaddo://tech-decisions` to check if any relevant ADR candidates exist.
   - Run `kaddo_system_impact_candidates` with related capability / ADR IDs as seeds.
   - Present candidates to the human. Never expand scope without explicit confirmation.
5. Apply the `implementation-planning` skill to produce a step-by-step technical plan.
   Include: files to change, risks, validations, out-of-scope, stop criteria.
   **Present the plan to the human and wait for approval before writing any code.**

---

## Step 4 — Implementation

Write code following the approved plan only.

**Rules:**
- Create the branch per the strategy from Step 3 before writing any code.
- Never commit or push — suggest the command and wait for human confirmation.
- If scope needs to expand, pause and update the Work Item first.
- If a blocking dependency is found, transition the WI to `blocked` and surface it.
- After each meaningful change, suggest `kaddo guard` to the human to check for drift.

---

## Step 5 — Closure & Knowledge Update

After implementation is complete and verified:

**Actions (in order):**
1. Apply the `learning-capture` skill:
   - Document what was implemented, changed, and learned.
   - Identify capabilities to update.
   - Draft any ADRs that emerged (use `adr-writing` skill; check `kaddo://tech-decisions`
     for existing candidates to promote).
   - List pending items.
2. Execute `kaddo_list_graph_hints(active_only: true)` to review whether new code
   introduced dependencies that need mapping.
   - If hints exist, apply the `graph-metadata-review` skill.
3. Call `kaddo_generate_graph` to refresh `.kaddo/graph.json` and hints (4 files).
4. Call `kaddo_generate_explain` to update the knowledge maturity snapshot.
5. Read `kaddo://guard-history` if the human has been running `kaddo guard --record` —
   check whether new drift patterns emerged during this Work Item.
6. Read `kaddo://open-questions` to confirm no open questions were left unresolved.
   Surface any remaining blocking questions to the human before closing.
7. Suggest the human run from their terminal:
   ```bash
   kaddo scan          # refresh technical signals
   kaddo guard         # confirm no unexpected drift remains
   kaddo questions     # review any open questions report
   ```
8. Suggest the commit message (conventional commits format) and present it —
   the human executes `git commit` and `git push`.

---

## Module repo workflow (isModuleRepo: true)

When `kaddo_project_status` returns `isModuleRepo: true`:

1. Do **not** create Work Items — they live in the core system repo.
2. Focus on refining the module context:
   - Apply `module-context-refinement` skill.
   - Read `kaddo_get_module_context("<id>")` from the core repo to understand what
     the core already knows and what is missing.
3. Export a Knowledge Capsule when requested:
   - Call `kaddo_export_capsule` → draft lands in `.kaddo/exports/`.
   - The human runs `kaddo capsule add` in the core repo to import it.
4. For topology enrichment, the human may ask Kiro to produce a topology proposal YAML;
   they then validate with `kaddo topology validate <file>` and apply with
   `kaddo topology apply <file>` — this writes `knowledge/tech/system-topology.yml`.

---

## Quick-reference: when to call what

| Situation | Action |
|-----------|--------|
| Start of session | Read `kaddo://next-step` → `kaddo_project_status` |
| Missing explain.json | `kaddo_generate_explain` |
| Missing context-pack.md | `kaddo_generate_context` |
| Missing graph | `kaddo_generate_graph` |
| Check open questions | Read `kaddo://open-questions` |
| Check ADR candidates | Read `kaddo://tech-decisions` |
| Check scan signals | Read `kaddo://scan-signals` |
| Find next Work Item | `kaddo_list_work_items(status: "ready")` |
| Browse all WI candidates | Read `kaddo://work-item-candidates` |
| Read a Work Item | `kaddo_get_work_item("<id>")` |
| Assess WI readiness | `kaddo_mark_work_item_ready` (without confirm) |
| Transition draft → ready | `kaddo_mark_work_item_ready(confirm: true)` or `kaddo ready <id>` |
| Multirepo WI context | `kaddo_get_work_item_context(includeModuleContexts, includeBranchStrategy, includeGuardExpectations)` |
| Branch + commit format | `kaddo_suggest_branch_strategy("<id>")` |
| Scope uncertainty | `kaddo_system_impact_candidates` |
| Post-implementation hints | `kaddo_list_graph_hints(active_only: true)` |
| Guard history review | Read `kaddo://guard-history` |
| Module repo context | `kaddo_get_module_context("<id>")` |
| Validate modules in WI | `kaddo_validate_work_item_modules("<id>")` |
| Open questions report | `kaddo_generate_questions_report` or read `kaddo://open-questions` |
| Installed assets status | Read `kaddo://installed-assets` |
| Roadmap gate check | Read `kaddo://roadmap-readiness` |
