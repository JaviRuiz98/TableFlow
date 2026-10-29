# Agent map

| Invoke | Domain | Code paths | Module doc | Primary tests |
|--------|--------|------------|------------|---------------|
| `/tableflow-orchestrator` | Coordination | (plan only) | this map + DEPENDENCY_MAP | n/a |
| `/tableflow-auth` | Auth + registro-empresa | `core/auth`, `core/guards`, `features/auth` | [auth.md](../modules/auth.md) | auth*.spec |
| `/tableflow-onboarding` | ADMIN first-run | `features/onboarding` | [onboarding.md](../modules/onboarding.md) | onboarding*.spec, workspace-entry.guard |
| `/tableflow-admin-dashboard` | ADMIN enterprise shell | `features/admin-dashboard` | [admin-dashboard.md](../modules/admin-dashboard.md) | admin-metrics*, admin-dashboard.guard |
| `/tableflow-workspace` | Operative shell `/sala` | `features/workspace` (+ `components/`) | [workspace.md](../modules/workspace.md) | workspace*.spec |
| `/tableflow-floor-plans` | Persistence | `features/floor-plans` | [floor-plans.md](../modules/floor-plans.md) | floor-plan*.spec |
| `/tableflow-floor-editor` | Konva editor | `features/floor-editor` (+ `components/` + helpers) | [floor-editor.md](../modules/floor-editor.md) | geometry/canvas/tools/history + components |
| `/tableflow-tables` | Tables helpers | `features/tables` | [tables.md](../modules/tables.md) | table-*.spec |
| `/tableflow-orders` | Orders | `features/orders` | [orders.md](../modules/orders.md) | order*.spec |
| `/tableflow-products` | Catalog **data** (not workspace UI) | `features/products` | [products.md](../modules/products.md) | product.service.spec |
| `/tableflow-users` | Users admin | `features/users` + `workspace/workspace-user-admin/` | [users.md](../modules/users.md) | user-admin*.spec |
| `/tableflow-notifications` | Realtime alerts | `features/notifications` | [notifications.md](../modules/notifications.md) | order-notification*.spec |
| `/tableflow-test-runner` | QA tooling | specs, e2e, configs | [TEST_STRATEGY](../testing/TEST_STRATEGY.md) | npm test/e2e/lint/build |
| `/tableflow-db-contracts` | Types/SQL docs | `core/data`, `core/models`, `supabase` | [B10_TYPES](../refactoring/B10_TYPES.md) | database.types / reservation contract |

**Cursor mechanisms:** always-apply + globs in `.cursor/rules/*.mdc`; specialists in `.cursor/agents/*.md` (not Desktop session picker top-level). Descriptions include use / do-not-use triggers (B14.1+).

**Products ↔ workspace:** `/tableflow-products` must not edit `features/workspace` without explicit auth + `/tableflow-workspace`.

**Onboarding ↔ workspace:** `/tableflow-onboarding` owns flags/guards/checklist; guided shell chrome in workspace needs `/tableflow-workspace`.

**Admin ↔ sala:** `/tableflow-admin-dashboard` owns `/admin/*`; operative `/sala` stays `/tableflow-workspace`.

**Reservations:** no UI agent — contract only via `/tableflow-db-contracts` + `src/testing/reservation.contract.spec.ts`.
