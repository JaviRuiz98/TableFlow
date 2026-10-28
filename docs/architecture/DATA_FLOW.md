# Data Flow

## Auth

1. User enters username/password on Login.
2. Username → internal email `*@usuarios.tableflow.app` (`auth-identity.ts`).
3. `signInWithPassword` → session persisted; `tableflow.sessionStartedAt` set.
4. Profile loaded from `profiles`; `authGuard` gates Workspace.
5. Absolute 12h session cap enforced in `AuthService`.

## Admin catalog / plans

Workspace (ADMIN) → `ProductService` / `FloorPlanService` → PostgREST with RLS → UI lists refresh locally.

## Assign products to table

ADMIN UI → `OrderService.assignProductsToTable` → RPC `assign_products_to_table` → sets table `attended=false` → Realtime notifies RECEPTOR.

## Mark attended

RECEPTOR/ADMIN → `FloorPlanService.setTableAttended` → RPC `set_table_attended` → PENDING open items → PLACED + `attended=true`.

## Observations

ADMIN → `set_table_observation` → may clear attended when non-empty → Realtime `tables` UPDATE with replica identity FULL → RECEPTOR alert.

## Floor save

Editor snapshot → RPC `replace_floor_plan_snapshot` (INVOKER + ADMIN RLS) → upsert tables by id; delete removed; elements replaced.

## User creation

ADMIN password → `verify_app_secret('user_management')` → Edge `create-user` (service role **server-side only**) → profile row with role.
