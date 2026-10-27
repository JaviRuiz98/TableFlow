# Module: floor-editor

**Agent:** `tableflow-floor-editor`  
**Path:** `src/app/features/floor-editor/`  
**B8 status:** complete (B8.1–B8.6) · [../refactoring/B8_FLOOR_EDITOR.md](../refactoring/B8_FLOOR_EDITOR.md)

## Purpose

Konva plan editor + operational product panel. Persistence lives in `features/floor-plans/`.

## Final layout

```text
floor-editor/
  index.ts                      # PlanEditor + TableProductPanel
  plan-editor.component.*       # coordinator (Stage owner)
  table-product-panel.component.*
  geometry/                     # simplify/snap/segments + line helpers
  canvas/                       # viewport math + stage teardown helpers
  tools/                        # tool policy + wall/text builders
  history/                      # undo/redo stack ops (pure)
```

## Responsibilities by folder

| Folder | Owns | Does not own |
|--------|------|----------------|
| `geometry/` | Drawing→segments, line endpoints/move | Konva, history |
| `canvas/` | Zoom/fit/coords math, teardown helpers | Stage instance |
| `tools/` | Tool transitions, wall/text model builders | Listeners, render |
| `history/` | Snapshot push/undo/redo/materialize | `render()`, UI selection |
| `PlanEditor` | Stage, layers, listeners, model arrays, history arrays, order UI, `render` | — |
| Panel | List/assign products to tables | Canvas |

## Public API (stable)

### `PlanEditorComponent`

| Member | Role |
|--------|------|
| `@Input() plan` | Active floor plan |
| `@Input() mode` | `'editor' \| 'operativo'` |
| `@Input() hideSurface` | Hide canvas surface |
| `@Output() pendingChanged` | Pending order qty signal to Workspace |
| `saveDesign(showConfirmation?)` | ADMIN → `FloorPlanService.saveSnapshot` |
| `openOperationalTarget(target)` | Open order dialog (operativo) |

### `TableProductPanelComponent`

| Member | Role |
|--------|------|
| `@Input() plan` | Plan context |
| `@Output() targetSelected` | Workspace → `openOperationalTarget` |

## Event / data flow (summary)

1. Workspace sets `plan` + `mode` → `ngOnChanges` → `load` → `initStage` → fit view  
2. Tools mutate model → `pushHistory` → `render`  
3. Wheel/pinch → canvas math → Stage scale/position  
4. Operativo orders → `OrderService` + Realtime channel `plan-editor-orders-*`  
5. Save → snapshot `{ elements, tables, reserved }` (ids preserved)  
6. Destroy → unsubscribe Realtime + `teardownStageResources`

## Konva lifecycle

**Sole owner:** `PlanEditorComponent`.  
Create in `initStage`, resize via `ResizeObserver` + `applyStageSizeIfChanged`, destroy in `ngOnDestroy` / before recreate. Never instantiate Stage from `canvas/` helpers.

## Dependencies

```text
floor-editor → floor-plans, orders, products, core/auth, core/services/table-deletion (B9)
floor-editor/geometry|tools|history → core/models (+ geometry types)
floor-editor/canvas → models + geometry Point; Konva types only in lifecycle util
floor-plans ↛ floor-editor   (forbidden)
```

## Tests (automated)

- `geometry/*`, `canvas/*`, `tools/*`, `history/*`
- `plan-editor.history.spec.ts` — history + Workspace contracts (`saveDesign`, `openOperationalTarget`, destroy)

**Not covered by unit tests (manual QA required):** wheel/pinch feel, drag after zoom, endpoint handles, visual render, password delete UX.

## Limitations / B9 debt

- `TableDeletionService` (+ unused `TableValidationService`) still in `core/services` → move to `features/tables/`
- Attended/observation RPCs remain on `FloorPlanService` (wrappers optional in B9)
- `render()` still large; further split only with Konva harness + auth
- Order item typing still uses `any` in places (B10 types)

## Agent rules

1. Prefer module barrels (`./geometry`, `./canvas`, `./tools`, `./history`).  
2. Do not change viewport/geometry/history algorithms without characterization tests.  
3. Do not restyle HTML/SCSS without explicit UX authorization.  
4. Do not import `floor-editor` from `floor-plans`.  
5. Keep `PlanEditor.tool` / `history`+`historyIndex` as single sources of truth.
