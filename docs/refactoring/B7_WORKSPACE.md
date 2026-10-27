# B7 — Workspace shell

**Date:** 2026-10-27 · **Branch:** `main`

## Changes

- Relocated shell to `features/workspace/` (TS/HTML/SCSS + barrel)
- `WorkspaceComponent` remains the coordinator; HTML/SCSS unchanged
- Extracted pure helpers: init presentation, user-form validation, alert copy
- `configured` via `SupabaseService` (removed `(floors as any).db` leak after B6 private `db`)
- Characterization tests for init/role/panels/logout cleanup
- Route import → `./features/workspace`

## Unchanged

- Tab navigation, dialogs, catalog/plan/user flows, alert texts, styles
- Realtime semantics (`orders` + `notifications` channels)
- No new global state libraries

## Technical debt noted

- Component still ~700 LOC (dialogs remain inline; further child extraction needs UI auth)
- `PlanEditor` still large → next module **floor-editor (B8)**
- Branding still “Sala Chocolatte” in toolbar (cosmetic; out of B7 scope)
