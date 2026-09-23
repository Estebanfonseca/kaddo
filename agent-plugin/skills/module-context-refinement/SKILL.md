---
name: module-context-refinement
description: Standardize how a multirepo module's context is refined without duplicating global knowledge, using MCP multirepo tools for cross-repo awareness.
---

## When to use

- When refining `knowledge/tech/modules/<id>/module-context.md` in a module repository
  (`isModuleRepo: true` from `kaddo_project_status`).
- When the core system repository needs to understand a module's current capabilities
  and boundaries before planning a cross-repo Work Item.
- When `kaddo_get_module_context` returns incomplete or placeholder content.

## Inputs

- Module's local `module-context.md` (read from the module repo).
- Local tech knowledge: `current-state.md`, `codebase.md` (local to the module).
- Core system's view of this module: `kaddo_get_module_context("<module-id>")` from the core repo.
- Optionally: the core system's context pack for cross-system boundaries.
- Module validation: `kaddo_validate_work_item_modules` for any Work Items referencing this module.

## Output

A refined `module-context.md` with real, project-specific content in all sections —
no placeholders, no duplicated global knowledge.

## MCP tools to use

| Tool | Purpose |
|------|---------|
| `kaddo_project_status` | Confirm `isModuleRepo: true` before starting |
| `kaddo_get_module_context("<module-id>")` | Read what the core knows about this module |
| `kaddo_modules_list` | List all mapped modules and check config status |
| `kaddo_validate_work_item_modules("<WI-ID>")` | Verify cross-repo coherence for WIs |
| `kaddo_export_capsule` | Export a Knowledge Capsule draft for the core to import |

## Steps

1. **Confirm module identity** — call `kaddo_project_status`. Confirm `isModuleRepo: true`
   and note the `readiness.project_role`.

2. **Read cross-system view** — if in the core repo, call `kaddo_get_module_context("<id>")`
   to see what the core knows. Note gaps and stale content.

3. **Refine module identity section** — state what this module does, its role in the system,
   and its single clear responsibility. Do not copy product strategy from the core.

4. **Refine boundaries and dependencies**:
   - What does this module expose? (APIs, events, shared libraries)
   - What does this module consume? (services, events, databases)
   - What does it explicitly NOT own?
   - List real consumers and producers — not aspirational.

5. **Document exposed interfaces** — real, not invented:
   - REST endpoints with method, path, and payload shape.
   - Events published and consumed (topic, schema reference).
   - Shared contracts or OpenAPI refs.

6. **Document local rules** — coding standards, security constraints, deployment notes,
   or anything a work-item-agent in another repo needs to know before touching this module.

7. **Document local risks** — honest and specific:
   - High-coupling areas.
   - Poorly understood subsystems.
   - Missing tests.
   - Known drift between code and knowledge.

8. **Surface open questions** — mark unknowns as open questions rather than guessing.
   These feed into `kaddo_generate_questions_report`.

9. **Export capsule if needed** — if the core needs a snapshot of this module:
   - Call `kaddo_export_capsule` → draft lands in `.kaddo/exports/<module>.capsule.md`.
   - Inform the human to run `kaddo capsule add` in the core repo to import it.

## Rules

- Use module responsibility, not full product strategy — keep business/product context in core.
- Identify boundaries and dependencies from the local code, not assumptions.
- Preserve front-matter (`type`, `module_id`, `parent_system`).
- Mark unknowns as open questions — never invent interfaces or dependencies.
- Do not create `business.md` or `product.md` in the module repo.
- Do not create Work Items in the module repo — those live in the core.
- Do not install agents or skills directly in the module — they are managed by core.
- Never overwrite `module-context.md` with placeholder text — only fill real content.

## Quality checklist

- [ ] `kaddo_project_status` confirmed `isModuleRepo: true`.
- [ ] Module identity and single responsibility are clear.
- [ ] Boundaries and dependencies are non-overlapping with other modules.
- [ ] Exposed interfaces are real (not invented), with enough detail to act on.
- [ ] Consumers and producers are listed.
- [ ] Local rules are documented.
- [ ] Risks are honest and specific (not generic).
- [ ] Open questions are surfaced (not hidden).
- [ ] Front-matter `type`, `module_id`, `parent_system` are preserved.
- [ ] Capsule export suggested if core needs a snapshot.

## Example output

```markdown
---
type: module-context
module_id: payments-service
parent_system: commerce-platform
updated_at: YYYY-MM-DD
---

# Module Context — payments-service

## Identity
Handles payment authorization, capture, and retry for the Commerce Platform.
Owned by the Payments team. Does not own order lifecycle or fulfillment.

## Exposed Interfaces
- REST POST /payments/authorize — authorize a payment; payload: { orderId, amount, currency }
- REST POST /payments/capture — capture an authorized payment
- Event: payment.authorized — published to `payments` Kafka topic
- Event: payment.failed — published to `payments` Kafka topic

## Consumed Interfaces
- orders-service: GET /orders/{id} — reads order details before authorization

## Boundaries (not owned here)
- Order creation and fulfillment → orders-service
- Notification delivery → notification-service

## Local Rules
- All payment mutations require idempotency key in header.
- PCI-DSS scope: no raw card data in logs.
- Conventional commits enforced; squash merge to main.

## Risks
- Retry logic introduced in WI-042 has not been load-tested under high concurrency.
- Authorization timeout handling is undocumented.

## Open Questions
- [ ] What is the SLA guarantee for capture after authorization?
- [ ] Is there a dead-letter queue for failed payment events?
```
