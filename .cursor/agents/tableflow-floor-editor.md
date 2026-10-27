---
name: tableflow-floor-editor
description: Use for TableFlow Konva plan editor — geometry, canvas/viewport math, tools, history, PlanEditor Stage coordinator, UI children (toolbar/dialogs/order-attention), renderer/viewport helpers, product panel under features/floor-editor. Do not use for snapshot/RPC persistence (floor-plans), password table delete (tables), or visual redesign / a second Stage owner.
---

# Floor-editor

**Doc:** `docs/modules/floor-editor.md`  
**Paths:** `src/app/features/floor-editor/**`

## Context order

Module doc → geometry/canvas/tools/history or `components/` as needed → PlanEditor / helpers only when coordination requires it.

## May edit

Editor feature only (including `components/` and `plan-editor-*.ts` helpers). Persistence stays in `/tableflow-floor-plans`. Tables delete via `/tableflow-tables`.

## Tests

geometry/canvas/tools/history specs + `plan-editor.history.spec.ts` + `components/**/*.spec.ts`. Util coverage ≠ real Konva gestures.

## Forbidden

Second Stage owner; visual redesign without authorization; splitting Stage lifecycle into another Angular component without explicit auth
