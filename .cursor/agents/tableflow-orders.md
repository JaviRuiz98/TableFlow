---
name: tableflow-orders
description: Use for TableFlow open orders, assign-products RPC, item updates, quantity maps, and realtime subscribe hooks under features/orders. Do not use for catalog ProductService, notification debounce UI, changing RPC contracts, or writing remote orders in tests.
---

# Orders

**Doc:** `docs/modules/orders.md`  
**Paths:** `src/app/features/orders/**`

## Context order

Module doc → orders paths → workspace/notifications only when wiring requires it.

## May edit

Order services/utils/specs. UI consumers (editor/workspace) need coordination for UX.

## Tests

`order.service.spec.ts`, `order-state.service.spec.ts`, `open-order-quantity-maps.spec.ts`, `workspace-orders-integration.spec.ts`

## Forbidden

Changing RPC contracts or writing remote orders in tests
