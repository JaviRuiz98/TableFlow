# Module: products

**Agent:** `tableflow-products`  
**Path:** `src/app/features/products/`

## Purpose

Catalog of product categories and active products for ADMIN management and order assignment UIs.

## Responsibilities

- List categories / active products **for the signed-in company**
- Create / rename categories and products
- Update product fields (`Partial<Product>`), without allowing client reassignment of `company_id`
- Safe delete + history checks via RPC

## Main files

| File | Role |
|------|------|
| `product/product.service.ts` | Data access (private `SupabaseService` + `AuthService` for tenant) |
| `product/product.service.spec.ts` | Mocked Supabase unit tests |
| `index.ts` | Public barrel |

## Public API (`ProductService`)

- `categories()`, `products()` (active only, filtered by `profile.company_id`)
- `createCategory(name)`, `createProduct(categoryId, name, price?)` (`price` optional ≥ 0, `company_id` from profile)
- `updateProduct(id, patch)`, `updateCategory(id, name)`
- `productHasOrderHistory` / `categoryHasOrderHistory`
- `deleteProductSafe` / `deleteCategorySafe` → `boolean` (`data === true`)

## Dependencies

- `core/infrastructure` · `core/models` · `core/auth` (`profile.company_id`)
- Consumers: Workspace catalog, PlanEditor, TableProductPanel, Onboarding
- Orders module consumes product **ids** via assignment UI; no hard import of ProductService into OrderService

## Supabase

| Kind | Name |
|------|------|
| Tables | `product_categories`, `products` (`company_id` → `companies`, migration `0018`) |
| RPC | `product_has_order_history`, `category_has_order_history`, `delete_product_safe`, `delete_category_safe` |
| RLS | `products_company_select`, `products_admin_company_write` (tenant-scoped) |

## Business rules (do not change)

- Catalog list uses `active = true` only **and** `company_id = profile.company_id`
- New products may set `price` (≥ 0 or null) and **must** set `company_id` from the signed-in profile
- Catalog UI (workspace) shows price on create and in the product list summary
- Missing `profile.company_id` → catalog list/create/update fail with a clear error
- Delete RPCs block on non-CANCELLED order history (server-side)
- ADMIN gating is UI + RLS/RPC, not duplicated in the service

## Known gaps

- `product_categories` is still global (no `company_id` yet). Products are tenant-scoped; category lists may still be shared until a follow-up migration.

## Restrictions

- No RPC/RLS/schema edits without authorization
- Do not expose Supabase client
- Do not alter catalog UX/styles here
- Do not apply `0018` remotely without explicit TableFlow authorization
