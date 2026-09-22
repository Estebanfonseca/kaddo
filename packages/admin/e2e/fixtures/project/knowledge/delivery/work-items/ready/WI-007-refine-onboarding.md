---
id: WI-007
title: Refine onboarding checklist
type: feature
status: ready
affected_modules: [frontend]
code: ["src/onboarding/**"]
capabilities: ["User onboarding"]
decisions: [ADR-004]
affected_system_entities: [registration-ui]
reviewed_system_entities:
  - id: registration-api
    status: reviewed-not-affected
    reason: The registration contract does not change.
  - id: supabase
    status: unknown
    reason: Ownership of the onboarding table is unclear.
graph_revision: e2e-rev-1
scope_confidence:
  level: high
  reasons:
    - Onboarding steps are well understood.
---

# Refine onboarding checklist

## Current behavior

The onboarding checklist is static.

## Target behavior

The checklist adapts to what the user has already done.
