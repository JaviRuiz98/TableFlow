# Supabase Integration (contracts — do not break)

**Project:** TableFlow independent (`SUPABASE_URL` from `.env`).  
**Schema source of truth for greenfield:** `supabase/BOOTSTRAP_TABLEFLOW.sql` (+ historical `supabase/migrations/` for audit).

## Tables used by the app

`profiles`, `floor_plans`, `floor_plan_elements`, `tables`, `product_categories`, `products`, `orders`, `order_items`, `app_secrets` (via RPC only).

`reservations` exists in bootstrap/types; **no UI**.

## RPCs (frontend)

| RPC | Caller service (today) |
|-----|------------------------|
| `replace_floor_plan_snapshot` | FloorPlanService |
| `set_table_attended` | FloorPlanService |
| `set_table_observation` | FloorPlanService |
| `assign_products_to_table` | OrderService |
| `delete_table_with_orders` | TableDeletionService |
| `verify_app_secret` | UserAdminService |
| `product_has_order_history` / `category_has_order_history` | ProductService |
| `delete_product_safe` / `delete_category_safe` | ProductService |

## Realtime

| Channel usage | Tables / events |
|---------------|-----------------|
| OrderNotificationService | `order_items` `*`; `tables` `UPDATE` |
| OrderService.subscribe / editor | order-related changes for canvas colours |

Requires publication + `REPLICA IDENTITY FULL` on `tables` / `order_items`.

## Edge Functions

| Name | Auth |
|------|------|
| `create-user` | Caller JWT must be ADMIN + `user_management` secret |

Internal auth domain must match Angular: `usuarios.tableflow.app`.

## Frontend key policy

Only publishable/anon key in browser. Service role exclusively in Edge Function env.
