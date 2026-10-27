# B10 — TypeScript & Supabase contracts

**Status:** DONE (types-only; no schema / RPC / functional changes)  
**Branch:** `main` (no commit/push in this phase)

## Diagnosis (pre-change)

| Area | Finding |
|------|---------|
| `core/data/database.types.ts` | All table `Row`/`Insert`/`Update` were `any`; Enums + most Functions already concrete |
| Domain | `core/models/models.ts` already mirrored business shapes |
| Hotspots | PlanEditor `Array<any>` order items; OrderService nested-select casts; FloorPlanService `as` on rows; Workspace/panel `any` channels |
| Official gen | Not used: no verified read-only CLI path this session; `.env` inspection blocked for secrets safety |
| Schema truth | `supabase/BOOTSTRAP_TABLEFLOW.sql` + existing service RPC call sites |

## Origin of types

| Layer | Location | Origin |
|-------|----------|--------|
| Generated-style `Database` | `src/app/core/data/database.types.ts` | Hand-aligned from BOOTSTRAP + verified RPCs in app |
| Domain models | `src/app/core/models/models.ts` | TableFlow app contracts; enums re-exported from `database.types` |
| Transport / nested joins | Service boundaries | Casts/`Json` where Relationships / jsonb RPC args cannot be structural |
| Dynamic JSON RPC | `delete_table_with_orders` → `Json` | Adapted to `DeleteTableResult` in `TableDeletionService` (unchanged runtime) |

**Not present in bootstrap:** `user_management` RPC — users use Edge Function / auth flows; no invented signature.

## Verified RPC contracts (Args/Returns)

| RPC | Args | Returns |
|-----|------|---------|
| `replace_floor_plan_snapshot` | `p_floor_plan_id`, `p_elements: Json`, `p_tables: Json` | `undefined` |
| `assign_products_to_table` | `p_table_id`, `p_items: Json` | `string` (order id) |
| `delete_table_with_orders` | `p_table_id`, `p_secret`, `p_force` | `Json` (`{ ok, reason }`) |
| `set_table_attended` / `set_table_observation` | table id + flags/text | `undefined` |
| `verify_app_secret` | `p_key`, `p_secret` | `boolean` |
| catalog `*_has_order_history` / `delete_*_safe` | entity id | `boolean` |

Json payloads for elements/tables/items remain opaque at the RPC Args layer (do not invent composites).

## Necessary conversions (kept)

- Snapshot / assign payloads → `as unknown as Json` at `rpc()` call sites.
- Nested selects (`order_items` + `products(*)`, open-order quantity maps) → domain cast until Relationships are generated.
- `floor_plan_elements.points` jsonb → `number[] | null` via `mapFloorPlanElementRow` (null if non-array).
- DOM events (`WheelEvent` / `TouchEvent`) in PlanEditor — browser boundary, unchanged.

## What changed (high level)

- Concrete `Row`/`Insert`/`Update` for all public tables including `app_secrets` + `reservations`.
- Helpers `Tables` / `TablesInsert` / `TablesUpdate` / `Enums`.
- `OrderItemWithProduct` / `OrderItemCategoryGroup` / `Reservation` domain types.
- PlanEditor + table-product-panel + workspace channels typed.
- FloorPlanService / ProductService / Auth profile load rely on typed client returns where possible.
- Specs: `database.types.spec.ts`, `floor-plan-element.mapper.spec.ts`.

## Safe regeneration procedure (future)

1. Confirm project is **TableFlow only** (never Sala Chocolatte).
2. Use read-only access: `supabase gen types typescript --project-id <tableflow>` **or** linked local schema from BOOTSTRAP — no migrations, no privileged keys in frontend.
3. Diff against current `database.types.ts`; preserve app comments for Json RPC Args if generator emits `Json`.
4. Re-run `npm test && npm run lint && npm run build`.
5. Do not change JSON payload shapes to “fit” new types — fix types instead.

## Limitations / debt

- Types are BOOTSTRAP-aligned, not live-generated — drift risk if remote diverges.
- Nested PostgREST joins / aliased embeds still need `as unknown as` (empty Relationships → SelectQueryError otherwise; live gen can fill FKs later).
- RPC jsonb Args stay `Json`.
- `Profile.username` optional in domain vs non-optional `| null` on Row (compatible).
- Attended/observation still on `FloorPlanService` (B9 deferral).
- Residual `as` in tests/Konva/DOM are intentional.

## Agent recommendations

- Prefer `core/models` in UI; `Database` / `Tables<>` only at infrastructure/service boundaries.
- Never invent RPC Args/Returns — check BOOTSTRAP + call sites.
- Do not move services or change payloads under a “types” banner.
- Next authorized phase: **B11 workspace** (not auto-start).
