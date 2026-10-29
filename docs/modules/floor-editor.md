# Module: floor-editor

**Agent:** `tableflow-floor-editor`  
**Path:** `src/app/features/floor-editor/`  
**B8 status:** complete · **C1 status:** component split + helper extraction ([COMPONENT_REFACTOR_PLAN.md](../refactoring/COMPONENT_REFACTOR_PLAN.md))

## Purpose

Konva plan editor + operational product panel. Persistence lives in `features/floor-plans/`.

## Layout (folder-per-unit)

```text
floor-editor/
  index.ts                      # PlanEditor + TableProductPanel
  plan-editor/                  # Stage coordinator + helpers + history spec
  table-product-panel/
  editor-toolbar/
  plan-editor-dialogs/
  order-attention-dialog/
  geometry/  canvas/  tools/  history/
```

## Responsibilities

| Unit | Owns | Does not own |
|------|------|----------------|
| `PlanEditorComponent` | Stage lifecycle, model arrays, history arrays, tool, wires children/helpers | Persistence RPCs |
| `plan-editor-renderer` | `render` / table / reserved nodes; operativo colors: pending → red, attended → green, reserved → gold | Stage create/destroy |
| `plan-editor-viewport` | Zoom/fit/pinch math application | Stage ownership |
| `editor-toolbar` | Toolbar chrome | Model mutations |
| `plan-editor-dialogs` | Unlock/delete/text/save overlays UI | Service calls (parent/facade) |
| `order-attention-dialog` | Operativo order modal + order mutations UI | Stage |
| `geometry|canvas|tools|history` | Pure/policy utils | Stage instance |
| Panel | List/assign products | Canvas |

## Soft-cap / exception

| Component | TS LOC (C4) | Cap |
|-----------|------------:|-----|
| `PlanEditorComponent` | **648** | **Approved exception** — sole Stage + Angular wiring; further split unsafe without Konva harness |
| Other floor-editor components | ≤406 | Within 500 |

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

## Event / data flow

1. Workspace sets `plan` + `mode` → `load` → `initStage` → fit view  
2. Tools mutate model → `pushHistory` → renderer.`render`  
3. Wheel/pinch → viewport helpers → Stage scale/position  
4. Operativo → `OrderAttentionDialog` + Realtime; parent refreshes pending map / render  
5. Save → snapshot `{ elements, tables, reserved }`  
6. Destroy → unsubscribe + `teardownStageResources`

## Shape tools (rect / ellipse)

Beside freehand walls (`draw`), toolbar exposes **Rectángulo** and **Óvalo**: click-drag on the canvas creates a `floor_plan_elements` row with `kind: 'zone'` and `label: 'rect' | 'ellipse'`. In **Seleccionar**, corner handles resize width/height. No schema change.

## Freehand walls + «Borrar dibujo»

While **Dibujar**, a stroke stays as a dashed draft after pointer-up until the next stroke, leaving the draw tool, or **Guardar diseño**.

**Borrar dibujo** asks for confirm, then clears **all** geometry (`elements` + draft): walls, zones, text. Mesas/reservados are kept. Undo works until save.

## Delete selection

- Geometry element → immediate local remove  
- **Mesa / Reservado** → local remove (no password; persists on next save via `replace_floor_plan_snapshot`)  
- Legacy password RPC `delete_table_with_orders` remains in `tables` module but is not used by the editor toolbar delete path

## Konva lifecycle

**Sole owner:** `PlanEditorComponent`. Helpers must not create Stage. Never instantiate Stage from `canvas/` helpers.

## Dependencies

```text
floor-editor → floor-plans, orders, products, core/auth, features/tables (deletion)
floor-plans ↛ floor-editor   (forbidden)
```

## Tests

- `geometry/*`, `canvas/*`, `tools/*`, `history/*`
- `plan-editor.history.spec.ts`
- `components/**/*.spec.ts`
- Manual QA: wheel/pinch, drag after zoom, endpoints, password delete UX

## Agent rules

1. Prefer barrels (`./geometry`, `./canvas`, `./tools`, `./history`).  
2. Do not restyle without UX authorization.  
3. Do not import `floor-editor` from `floor-plans`.  
4. Keep `PlanEditor.tool` / history arrays as SSoT.  
5. Do not create a second Stage owner component.
