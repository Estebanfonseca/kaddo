---
title: Integrations
description: Connect Kaddo to external work systems (GitHub Issues, Jira, Azure DevOps, Linear, …) through a provider-agnostic Integration Adapter Foundation — without making any external system the source of truth.
---

Many teams first capture requests in an external work system — GitHub Issues, Jira, Azure DevOps,
Linear. Kaddo's **Integration Adapter Foundation** connects to those systems through a single,
provider-agnostic boundary and normalizes what it finds into a neutral model Kaddo can consume.

The rule that governs everything here:

> External tools can **originate** work and **contribute** context. Kaddo normalizes that information,
> preserves its traceability, and keeps its **own Work Item as the source of truth** for development.

```text
External Work System
        ↓
Integration Adapter        (normalizes provider data)
        ↓
Normalized External Work Item
        ↓
Import Preview             (read-only)
        ↓
Human Confirmation
        ↓
Kaddo Core                 (creates a canonical Draft)
        ↓
Canonical Work Item        ← the source of truth
```

## Integration Adapters vs Agent Adapters

Kaddo uses the word *adapter* in two unrelated places. Keep them distinct:

| | Projects to | Examples |
|---|---|---|
| **Agent Adapters** | agent-native files | `AGENTS.md`, `CLAUDE.md` |
| **Integration Adapters** | external work systems | GitHub, Jira, Azure DevOps, Linear |

This page is about **Integration Adapters**.

## Architecture

```text
                 @kaddo/core           (domain: Work Items, Knowledge, Graph)
                      ▲
                      │ normalized model
                      │
              @kaddo/integrations      (contract · registry · models · config · errors)
                      ▲
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       GitHub        Jira    Azure DevOps    (future concrete adapters)
```

- **`@kaddo/core` is provider-agnostic.** It never imports a vendor SDK and never knows GitHub fields,
  Jira issue types or Linear states.
- **`@kaddo/integrations`** owns the adapter contract, registry, normalized models, configuration and
  secret-reference model, error/status model, import-preview mapping and a reference adapter. It holds
  **no** Work Item domain rules, Graph semantics or lifecycle rules — those stay in Core.
- The **integration service** (in the CLI/Admin layer) is the only place external reads cross into
  Core, and the only place an import materializes a Work Item.

## Adapter contract

```ts
interface IntegrationAdapter {
  readonly id: string
  readonly metadata: IntegrationAdapterMetadata
  readonly capabilities: IntegrationCapabilities
  verifyConnection(context): Promise<ConnectionResult>
  listWorkItems(request): Promise<ExternalWorkItemPage>   // paginated
  getWorkItem(request): Promise<ExternalWorkItem | null>
}
```

Adapters are **not** assumed equivalent. Each declares its **capabilities** so the UI can ask *"what
can this adapter do?"* instead of assuming everything is supported. The VS-102 baseline requires
`verifyConnection`, `list`, `read` and `import`; `write`, `statusSync`, `comments` and `webhooks` are
future capabilities.

Providers are resolved through a **registry** — never a hardcoded `switch (provider)`. Adding a new
provider is a registration, not a change to Core, Admin or MCP.

## Normalized model

Every provider item becomes a neutral `ExternalWorkItem` — *what Kaddo needs*, not a faithful copy of
the provider model. Provider-specific detail may ride along in `rawMetadata` but never dominates.

Each item has a stable **external identity** — `integration + externalId` — used for duplicate
detection and linking. It never relies on the visible title.

## Configuration & secrets

Declare integrations in `.kaddo/integrations.yml`. Configuration carries only how to **find** a
credential, never the credential itself:

```yaml
integrations:
  - id: github-dotear
    adapter: github
    enabled: true
    config:
      owner: trycatch-tv
      repository: dotear
    credentials:
      token_env: GITHUB_TOKEN     # a reference — resolved at runtime only
```

An inline secret (`token: ghp_…`) is **rejected** by validation. Secrets are resolved from the
environment only for the duration of a call and **never** appear in Work Items, Knowledge, the Graph,
context packs, the Admin API, MCP output, logs or telemetry.

## Status & connection

Two axes that must never be conflated: an **integration connection status** and a **Work Item
lifecycle status**. `verifyConnection()` distinguishes *"adapter installed"* from *"integration
actually usable"*:

```text
configured · available · unavailable · unauthorized · invalid-config · disabled
```

Errors are normalized (`INTEGRATION_UNAUTHORIZED`, `INTEGRATION_RATE_LIMITED`,
`INTEGRATION_TIMEOUT`, `INTEGRATION_UNAVAILABLE`, …). Raw provider messages are never surfaced.

## Import semantics

Reading is not importing. Viewing `EXT-001` does **not** create a Work Item — import is an explicit,
human-confirmed action:

1. **Preview** (read-only) shows the source, the captured intent and *"No project files have been
   modified yet."*
2. **Confirm.** You choose the Kaddo Work Item **type** — it is never inferred from the external type.
3. **Import** reuses Core's `createWorkItem`, producing a **Draft** (regardless of the external
   status). The external origin is recorded as **provenance**, not as the truth:

   ```yaml
   source:
     type: external
     provider: github
     integration: github-dotear
     id: "231"
     url: https://github.com/trycatch-tv/dotear/issues/231
   ```

Re-importing the same external identity does not create a duplicate — Kaddo returns the existing Work
Item. After import, refinement and impact analysis happen on the **Kaddo** Work Item, and it keeps
working even if the external provider becomes unavailable.

## CLI

```bash
kaddo integrations list                       # configured integrations + capabilities
kaddo integrations status                     # verify each and report connection status
kaddo integrations verify <id>                # verify one integration
kaddo integrations work-items <id>            # list external items (paginated)
kaddo integrations work-item <id> <ext-id>    # read one external item
kaddo integrations import <id> <ext-id> --type <feature|fix|…>   # preview → confirm → Draft
```

Read-only commands support `--json`. Import always previews and asks for confirmation before Core
creates anything.

## MCP

`@kaddo/mcp` exposes read-only tools — `kaddo_integrations_list`, `kaddo_integrations_status`,
`kaddo_integrations_work_items`, `kaddo_integrations_work_item`. Reading an external item through MCP
never materializes a Kaddo Work Item; import stays a human-confirmed action.

## Reference (mock) adapter

Kaddo ships a deterministic, offline **`mock`** adapter that exercises the whole contract — registry,
connection, listing, pagination, read, normalization and error simulation — with no network or
credentials. It is the reference a custom adapter can be checked against.

```yaml
integrations:
  - id: mock-work-source
    adapter: mock
    enabled: true
    config:
      simulate: available   # or unauthorized · rate-limited · unavailable · timeout
```

## Writing a custom adapter

1. **Implement** the `IntegrationAdapter` contract.
2. **Declare** your capabilities honestly.
3. **Normalize** provider data into `ExternalWorkItem` (keep extras in `rawMetadata`).
4. **Register** the adapter in the registry.
5. **Validate** configuration; reference secrets by environment variable, never store them.
6. **Never** write Kaddo artifacts directly — return normalized data and let the integration service
   and Core own materialization.

## Out of scope (built on this foundation later)

Production provider adapters, bidirectional sync, polling, webhooks, status/comment/attachment sync,
pushing or updating external issues, and external OAuth UI are **not** part of the foundation. They
build on top of it — without redesigning the integration model.
