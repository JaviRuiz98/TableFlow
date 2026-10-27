# Module Map (current → target)

## Current folders → logical domains

| Logical domain | Current primary files | Target home (Etapa B) |
|----------------|----------------------|------------------------|
| Authentication | `core/auth/*`, `features/auth/login.component.ts`, `core/guards/auth.guard.ts` | `features/authentication/` + keep `core/auth` thin |
| Workspace shell | `features/workspace/*` | **Done (B7)** — see [../modules/workspace.md](../modules/workspace.md) |
| Floor plans | `features/floor-plans/floor-plan.service.ts`, `plan-duplication.service.ts`, utils | **Done (B6)** — see [../modules/floor-plans.md](../modules/floor-plans.md) |
| Floor editor | `features/floor-plans/plan-editor.component.*`, `geometry.service.ts` | Pending B8 (`floor-editor`) |
| Tables / reserved | Embedded in editor + floor-plan RPCs | `features/tables/` (services + types usage) |
| Reservations (SQL) | `BOOTSTRAP` / `database.types` only | Docs only until UI exists |
| Products | `features/products/*` | **Done (B3)** — see [../modules/products.md](../modules/products.md) |
| Orders | `features/orders/*` (`OrderService`, `OrderStateService`, quantity maps) | **Done (B2)** — see [../modules/orders.md](../modules/orders.md) |
| Notifications | `features/notifications/*` | **Done (B5)** — see [../modules/notifications.md](../modules/notifications.md) |
| Users admin | `features/users/*` | **Done (B4)** — see [../modules/users.md](../modules/users.md) |
| Infrastructure | `core/infrastructure/*` (`SupabaseService`, `ErrorMessageService`, barrel `index.ts`) | **Done (B1)** |
| Shared models | `core/models/models.ts` | stay in `core/models` |

## Public surfaces agents should prefer

- Types: `src/app/core/models/models.ts`
- Auth API: `AuthService` (`session`, `profile`, `signIn`, `signOut`, `hasRole`)
- Data: dedicated `*Service` classes — not raw `SupabaseClient` from components (target state)

## Out of scope modules

- No payments, no multi-tenant orgs, no map geolocation beyond Konva canvas.
