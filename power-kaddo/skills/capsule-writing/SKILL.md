---
name: capsule-writing
description: Standardize how Knowledge Capsules are written so external knowledge from unmapped systems can be imported cleanly into a Kaddo context pack.
---

## When to use

When exporting a capsule from a system that cannot be mapped as a multirepo module,
or when importing external knowledge via `kaddo capsule add`.

## Inputs

The system's context pack or available knowledge artifacts (capabilities, architecture
notes, current-state), and the target integration point in the receiving repository.

## Output

A Knowledge Capsule markdown file ready for `kaddo capsule add`, containing:
front matter, system identity, exposed capabilities, known interfaces, constraints,
and open questions.

## Rules

- Capture only what is knowable from available artifacts — never invent.
- Keep scope to what the consuming system actually needs to know.
- Do not reproduce internal implementation details; focus on the contract.
- Mark unknowns explicitly as `[unknown]` rather than guessing.
- One capsule = one external system. Never bundle multiple systems.

## Quality checklist

- System identity and purpose are clear.
- Exposed capabilities are real, not aspirational.
- Known interfaces (APIs, events, contracts) are listed with enough detail to act on.
- Constraints and SLAs relevant to the consumer are documented.
- Open questions are surfaced, not hidden.
- Capsule can be imported with `kaddo capsule add` without manual cleanup.

## Example output

```md
---
type: capsule
source_system: orders-service
version: 1.0.0
date: YYYY-MM-DD
---

# Knowledge Capsule — orders-service

## System Identity
Brief description of what this system does and its role in the broader architecture.

## Exposed Capabilities
- capability-name: short description

## Known Interfaces
- REST POST /orders — creates an order; payload: { ... }
- Event: order.created — published to orders topic

## Constraints
- Max payload size: 1 MB
- SLA: p99 < 200 ms

## Open Questions
- [ ] Pagination behavior for GET /orders is undocumented
```
