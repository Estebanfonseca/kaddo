---
id: WI-007
title: Refine onboarding checklist
type: feature
status: ready
affected_modules: [frontend]
code: ["src/onboarding/**"]
capabilities: ["User onboarding"]
decisions: [ADR-004]
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
