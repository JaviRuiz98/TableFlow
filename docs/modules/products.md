# Module: products

**Agent:** `tableflow-products`  
**Path:** `src/app/features/products/`

## Purpose

Catalog of product categories and active products for ADMIN management and order assignment UIs.

## Responsibilities

- List categories / active products
- Create / rename categories and products
- Update product fields (`Partial<Product>`)
- Safe delete + history checks via RPC

## Main files

| File | Role |
|------|------|
| `product.service.ts` | Data access (private `SupabaseService`) |
| `index.ts` | Public barrel |
| `product.service.spec.ts` | Mocked Supabase unit tests |

## Public API (`ProductService`)

- `categories()`, `products()` (active only)
- `createCategory(name)`, `createProduct(categoryId, name)` (`price: null`)
- `updateProduct(id, patch)`, `updateCategory(id, name)`
- `productHasOrderHistory` / `categoryHasOrderHistory`
- `deleteProductSafe` / `deleteCategorySafe` → `boolean` (`data === true`)

## Dependencies

- `core/infrastructure` · `core/models`
- Consumers: Workspace catalog, PlanEditor, TableProductPanel
- Orders module consumes product **ids** via assignment UI; no hard import of ProductService into OrderService

## Supabase

| Kind | Name |
|------|------|
| Tables | `product_categories`, `products` |
| RPC | `product_has_order_history`, `category_has_order_history`, `delete_product_safe`, `delete_category_safe` |

## Business rules (do not change)

- Catalog list uses `active = true` only
- New products insert `price: null`
- Delete RPCs block on non-CANCELLED order history (server-side)
- ADMIN gating is UI + RLS/RPC, not duplicated in the service

## Restrictions

- No RPC/RLS/schema edits without authorization
- Do not expose Supabase client
- Do not alter catalog UX/styles here
