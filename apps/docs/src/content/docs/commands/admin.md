---
title: kaddo admin
description: Launch the local web admin interface for a Kaddo project.
---

`kaddo admin` starts a local web server that provides a read-only visual dashboard over
the current Kaddo project. It surfaces the same data as `kaddo explain`, `kaddo ready`
and `kaddo understand` in an interactive browser UI.

## Usage

```bash
kaddo admin
kaddo admin --port 8080
kaddo admin --host 0.0.0.0
kaddo admin --no-open
```

## Options

| Flag | Default | Description |
|---|---|---|
| `--port <number>` | `4173` | Port for the admin server |
| `--host <address>` | `127.0.0.1` | Host to bind |
| `--no-open` | `false` | Do not open the browser automatically |

## What it shows

The admin dashboard displays a unified overview of the project:

- **Project summary** — name, state, structure, team size
- **Knowledge layers** — status of each layer (Business, Product, Tech, Delivery)
- **Work Items** — by state and type, with current counts
- **Modules** — detected modules and their roles (multirepo)
- **Readiness** — overall readiness level and recommended next step
- **Route** — progress through the project route with step-by-step detail
- **Findings** — blocking, warning and FYI findings

## Architecture

- The admin server consumes domain logic from Kaddo Core — it never duplicates it
- Git remains the canonical source of truth; SQLite is operational storage only
- Session authentication is local and ephemeral (cookie-based, single-machine)
- The frontend uses the Kaddo Design System with semantic and domain color tokens
- All data flows through a REST API at `/api/v1/admin/`

## Requirements

- Node.js >= 22.5 (for `node:sqlite` built-in module)
- The project must be initialized with `kaddo init`
- The admin frontend must be built (`pnpm -r build`)
