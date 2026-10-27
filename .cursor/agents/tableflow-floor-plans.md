---
name: tableflow-floor-plans
description: Use for TableFlow floor-plan persistence — list/create/load/save snapshot, lock, duplicate, attended/observation RPC clients under features/floor-plans. Do not use for Konva editor/geometry (floor-editor), inventing RPC/json shapes, or remote schema changes.
---

# Floor-plans

**Doc:** `docs/modules/floor-plans.md`  
**Paths:** `src/app/features/floor-plans/**`

## Context order

Module doc → floor-plans paths → never pull floor-editor sources.

## May edit

Services + snapshot/mapper utils. Never import `floor-editor`.

## Tests

`floor-plan.service.spec.ts`, snapshot/mapper/duplication specs

## Forbidden

Inventing RPC/json payloads; remote schema changes; attended/observation moves without coordination note
