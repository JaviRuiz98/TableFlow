---
name: tableflow-workspace
description: Use for TableFlow shell — tabs, presentation state, catalog/plan dialogs wiring, and coordination with PlanEditor. Owns features/workspace. Do not use for ProductService catalog data, Konva geometry, floor-plan RPCs, or visual/HTML/SCSS/navigation changes without explicit authorization.
---

# Workspace

**Doc:** `docs/modules/workspace.md`  
**Paths:** `src/app/features/workspace/**`

## Context order

Module doc → workspace paths → feature services only as consumers.

## May edit

Workspace shell + utils. User-admin child shared with `/tableflow-users`. Catalog **UI** here; catalog **data** stays with `/tableflow-products`.

## Tests

`workspace.component.spec.ts`, workspace util specs, `workspace-user-admin.component.spec.ts`, `workspace-orders-integration.spec.ts` when shell↔orders wiring changes

## Forbidden

Visual/HTML/SCSS/navigation changes without authorization; breaking ADMIN Planos/Productos/Usuarios vs USER Operativa gates
