---
id: WI-007
title: Refine onboarding checklist
type: feature
status: ready
affected_modules: [frontend]
code: ["src/onboarding/**"]
capabilities: ["User onboarding"]
decisions: [ADR-004]
affected_system_entities:
  - id: registration-ui
    reason: Public Registration is the user-facing entry point for onboarding.
    graph_reason:
      relationship: calls
      path: [Public Registration, Registration API]
    evidence: [src/onboarding/checklist.tsx]
    evidence_summary: The current static checklist UI is rendered here and must change.
reviewed_system_entities:
  - id: registration-api
    status: reviewed-not-affected
    reason: The registration contract does not change.
    graph_reason:
      relationship: calls
      path: [Public Registration, Registration API]
    evidence_summary: The API already provides the state required by the frontend.
  - id: supabase
    status: unknown
    reason: Ownership of the onboarding table could not be confirmed from the repository context.
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
