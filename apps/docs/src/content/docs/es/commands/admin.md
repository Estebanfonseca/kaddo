---
title: kaddo admin
description: Lanza la interfaz web admin local para un proyecto Kaddo.
---

`kaddo admin` inicia un servidor web local que proporciona un dashboard visual de solo
lectura sobre el proyecto Kaddo actual. Muestra los mismos datos que `kaddo explain`,
`kaddo ready` y `kaddo understand` en una interfaz de navegador interactiva.

## Uso

```bash
kaddo admin
kaddo admin --port 8080
kaddo admin --host 0.0.0.0
kaddo admin --no-open
```

## Opciones

| Flag | Por defecto | Descripción |
|---|---|---|
| `--port <number>` | `4173` | Puerto del servidor admin |
| `--host <address>` | `127.0.0.1` | Host de escucha |
| `--no-open` | `false` | No abrir el navegador automáticamente |

## Qué muestra

El dashboard admin presenta una vista unificada del proyecto:

- **Resumen del proyecto** — nombre, estado, estructura, tamaño del equipo
- **Capas de conocimiento** — estado de cada capa (Business, Product, Tech, Delivery)
- **Work Items** — por estado y tipo, con conteos actuales
- **Módulos** — módulos detectados y sus roles (multirepo)
- **Readiness** — nivel general de preparación y siguiente paso recomendado
- **Ruta** — progreso a través de la ruta del proyecto con detalle paso a paso
- **Findings** — hallazgos bloqueantes, de advertencia e informativos

## Arquitectura

- El servidor admin consume la lógica de dominio de Kaddo Core — nunca la duplica
- Git sigue siendo la fuente canónica de verdad; SQLite es almacenamiento operativo
- La autenticación de sesión es local y efímera (basada en cookies, una sola máquina)
- El frontend usa el Kaddo Design System con tokens de color semánticos y de dominio
- Todos los datos fluyen a través de una API REST en `/api/v1/admin/`

## Requisitos

- Node.js >= 22.5 (para el módulo built-in `node:sqlite`)
- El proyecto debe estar inicializado con `kaddo init`
- El frontend admin debe estar compilado (`pnpm -r build`)
