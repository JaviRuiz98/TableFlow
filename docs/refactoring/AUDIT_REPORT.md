# TableFlow — Architectural Audit Report (ETAPA A)

**Date:** 2026-10-27  
**Scope:** static analysis + safe local commands only  
**Constraint:** zero functional change; no remote DB writes; Sala Chocolatte untouched

---

## 0. Project protection (Fase 0)

| Check | Result |
|-------|--------|
| Current branch | `audit/local-supabase-validation` (tracks origin; contains prior DB audit work) |
| Uncommitted work | Yes: Angular env wiring, auth domain `usuarios.tableflow.app`, `.gitignore`, `.env.example`, bootstrap SQL, etc. |
| Proposed refactor branch | `refactor/modular-architecture` (create **from current branch or main after stash/commit of WIP** — needs user authorization) |
| Supabase target | `.env` → `https://slcqjjrylgqnvqgiclyb.supabase.co` (TableFlow) |
| Secrets in frontend | Publishable key only; generate-env rejects `sb_secret_` / service_role |
| Destructive remote ops | Not run |
| `.env` | Present locally; gitignored — **not modified** in this audit phase |

**Baseline behaviour reference:** production build succeeds (`npm run build` → `dist/discoteca`). Unit tests currently **blocked** by missing `jsdom`. E2E is a single smoke test against local `ng serve` (not remote DB writes by itself, but starts app with TableFlow `.env`).

---

## 1. Current architecture (as implemented)

### 1.1 Folder shape

```
src/app/
  app.component.ts          # shell: IonApp + router-outlet
  app.routes.ts             # login | '' (authGuard → Workspace)
  core/
    auth/                   # AuthService, auth-identity
    guards/                 # authGuard
    models/models.ts        # domain types
    data/database.types.ts  # Supabase Database (mostly `any` rows)
    services/               # all data + helpers (flat)
  features/
    auth/login.component.ts
    workspace.component.*   # admin shell + tabs + catalog + users
    floor-plans/
      plan-editor.component.*      # Konva editor + operativa (~1.7k LOC TS)
      table-product-panel.component.*
```

- All components inspected are **standalone**.
- **No** NgModules feature split, **no** lazy-loaded feature routes (only Ionic lazy chunks from the framework).
- **No** interceptors, **no** pipes/directives custom folders, **no** `shared/`, **no** `data-access/` layer separate from services.

### 1.2 Real domains (implemented)

| Domain | Evidence |
|--------|----------|
| Authentication / session (12h) | `auth.service.ts`, `login.component.ts`, `auth.guard.ts` |
| User administration | `user-admin.service.ts` + workspace dialogs (`verify_app_secret`, `create-user`) |
| Floor plans CRUD / lock / duplicate | `floor-plan.service.ts`, `plan-duplication.service.ts`, workspace |
| Floor editor (Konva) | `plan-editor.component.ts`, `geometry.service.ts` |
| Tables / reserved (as `tables.type`) | editor + `floor-plan.service` RPCs |
| Reservations (DB table) | schema + types only; **no Angular feature UI** |
| Products / categories | `product.service.ts` + workspace catalog |
| Orders / order items / attended | `order.service.ts`, editor, panel |
| Observations | `set_table_observation` via floor-plan service + editor UI |
| Realtime notifications | `order-notification.service.ts` + workspace / editor channels |
| Table deletion (password) | `table-deletion.service.ts` |
| Native shell | Capacitor android/ios, `capacitor.config.ts` (legacy brand ids) |

### 1.3 Size / complexity hotspots

| Artifact | Approx. size | Issue |
|----------|--------------|-------|
| `plan-editor.component.ts` | ~1714 LOC | God component: canvas, orders, observations, realtime, deletion, admin gates |
| `plan-editor.component.scss` | ~1314 LOC | Coupled visual surface (do **not** restyle in refactor) |
| `workspace.component.ts` | ~715 LOC | Shell + plans + catalog + users + notifications orchestration |
| `floor-plan.service.ts` | ~223 LOC | Mixed plan CRUD + table attended/observation RPCs |
| `database.types.ts` | all `Row: any` | Weak compile-time contracts |

---

## 2. TypeScript / quality

