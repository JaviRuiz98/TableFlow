# Module: orders

**Agent:** `tableflow-orders`  
**Path:** `src/app/features/orders/`

## 1. Purpose

Manage open orders, line items, product assignment RPC, pending badges, and realtime refresh hooks for the floor UI.

## 2. Responsibilities

- Load open order + items for a table
- Assign products via `assign_products_to_table`
- Mark / cancel / quantity-update pending lines
- Aggregate pending/total quantities per table
- Subscribe to `orders`, `order_items`, `tables` changes

## 3. Main files

| File | Role |
|------|------|
| `order.service.ts` | Data-access + domain operations (public API) |
| `order-state.service.ts` | Pure transition/quantity helpers |
| `open-order-quantity-maps.ts` | Pure aggregation for canvas badges (`OpenOrderQuantityRow`) |
| `index.ts` | Public barrel |

`forTable` returns `OrderItemWithProduct[]` (`core/models`). Nested PostgREST joins still cast at the service boundary (B10).

## 4. Public API (`OrderService`)

- `forTable(tableId)`
- `getOpenOrderQuantityMaps()`
- `addItem(tableId, productId, quantity, userId)`
- `assignProducts(tableId, items)`
- `markPlaced(itemId, userId)`
- `updatePendingItemQuantity(itemId, quantity)`
- `cancelPendingItem(itemId)`
- `subscribe(onChange, channelName?)` → `RealtimeChannel`

`SupabaseService` is **private**; do not re-expose `.client`.

## 5. Dependencies

- `core/infrastructure` (`SupabaseService`)
- `core/models` (`Order`, `OrderItem`, `Product`)

Consumers: `PlanEditorComponent`, `TableProductPanelComponent`, `WorkspaceComponent`.

## 6. Supabase

| Kind | Name |
|------|------|
| Tables | `orders`, `order_items` (+ join `products`) |
| RPC | `assign_products_to_table` |
| Realtime | `orders`, `order_items`, `tables` (`*`) |

## 7. Behaviour that must be preserved

- CANCELLED lines excluded from badges and `forTable` lists
- Assign RPC sets table unattended / pending semantics (server-side)
- `markPlaced` only updates `status='PENDING'` rows
- Quantity/cancel updates match previous editor filters (by id only)
- Realtime channel names used by workspace/panel/editor

## 8. Tests

- `order-state.service.spec.ts`
- `open-order-quantity-maps.spec.ts`

## 9. Modification restrictions

- No RPC/RLS/schema changes without authorization
- No exposing Supabase client on the service
- No UX/style changes in this module
