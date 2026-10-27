# TableFlow — System Overview

**Audience:** humans and AI agents needing global context before a single domain.  
**Related:** [MODULE_MAP.md](./MODULE_MAP.md) · [DEPENDENCY_MAP.md](./DEPENDENCY_MAP.md) · [DATA_FLOW.md](./DATA_FLOW.md) · [SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md) · [Refactor plan](../refactoring/REFACTOR_PLAN.md)

## What it is

TableFlow is a PWA / Capacitor app (Angular 20 + Ionic 8) for nightclub floor operations: floor plans, tables/reserved spots, product catalog, orders, attended state, observations, and realtime staff alerts. Backend is **Supabase (Postgres + Auth + Realtime + Edge Function `create-user`)**.

## Hard boundaries

- Use **TableFlow** Supabase project only (`SUPABASE_URL` / publishable key from `.env`).
- **Never** write to Sala Chocolatte / CreadorSala databases.
- Do not change RLS, RPC contracts, UX/styles, or navigation unless explicitly authorized.
- No `service_role` / `sb_secret_*` in the Angular bundle.
- Work on **`main`** only; no commits/pushes without authorization.

## Runtime entrypoints

| Entry | Role |
|-------|------|
| `src/main.ts` | Bootstrap Ionic + hash router + optional SW |
| `src/app/app.routes.ts` | `/login`, `/` (authGuard → Workspace) |
| `scripts/generate-env.mjs` | Writes `src/environments/*` from `.env` on `prestart`/`prebuild` |

## Roles

- `ADMIN` — plans, catalog, assign products, observations, user creation, deletions.
- `USER` — operational view; mark attended via RPC; read observations; receive realtime alerts.

## Where logic lives (current)

| Area | Location |
|------|----------|
| Shell | `features/workspace/` (~614 LOC coordinator + user-admin child; **B11 done**) |
| Plan persistence | `features/floor-plans/` services + snapshot utils |
| Editor UI | `features/floor-editor/` — B8 modularized (geometry/canvas/tools/history); PlanEditor still coordinates Konva |
| Domain I/O | `features/{orders,products,users,notifications,floor-plans}` |
| Tables domain | `features/tables/` (B9); attended/observation still via `FloorPlanService` |
| Cross-cutting | `core/infrastructure` (`SupabaseService`, `ErrorMessageService`) |

## Refactor remaining (do not skip)

**B9–B11 DONE** → **B12** cleanup → **B13** integration/E2E → **B14** docs/rules/agents.

See [REFACTOR_PLAN.md](../refactoring/REFACTOR_PLAN.md) for proposed `floor-plans` / `floor-editor` trees **before** any file moves.

## Testing posture

- Unit: Vitest + jsdom; mock Supabase in feature specs
- E2E: Playwright smoke today; expand in B13 without destructive remote writes
- After every intervention: `npm test` · `npm run lint` · `npm run build`

## Agent context loading

Prefer: this overview → `MODULE_MAP` / `DEPENDENCY_MAP` → **one** `docs/modules/<domain>.md`. Avoid loading all module docs at once (B14 formalizes Cursor rules).

## Branding note

UI / README / `package.json` may still say “Sala Chocolatte” / `discoteca`. Cosmetic debt addressed in **B12**, not as drive-by edits.
