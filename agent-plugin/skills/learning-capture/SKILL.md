---
name: learning-capture
description: Standardize how a Work Item's learning is captured and knowledge is updated when it closes.
---

## When to use

After implementation is complete and verified — before the Work Item is marked `completed`.

## Inputs

- The Work Item (full markdown via `kaddo_get_work_item`).
- The diff / result of the implementation.
- Any decisions, surprises, or scope changes that came up during implementation.
- Graph hints from `kaddo_list_graph_hints(active_only: true)`.

## Output

A structured learning record appended to the Work Item (or saved as a learning note), plus
a checklist of knowledge artifacts to update and MCP tools to run to keep the knowledge base
current.

## Steps

1. **Implementation summary** — what was built, in plain language. Reference files changed.
2. **What changed** — explicit delta: new capabilities, changed behavior, removed code,
   new dependencies, configuration changes, schema changes.
3. **What was learned** — surprises, incorrect assumptions, scope that expanded or shrank,
   edge cases discovered. Be honest about failures or dead ends.
4. **Decisions that emerged** — if a consequential technical decision was made during
   implementation, flag it for the `adr-writing` skill. Never silently absorb a decision
   into code without surfacing it.
5. **Knowledge to update** — name each artifact that needs updating:
   - `knowledge/tech/current-state.md` (if architecture changed).
   - `knowledge/tech/codebase.md` (if new patterns or structures were introduced).
   - `knowledge/tech/decisions/<ADR>.md` (new or updated ADR).
   - `knowledge/product/` capabilities (if a capability was realized or changed).
   - `knowledge/tech/modules/<id>/module-context.md` (multirepo).
   - `knowledge/delivery/roadmap.md` (if a roadmap candidate was addressed).
6. **Graph refresh** — call `kaddo_list_graph_hints(active_only: true)`.
   If hints exist, apply the `graph-metadata-review` skill to propose front-matter updates.
   Then call `kaddo_generate_graph` to regenerate `.kaddo/graph.json` and hints.
7. **Explain refresh** — call `kaddo_generate_explain` to update the knowledge maturity
   snapshot after knowledge artifacts have been updated.
8. **Pending items** — list anything left unresolved: open questions, deferred scope,
   follow-up Work Items to create.
9. **Commit and closure guidance** — suggest the commit message (conventional commits format)
   and the CLI commands for the human to run:
   ```bash
   kaddo scan         # refresh technical signals
   kaddo guard        # confirm no unexpected drift remains
   # git add <files>
   # git commit -m "type(scope): description"
   # git push
   ```
   Never run git commands — suggest only.

## Rules

- Do not close a Work Item without validation that acceptance criteria are met.
- Do not hide failures — record them honestly; they are the most valuable learnings.
- Do not assume everything is done if errors or open questions remain.
- Do not skip the graph refresh step — new code often introduces unmapped dependencies.
- Surface ADR candidates to the human; never write an ADR without a clear decision to record.

## Quality checklist

- [ ] Implemented vs changed vs learned are distinct sections.
- [ ] Decisions that emerged are identified (ADR candidates flagged).
- [ ] Knowledge artifacts to update are named specifically (not "update docs").
- [ ] Graph hints reviewed and `kaddo_generate_graph` called.
- [ ] `kaddo_generate_explain` called after knowledge updates.
- [ ] Pending items are listed, not hidden.
- [ ] Commit message suggested in conventional-commits format.
- [ ] CLI commands for scan, guard, and git suggested to the human.

## Example output

```markdown
## Learning Record — WI-042

### What was implemented
Added retry logic to the payment processor. Changed `src/payments/processor.ts` and
`src/payments/processor.test.ts`. Added `PAYMENT_MAX_RETRIES` to `.env.example`.

### What changed
- New behavior: payments retry up to 3 times on transient failure.
- New env var: `PAYMENT_MAX_RETRIES` (default: 3).
- No schema changes.

### What was learned
The existing circuit-breaker was not idempotency-safe. Filed as open question for ADR.

### Decisions that emerged
- [ ] ADR candidate: idempotency strategy for payment retries — surface to human.

### Knowledge to update
- `knowledge/tech/current-state.md` — document retry behavior.
- `knowledge/tech/decisions/` — new ADR for retry/idempotency decision.

### Graph refresh
- Called `kaddo_list_graph_hints(active_only: true)` — 2 hints found.
- Applied `graph-metadata-review` skill → proposed `capabilities: [payment-processing]`.
- Called `kaddo_generate_graph`.

### Pending items
- Idempotency ADR (blocked on architecture decision).
- Load-test retry behavior under high concurrency.
```
