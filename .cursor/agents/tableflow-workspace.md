---
name: tableflow-workspace
description: Use for TableFlow shell — tabs, presentation state, plan/catalog dialog children, alert modal, and PlanEditor coordination under features/workspace. Do not use for ProductService catalog data APIs, Konva geometry, floor-plan RPCs, or visual/HTML/SCSS/navigation changes without explicit authorization.
---

# Workspace

**Doc:** `docs/modules/workspace.md`  
**Paths:** `src/app/features/workspace/**`

## Context order

Module doc → shell + `components/` → feature services only as consumers.

## May edit

Workspace shell, utils, and `components/*` (plan-admin, catalog-panel, user-alert). User-admin child shared with `/tableflow-users`. Catalog **UI** here; catalog **data** stays with `/tableflow-products`.

## Tests

`workspace.component.spec.ts`, `components/**/*.spec.ts`, util specs, `workspace-user-admin.component.spec.ts`, `workspace-orders-integration.spec.ts` when shell↔orders wiring changes

## Coordinate

- Guided onboarding shell (`tf_setup` / incomplete ADMIN) → `/tableflow-onboarding` owns flags/guards/checklist; this agent owns shell chrome when coordinating
- Onboarded ADMIN home `/admin` → `/tableflow-admin-dashboard` (operative `/sala` stays here)

## Forbidden

Visual/HTML/SCSS/navigation changes without authorization; breaking USER management vs RECEPTOR receive vs ADMIN placeholder/Usuarios gates; rewriting onboarding checklist semantics without `/tableflow-onboarding`
