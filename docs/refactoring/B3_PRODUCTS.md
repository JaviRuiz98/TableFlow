# B3 — Products module

**Date:** 2026-10-27 · **Branch:** `main`

## Changes

- Moved `ProductService` → `src/app/features/products/`
- Private `readonly` Supabase injection (same encapsulation as orders)
- Updated imports in workspace, plan-editor, table-product-panel
- Added mocked unit tests for list/create/delete/history RPC behaviour

## Removed

- `src/app/core/services/product.service.ts`
