# Module: tables

**Agent (future):** `tableflow-tables`  
**Path:** `src/app/features/tables/`  
**B9:** [../refactoring/B9_TABLES.md](../refactoring/B9_TABLES.md)

## Purpose

Domain helpers for table/reserved **validation** and **password-gated deletion**. No Konva UI.

Operational flag `reserved` (migration `0030`, `occupied` removed in `0033`) and RPCs `set_table_reserved` / `transfer_table_content` live on `FloorPlanService` (see [JORNADAS_APERTURA](../architecture/JORNADAS_APERTURA.md)).

## Layout

```text
tables/
  index.ts
  table-deletion.service.ts (+ spec)
  table-validation.service.ts (+ spec)
```

## Public API

| Export | Role |
|--------|------|
| `TableDeletionService.delete(tableId, password, force?)` | RPC `delete_table_with_orders` |
| `DeleteTableResult` | `{ ok, reason }` — `DELETED` / `NOT_PERSISTED` / `BAD_PASSWORD` / `SERVED_PRODUCTS` |
| `TableValidationService.validateUniqueNumbers` | Unique `number` **per type** (TABLE / RESERVED) |
| `TableValidationService.clampPosition` | Clamp x/y inside plan size |

## RPC / integrity (do not change without auth)

`delete_table_with_orders(p_table_id, p_secret, p_force)`:

- Requires authenticated **ADMIN** (`current_role`)
- Verifies `app_secrets` key **`table_deletion`** via crypt hash
- Missing row → `{ ok: true, reason: 'NOT_PERSISTED' }`
- Has non-cancelled order items **and** table `attended` **and** not `p_force` → `SERVED_PRODUCTS`
- Else deletes `tables` row (orders cascade per DB FKs — treat as destructive)

**Never run destructive delete tests against remote Supabase.**

## Not in this module (stay elsewhere)

| Concern | Home | Why |
|---------|------|-----|
| `set_table_attended` / `set_table_observation` / `loadTableAttentionStates` | `FloorPlanService` | Used by editor; RPC also marks order items — moving needs coordinated API; deferred |
| `createOperationalTarget` | `FloorPlanService` | Creates table row in plan context |
| Snapshot table payloads | `floor-plans` utils | Persist plan geometry |
| Order item attended | `orders` | Line-item domain |
| Konva placement/drag | `floor-editor` | Presentation |

## Consumers

- `PlanEditorComponent` → `TableDeletionService` (delete dialogs)
- `TableValidationService` — no production caller yet (available for editor/workspace)

## Permissions

- Editor delete (mesa/reservado): no password UI — local remove, then `replace_floor_plan_snapshot` on save drops the row (`canEditGeometry` / ADMIN gate in UI)
- RPC `delete_table_with_orders` still requires ADMIN + `table_deletion` secret if called directly
- Validation: pure client helpers

## Agent restrictions

1. Do not alter RPC signatures or secret key name.  
2. Do not add UI components here without authorization.  
3. Do not import `floor-editor` / templates.  
4. Prefer mocked Supabase in unit tests only.  
5. Before relocating attended/observation, preserve PlanEditor + order side effects exactly.
