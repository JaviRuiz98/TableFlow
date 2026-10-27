# Module Map

**Plan:** [../refactoring/REFACTOR_PLAN.md](../refactoring/REFACTOR_PLAN.md) (sequence B7.5→B14)  
**Deps:** [DEPENDENCY_MAP.md](./DEPENDENCY_MAP.md)

## Domains ↔ folders

| Logical domain | Current primary location | Target / status |
|----------------|--------------------------|-----------------|
| Authentication | `core/auth/*`, `features/auth/login.component.ts`, `core/guards/` | Keep; optional rename later |
| Workspace shell | `features/workspace/*` (~700 LOC) | **B7 done**; further split **B11** |
| Floor plans (data) | `features/floor-plans/` services + utils | **B6 done**; editor removed in **B7.5** |
| Floor editor (UI) | `features/floor-editor/` (geometry/canvas/tools/history) | **B8 DONE** — [../modules/floor-editor.md](../modules/floor-editor.md) |
| Geometry | `features/floor-editor/geometry/` | **Done (B8.2)** — see [../modules/floor-editor.md](../modules/floor-editor.md) |
| Tables / reserved | RPCs on `FloorPlanService` + validation/deletion in `core/services/` | **`features/tables/`** — **B9** |
| Reservations (SQL) | Bootstrap / types only | Docs only until UI |
| Products | `features/products/*` | **Done (B3)** — [../modules/products.md](../modules/products.md) |
| Orders | `features/orders/*` | **Done (B2)** — [../modules/orders.md](../modules/orders.md) |
| Notifications | `features/notifications/*` | **Done (B5)** — [../modules/notifications.md](../modules/notifications.md) |
| Users admin | `features/users/*` | **Done (B4)** — [../modules/users.md](../modules/users.md) |
| Infrastructure | `core/infrastructure/*` | **Done (B1)** |
| Shared models | `core/models/models.ts` | Stay |
| Generated DB types | `database.types.ts` (`any` debt) | **B10** |
| Branding / dead code | README, `package.json`, orphans | **B12** |
| Integration / E2E | Playwright smoke only | **B13** |
| Agent docs / Cursor rules | Partial under `docs/` | **B14** |

## Actual trees (post B7.5)

### `features/floor-plans/` (persistence only)

```text
floor-plans/
  index.ts
  floor-plan.service.ts (+ spec)
  plan-duplication.service.ts (+ spec)
  floor-plan-snapshot.util.ts (+ spec)
```

### `features/floor-editor/` (graphic + panel)

```text
floor-editor/
  index.ts
  plan-editor.component.{ts,html,scss}
  table-product-panel.component.{ts,html,scss}
  geometry/ canvas/ tools/ history/   # B8.2–B8.5
```

### Pending

- `features/tables/` — B9 (`table-validation`, `table-deletion` from `core/services`)

## Public surfaces agents should prefer

- Types: `core/models/models.ts`
- Auth: `AuthService`
- Data: feature `*Service` public APIs — never raw `SupabaseClient` from UI
- Module brief: `docs/modules/<domain>.md` for the domain in scope

## Out of scope

No payments, multi-tenant orgs, or map geolocation beyond Konva canvas.
