# B9 — Tables module

**Date:** 2026-10-27 · **Branch:** `main`

## Changes

- Created `features/tables/`
- Moved `TableDeletionService` + `TableValidationService` (+ specs) from `core/services`
- Encapsulated Supabase via private `SupabaseService` injection
- Updated `PlanEditor` / history spec imports
- Removed empty `core/services/`
- Added mocked deletion RPC characterization tests
- Documented attended/observation **remaining** on `FloorPlanService`

## Intentionally not moved

| API | Reason |
|-----|--------|
| `FloorPlanService.setTableAttended` / `setTableObservation` / `loadTableAttentionStates` | Cross-cuts plan sync + order-item effects in RPC; no API change this step |
| `createOperationalTarget` | Plan-scoped create used by product panel |

## Integrity / security notes

- Deletion still relies on server ADMIN check + `app_secrets.table_deletion`
- Client must never log or persist the deletion password beyond dialog fields
- Snapshot RPC `replace_floor_plan_snapshot` untouched
- **No remote delete exercises in CI**

## Tests

- `table-deletion.service.spec.ts` (mocked)
- `table-validation.service.spec.ts`

## Next

**B10** — TypeScript / `database.types` hardening (`any` reduction).