- Widespread `any` in editor order item signals and `database.types`.
- Direct Supabase client access from UI (`plan-editor` updates `order_items` / queries `orders` bypassing `OrderService` in places).
- `OrderService` uses `(this.db.client as any).rpc(...)`.
- Error handling centralized partially via `ErrorMessageService`.
- State: Angular **signals** in workspace/editor; no global store (correct; do not introduce NgRx).

---

## 3. Supabase integration boundary

| Concern | Location | Notes |
|---------|----------|-------|
| Client | `supabase.service.ts` | Single `createClient`; env-driven |
| Auth | `auth.service.ts` | Session + profile load |
| Tables CRUD / RPC | services + some UI leaks | Boundary incomplete |
| Edge Function | `user-admin` → `create-user` | Domain `usuarios.tableflow.app` |
| Realtime | `order.service.subscribe`, `order-notification.service` | `order_items`, `tables` |
| Types | `database.types.ts` | Opaque `any` |

**Do not change** RLS, RPC signatures, or remote schema during modular refactor.

---

## 4. Ionic / Capacitor

- Ionic standalone components used in templates.
- Capacitor present (`android/`, `ios/`); appId still `com.salachocolatte.app` (brand debt, out of functional scope unless authorized).
- Hash routing (`withHashLocation`) + historically `/discoteca/` base in PWA/e2e configs.

---

## 5. Dependencies

| Package | Role | Note |
|---------|------|------|
| Angular 20 / Ionic 8 / Capacitor 8 | Core | Do not upgrade in this refactor |
| `@supabase/supabase-js` ^2.112.3 | API | Compatible with `sb_publishable_` |
| Konva | Canvas editor | Critical to plan-editor |
| Vitest via Angular unit-test builder | Tests | **Missing `jsdom`** → tests fail to run |
| Playwright | E2E | Minimal coverage |

Unused-in-app candidates (see CLEANUP_REPORT): `OrderStateService`, `TableValidationService` (only referenced by their specs).

---

## 6. Coupling graph (simplified)

```
LoginComponent → AuthService → SupabaseService
WorkspaceComponent → Auth, FloorPlan, Product, Order, UserAdmin,
                     PlanDuplication, OrderNotification, PlanEditor, TableProductPanel
PlanEditor → FloorPlan, Geometry, Auth, Order, Product, TableDeletion
             (+ direct Supabase via orders.db.client)
TableProductPanel → FloorPlan, Product, Order, Auth
```

Circular risk: low between services; **high concentration** of domain logic inside PlanEditor/Workspace.

---

## 7. Naming / brand debt (non-functional for runtime if env correct)

- package name `discoteca`, paths `/discoteca/`, texts “Sala Chocolatte”, Capacitor id legacy.
- Docs/README still describe CreadorSala in places.
- **Refactor must not change UX copy/styles** unless separately authorized; rename can be deferred as Etapa D optional / authorized brand pass.

---

## 8. Safe commands inventory

| Command | Safe vs remote DB? | Status observed |
|---------|-------------------|-----------------|
| `npm run build` | Yes (local bundle) | **PASS** (warnings: unused Ion imports; bundle budget) |
| `npm test` | Yes (local) | **FAIL** — missing peer `jsdom` |
| `npm run lint` | Yes | **FAIL** — eslint scans huge/irrelevant set (~6116 errors; misconfigured ignores) |
| `npm run e2e` | Starts local app with `.env` TableFlow; smoke only | **Not run** in Etapa A (would hit remote Auth if extended later) |
| `supabase db *` remote | **Forbidden** without auth | Not run |

---

## 9. Top problems (prioritized for Etapa B)

1. **Monolithic PlanEditor** — highest risk/reward for extraction *with* characterization tests.
2. **Workspace god-shell** — split presentation vs admin orchestration carefully.
3. **Leaking data-access into components** — route all Supabase via services.
4. **Weak typing** — replace `any` gradually without behaviour change.
5. **Test toolchain broken** — fix `jsdom` + eslint ignore before claiming regressions caught.
6. **Dead/orphan helpers** — classify before delete (B, not A until proven).

---

## 10. Explicit non-goals of this audit

- No code moves yet.
- No file deletions.
- No README rewrite yet (Etapa C/D).
- No Cursor rules written yet (drafted in REFACTOR_PLAN only).
