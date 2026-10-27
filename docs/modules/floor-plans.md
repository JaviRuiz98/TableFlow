# Module: floor-plans

**Agent:** `tableflow-floor-plans`  
**Path:** `src/app/features/floor-plans/`

## Purpose

Persist and manage floor plans, snapshots (elements + tables/reserved), lock flag, and operational table helpers used by the editor/workspace.

## Responsibilities (this module)

- CRUD `floor_plans`
- Load/save snapshot via `replace_floor_plan_snapshot`
- Duplicate plan (geometry only; reset attended/observation; new ids)
- Lock (`is_locked`), attended/observation RPCs, create operational TABLE/RESERVED row

## Not this module

- Konva / tools / panel UI → `features/floor-editor/` (B7.5+)
- Order assignment UI → `orders` + `table-product-panel` in floor-editor
- Physical table deletion password → `features/tables` (`TableDeletionService`)

## Main files

| File | Role |
|------|------|
| `floor-plan.service.ts` | Data access (private Supabase) |
| `plan-duplication.service.ts` | Duplicate orchestration |
| `floor-plan-snapshot.util.ts` | Pure split/payload/clone helpers |
| `floor-plan-element.mapper.ts` | jsonb `points` → domain `number[] \| null` (B10) |
| `index.ts` | Public barrel for services/utils |

## Public API (`FloorPlanService`)

`list`, `create`, `update`, `remove`, `load`, `saveSnapshot`, `setTableAttended`, `loadTableAttentionStates`, `setTableObservation`, `createOperationalTarget`, `setLocked`

`PlanDuplicationService.duplicate(plan, userId, copyName)`

## Duplication behaviour (do not “improve” casually)

Copies elements + tables + reserved with **new UUIDs**, `attended: false`, `observation: null`.  
If source `is_locked`, copy is locked after save. **Does not** copy orders/history.

## Integrity

`saveSnapshot` sends **existing table ids** in `p_tables`. RPC upserts/deletes by snapshot membership — cascading deletes are server-side. Do not drop ids from normal saves.

## Supabase

| Kind | Name |
|------|------|
| Tables | `floor_plans`, `floor_plan_elements`, `tables` |
| RPC | `replace_floor_plan_snapshot`, `set_table_attended`, `set_table_observation` |

## Tests

- `floor-plan-snapshot.util.spec.ts`
- `floor-plan.service.spec.ts` (mocked)
- `plan-duplication.service.spec.ts` (mocked FloorPlanService)

## Restrictions

- No remote save/delete/duplicate tests
- No RPC/RLS/schema changes
- Do not move editor Konva logic into the service in this module’s scope
