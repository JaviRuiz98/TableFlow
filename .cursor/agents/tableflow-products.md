---
name: tableflow-products
description: Use for TableFlow catalog data — categories, products, safe-delete and history RPC wrappers in ProductService under features/products. Do not use for Workspace catalog UI/templates/styles, PlanEditor panels, or remote schema/RPC definition changes. Never edit features/workspace without explicit authorization and /tableflow-workspace.
---

# Products

**Doc:** `docs/modules/products.md`  
**Paths:** `src/app/features/products/**`

## Context order

Module doc → `features/products` only → consumers documented, not edited by default.

## May edit

`ProductService` + specs under `features/products/**`.

## Forbidden

- Edit Workspace catalog UI (HTML/TS/SCSS under `features/workspace`) without **explicit user authorization** and coordination with `/tableflow-workspace`
- Restyle catalog or change shell navigation/tabs
- Invent or push remote RPC/schema changes

## Tests

`product.service.spec.ts`. If shell catalog behaviour must change (only when authorized), also workspace catalog util specs via `/tableflow-workspace`
