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
- **System Explorer** — la topología semántica del sistema como un grafo de solo lectura, con overlays de Knowledge, Delivery e Implementation
- **Impacto de sistema del Work Item** — para un Work Item refinado, las entidades clasificadas como afectadas, revisadas-no-afectadas o desconocidas, cada una con su razón, razón del grafo y evidencia del repositorio; "View in System Explorer" proyecta ese impacto sobre el grafo

La vista de impacto es asistida por el Graph, nunca autoritativa: el Graph amplía lo que el agente revisa, pero no decide el alcance. Cuando la cobertura de la topología es parcial o no está disponible, la UI lo indica explícitamente — una relación ausente en el Graph nunca se presenta como prueba de no-impacto.

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
