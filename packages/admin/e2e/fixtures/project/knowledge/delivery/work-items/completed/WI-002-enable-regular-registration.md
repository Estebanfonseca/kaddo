---
id: WI-002
title: Enable regular registration after beta
type: feature
status: completed
implementation_status: completed
validation_status: accepted-with-exceptions
release_status: blocked
affected_modules: [core, frontend]
decisions: [ADR-004]
related_knowledge: [PROD-1]
scope_confidence:
  level: medium
  reasons:
    - Registration flow was confirmed end to end.
    - Legal age policy remains unresolved.
module_coverage:
  core:
    status: affected
    reason: Registration API changes.
  frontend:
    status: affected
    reason: Registration form changes.
  admin:
    status: reviewed-not-affected
impact_analysis:
  surfaces:
    frontend:
      status: affected
    backend:
      status: affected
    database:
      status: reviewed-not-affected
    feature-flags:
      status: unknown
      question: Is a rollout flag required?
release_gates:
  - id: remote-migration
    status: blocked
    reason: Supabase remote migration pending
  - id: automated-validation
    status: pending
completion_exceptions:
  - id: exc-1
    status: accepted
    reason: Automated validation was not executed.
implementation_evidence:
  repositories:
    core:
      role: core
      status: completed
      changed_paths:
        - src/registration/api.ts
        - migrations/2026_open_registration.sql
    frontend:
      role: module
      status: completed
      changed_paths:
        - src/pages/register/Register.tsx
---

# Enable regular registration after beta

## Current behavior

Registration is limited to beta invitees.

## Target behavior

Anyone can register once the beta gate is removed.

## Entry points

Public registration page

## Scope unknowns

- Is age validation required at registration?
- Should invitations be preserved for existing beta users?

## Acceptance criteria

- [x] Registration accepts new users without an invite code.
- [x] Existing beta accounts keep working.
- [ ] Automated end-to-end validation still pending.
