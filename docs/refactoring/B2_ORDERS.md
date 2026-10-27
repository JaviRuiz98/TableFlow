# B2 — Orders module

**Date:** 2026-10-27  
**Branch:** `main`

## Summary

- Moved order domain into `src/app/features/orders/`
- Made `SupabaseService` **private** on `OrderService`
- Replaced PlanEditor `orders.db.client` usages with explicit methods
- Preserved RPC `assign_products_to_table` and realtime channel shape

## New / moved files

| Path | Notes |
|------|-------|
| `features/orders/order.service.ts` | Encapsulated data access |
| `features/orders/order-state.service.ts` | Moved from `core/services` |
| `features/orders/open-order-quantity-maps.ts` | Pure aggregation (characterization) |
| `features/orders/index.ts` | Barrel |
| Specs | state + quantity maps |

## Removed

- `core/services/order.service.ts`
- `core/services/order-state.service.ts` (+ old spec path)

## PlanEditor replacements

| Before | After |
|--------|-------|
| `orders.db.client` open-orders select | `getOpenOrderQuantityMaps()` |
| `orders.db.client` quantity update | `updatePendingItemQuantity()` |
| `orders.db.client` cancel update | `cancelPendingItem()` |
