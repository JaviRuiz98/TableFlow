# B13 — Integration & E2E testing

**Status:** DONE (tests/docs only; no product refactor; no remote writes; no commit/push)  
**Branch:** `main`

## Audit summary

| Kind | Before B13 | After |
|------|------------|-------|
| Vitest specs | ~30 files / 138 tests | **35 files / 159 tests** |
| Playwright | 1 smoke | smoke + auth-shell (mutations blocked) |
| Shared fixtures | ad-hoc per file | `src/testing/fixtures.ts` + query mock |

Existing suite was strong on floor-editor utils, workspace characterization, notifications debounce, table deletion RPC mocks. Gaps filled: AuthService, authGuard, OrderService, FloorPlan load/RPC, cross-module channel naming, reservation **contract** (no UI invented).

## Added / modified tests

| File | Role |
|------|------|
| `src/testing/fixtures.ts` | Shared domain fixtures |
| `src/testing/supabase-query-mock.ts` | PostgREST builder mock |
| `src/testing/reservation.contract.spec.ts` | Schema/domain lock; no module |
| `src/app/core/auth/auth.service.spec.ts` | Login/logout/roles |
| `src/app/core/guards/auth.guard.spec.ts` | Session gate |
| `src/app/features/orders/order.service.spec.ts` | forTable/assign/maps/subscribe |
| `src/app/features/floor-plans/floor-plan.service.spec.ts` | load / attended / observation / create target |
| `src/app/features/workspace/workspace-orders-integration.spec.ts` | Orders + notifications channels |
| `e2e/helpers/network-safety.ts` | Block Supabase mutations |
| `e2e/auth-shell.spec.ts` | Redirect + login UI + blocked submit |
| `e2e/app.spec.ts` | Login smoke |

## E2E execution notes

- Base URL `/` with hash routes (`/#/login`).
- Mutations to `supabase.co` / `rest/v1` / `auth/v1` / `functions/v1` return **403** in auth-shell suite.
- **Executed:** `npm run e2e` → **4 passed** (`app.spec` + 3 `auth-shell`).
- **Blocked (by design):** authenticated ADMIN tab tour, plan editor gestures, catalog writes, create-user Edge against remote.

## Manual validation checklist

- [ ] ADMIN: Planos + Operativa + Productos + Usuarios visibles
- [ ] USER: solo Operativa; alerta pedido/observación
- [ ] Guardar plano / undo-redo / zoom en dispositivo real
- [ ] Asignar producto + attended (entorno no productivo)
- [ ] create-user en staging aislado

## Agent guidance

- Prefer module folder specs + `src/testing` fixtures.
- Never “greenwash” by weakening assertions.
- Next phase **B14** = agent docs/rules (await auth).
