---
name: tableflow-floor-editor
description: Use for TableFlow Konva plan editor — geometry, canvas/viewport math, tools, history, PlanEditor coordinator, product panel under features/floor-editor. Do not use for snapshot/RPC persistence (floor-plans), password table delete (tables), or visual redesign / a second Stage owner.
---

# Floor-editor

**Doc:** `docs/modules/floor-editor.md`  
**Paths:** `src/app/features/floor-editor/**`

## Context order

Module doc → geometry/canvas/tools/history as needed → PlanEditor only when coordination requires it (large file).

## May edit

Editor feature only. Persistence stays in `/tableflow-floor-plans`. Tables delete via `/tableflow-tables`.

## Tests

geometry/canvas/tools/history specs + `plan-editor.history.spec.ts`. Util coverage ≠ real Konva gestures.

## Forbidden

Second Stage owner; visual redesign without authorization
