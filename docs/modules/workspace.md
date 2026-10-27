# Module: workspace (shell)

**Agent (future):** `tableflow-workspace`  
**Path:** `src/app/features/workspace/`

## Purpose

UI shell after login: tabs, plan list, operativa composition, product catalog UI, admin user dialogs, toast/alerts. Coordinates feature modules; does **not** own domain persistence.

## Responsibilities

- Compose `PlanEditorComponent` + `TableProductPanelComponent`
- Navigate tabs (`planos` / `operativo` / `productos`) by role
- Presentation state (dialogs, toast, editor/operativo mode, map visibility)
- Orchestrate user actions → `floor-plans` / `products` / `users` / `orders` / `notifications` / `auth`
- Init + teardown of Realtime channels
- Session reset of transient overlays on init/logout

## Not this module

- Konva / snapshot RPCs → `floor-plans` / future `floor-editor`
- Order mutations → `orders`
- Catalog CRUD API → `products`
- create-user Edge → `users`
- Alert Realtime wiring internals → `notifications`
- Raw Supabase client → `core/infrastructure`

## Main files

| File | Role |
|------|------|
| `workspace.component.ts` | Coordinator + template bindings |
| `workspace.component.html` / `.scss` | Shell UI (do not restyle without auth) |
| `workspace-init.util.ts` | Role-based initial presentation |
| `workspace-user-form.util.ts` | New-user form validation |
| `workspace-alerts.util.ts` | USER alert copy constants |
| `index.ts` | Public export of `WorkspaceComponent` |

## Init flow

1. `resetTransientUi()`
2. Load plans + categories + products via feature services
3. `initialWorkspacePresentation(isAdmin, plans)` → tab / map / selection
4. If USER: `OrderNotificationService.subscribeToNewOrderItems`
5. Always: `OrderService.subscribe(..., 'workspace-orders')`
6. `ngOnDestroy` / `logout`: unsubscribe both channels

## State notes

- Signals for UI; keep RxJS-style channel handles as returned by services (do not flip to Signals for preference).
- `configured` comes from `SupabaseService.configured` (never peek private `FloorPlanService` client).
- `refreshOperationalData` is intentionally a no-op hook (Realtime drives UI elsewhere).

## Consumers / contracts

| Module | Usage |
|--------|--------|
| `floor-plans` | list/create/update/remove + duplication |
| `products` | catalog CRUD + safe delete checks |
| `users` | verifyAccess + createUser |
| `orders` | Realtime subscribe |
| `notifications` | USER order/observation alerts |
| `core/auth` | role, session, signOut |
| `core/infrastructure` | Supabase configured + error humanize |
| `plan-editor` | `@ViewChild` saveDesign / openOperationalTarget |

## Tests

- `workspace.component.spec.ts` (mocked services; stubbed children)
- `workspace-init.util.spec.ts`
- `workspace-user-form.util.spec.ts`
- `workspace-alerts.util.spec.ts`

## Restrictions for agents

- No visual/HTML/CSS/navigation changes unless authorized
- No circular imports (workspace → features OK; features must not import workspace)
- No exposing Supabase from this shell
- Do not auto-advance to floor-editor (B8) without authorization
