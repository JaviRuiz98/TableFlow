# Module: floor-plans

**Agent:** `tableflow-floor-plans`  
**Path:** `src/app/features/floor-plans/`

## Purpose

Persist and manage floor plans as **jornadas de apertura** (dated opening sessions), snapshots (elements + tables/reserved), lock flag, and operational table helpers used by the editor/workspace.

Each `floor_plans` row is one jornada: `opening_date`, `opens_at`, `closes_at`, `closes_next_day`, `status` (`scheduled` | `open` | `closed`). At most one `open` plan per company. Tables carry current `reserved` / `attended` flags for that jornada (not history).

## Responsibilities (this module)

- CRUD `floor_plans` + jornada lifecycle (`createOpeningJornada`, `openJornada`, `closeJornada`)
- Load/save snapshot via `replace_floor_plan_snapshot`
- Duplicate / copy layout for a new jornada (geometry; reset attended/observation/**reserved**; new ids)
- Lock (`is_locked`), attended/observation RPCs, reserved/transfer RPCs, create operational TABLE/RESERVED row

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

`list` (ordered by `opening_date` desc), `create` (legacy; defaults scheduled jornada times), `createOpeningJornada`, `openJornada`, `closeJornada`, `update`, `remove`, `load`, `saveSnapshot`, `setTableAttended`, `loadTableAttentionStates`, `setTableObservation`, `setTableReserved`, `transferTableContent`, `createOperationalTarget`, `setLocked`

`PlanDuplicationService.duplicate(plan, copyName)` — copy inherits `plan.company_id`

Ownership: `floor_plans.company_id` only (migration `0027`; `created_by` removed). Tenant RLS/RPC hardening: `0028` / `0029`. Jornada fields + table flags: `0030`. Operational RPCs: `0031`.

ADMIN Resumen (`admin-dashboard`) reads jornadas/KPIs from these rows — it does not own floor-plan mutations.

## Duplication behaviour (do not “improve” casually)

Copies elements + tables + reserved with **new UUIDs**, `attended: false`, `observation: null`, `reserved: false`.  
If source `is_locked`, copy is locked after save. **Does not** copy orders/history.

## Integrity

`saveSnapshot` sends **existing table ids** in `p_tables`. RPC upserts/deletes by snapshot membership — cascading deletes are server-side. Do not drop ids from normal saves.

`tables` UNIQUE is `(floor_plan_id, number)` across **TABLE and RESERVED**. Editor `addTable`/`addReserved` and `ensureUniqueTableNumbers` (used by payload + save) share one number space so Mesa 1 + Reservado 1 cannot collide on save.

## Supabase

| Kind | Name |
|------|------|
| Tables | `floor_plans`, `floor_plan_elements`, `tables` |
| RPC | `replace_floor_plan_snapshot`, `set_table_attended`, `set_table_observation`, `create_opening_jornada`, `open_jornada`, `close_jornada`, `set_table_reserved`, `transfer_table_content` |

## Tests

- `floor-plan-snapshot.util.spec.ts`
- `floor-plan.service.spec.ts` (mocked)
- `plan-duplication.service.spec.ts` (mocked FloorPlanService)

## Restrictions

- No remote save/delete/duplicate tests
- No RPC/RLS/schema changes
- Do not move editor Konva logic into the service in this module’s scope
