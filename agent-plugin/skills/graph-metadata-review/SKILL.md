---
name: graph-metadata-review
description: Standardize how `kaddo graph export` hints become precise relationship front matter, using system graph traversal tools to widen impact understanding.
---

## When to use

- When relationship quality is `partial`, `sparse`, or `empty` in `.kaddo/graph-hints.md`.
- When reviewing `.kaddo/graph-hints.md` after implementation (from `learning-capture`).
- When assessing impact scope during Work Item refinement or planning.

## Inputs

- Context pack.
- `kaddo_list_graph_hints` output (optionally filtered by `artifact_type`, `severity`, `active_only`).
- `.kaddo/graph.json` (via `kaddo://graph` resource).
- The affected artifacts (Work Items, ADRs, capabilities).
- For impact widening: `kaddo_system_impact_candidates` with seed entity IDs.

## Output

Front-matter proposals per artifact, grouped and reasoned. These are proposals only — the
human applies them and re-runs `kaddo graph export` (or calls `kaddo_generate_graph`).

## Steps

1. **Read current hints** — call `kaddo_list_graph_hints` (use `active_only: true` for
   post-implementation review, omit for a full audit).
   Note the overall `quality` and `scope` fields.

2. **Triage hints by severity**:
   - `high` — missing relationships that block understanding; address first.
   - `medium` — partial or inferred relationships; refine when possible.
   - `low` — cosmetic gaps; propose if the evidence is clear.

3. **Resolve relationships from known artifacts** — for each hint, check:
   - Do the capabilities listed in the WI/ADR actually exist in `knowledge/`?
   - Do the `code:` globs match real paths in the repo?
   - Are capsule IDs registered in `.kaddo/external.yml`?
   - Are ADR IDs real files under `knowledge/tech/decisions/`?

4. **Widen impact with system graph** (when scope_confidence is low or hints are high-severity):
   - Call `kaddo_system_search` to find entities by label or purpose.
   - Call `kaddo_system_node` to resolve an entity's direct relationships.
   - Call `kaddo_system_neighbors` for bounded BFS exploration around a seed entity.
   - Call `kaddo_system_paths` to find directed paths between two entities.
   - Call `kaddo_system_impact_candidates` with the affected entities as seeds to get
     a broader set of candidates to investigate.
   > **These are candidates to investigate — not confirmed scope.** Never update a Work
   > Item's scope based on graph traversal alone. Present findings to the human.

5. **Propose front matter** — for each artifact with resolvable hints, propose:
   ```yaml
   capabilities:
     - capability-id
   decisions:
     - ADR-XXX
   code:
     - src/path/**
   capsules:
     - external-system-id
   ```
   One YAML block per artifact. Include a one-line rationale for each entry.

6. **Mark unresolvable hints** — for hints where evidence is insufficient, state explicitly:
   `[unresolved — insufficient evidence]`. Never invent relationships.

7. **Refresh graph** — after the human applies the proposals, suggest:
   ```bash
   kaddo graph export   # CLI
   # or via MCP:
   kaddo_generate_graph
   ```

## Rules

- Never invent relationships, paths, IDs, or capabilities.
- Do not resolve every hint in one pass — propose only what is justified by evidence.
- Do not modify artifacts directly — proposals only; the human applies.
- System graph results are **impact candidates**, not confirmed relationships.
- Prefer narrow `code:` globs; flag broad globs as uncertain.

## Quality checklist

- [ ] Hints triaged by severity before resolving.
- [ ] Each proposed relationship maps to a real artifact/path/capability/ADR/capsule.
- [ ] `code:` globs are narrow and validated against real paths.
- [ ] Unresolvable hints marked explicitly, not silently skipped.
- [ ] System graph traversal used when scope confidence is low (results surfaced as candidates).
- [ ] Rationale provided per proposed entry.
- [ ] Graph refresh step included.

## Example output

```yaml
# WI-042 — Payment Retry Logic
capabilities:
  - payment-processing     # WI body references this capability directly
decisions:
  - ADR-005               # ADR-005 governs retry strategy (confirmed in WI text)
code:
  - src/payments/**       # all changed files are under this path
  - src/shared/retry/**   # new utility introduced during implementation

# [unresolved] capsules: billing-service — hint present but no capsule registered yet
```

---

### System graph traversal results (candidates only)

`kaddo_system_impact_candidates` seeds: `[payment-processing, ADR-005]`

| Entity | Reason | Action |
|--------|--------|--------|
| `notification-service` | 2 hops from payment-processing via order-events | Investigate: does retry affect notification delivery? |
| `audit-log` | direct dependency of payment-processing | Confirm: does retry create duplicate audit entries? |
