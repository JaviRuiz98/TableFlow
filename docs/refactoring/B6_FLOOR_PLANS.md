# B6 — Floor plans module

**Date:** 2026-10-27 · **Branch:** `main`

## Changes

- Moved `FloorPlanService` + `PlanDuplicationService` into `features/floor-plans/`
- Made Supabase injection **private**
- Extracted pure helpers: split tables, RPC payload, duplication clone
- Characterization + mocked service tests
- Consumers updated (workspace, plan-editor, table-product-panel)

## Unchanged

- RPC contracts and duplication semantics (no orders copied; attended/observation cleared)
- Editor/panel presentation code left in place (debt: co-located with services until B7+)

## Technical debt noted

- `plan-editor` still large; should become `floor-editor` domain later
- `table-deletion.service` still under `core/services` (tables domain)
