# TableFlow — System Overview

**Audience:** humans and AI agents needing global context before touching a single domain.  
**Related:** [MODULE_MAP.md](./MODULE_MAP.md) · [DEPENDENCY_MAP.md](./DEPENDENCY_MAP.md) · [DATA_FLOW.md](./DATA_FLOW.md) · [SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md)

## What it is

TableFlow is a PWA / Capacitor app (Angular 20 + Ionic 8) for nightclub floor operations: floor plans, tables/reserved spots, product catalog, orders, attended state, observations, and realtime staff alerts. Backend is **Supabase (Postgres + Auth + Realtime + Edge Function `create-user`)**.

## Hard boundaries

- Use **TableFlow** Supabase project only (`SUPABASE_URL` / publishable key from `.env`).
- **Never** write to Sala Chocolatte / CreadorSala databases.
- Do not change RLS, RPC contracts, or UX/styles unless explicitly authorized.
- No `service_role` / `sb_secret_*` in the Angular bundle.

## Runtime entrypoints

| Entry | Role |
|-------|------|
| `src/main.ts` | Bootstrap Ionic + hash router + optional SW |
| `src/app/app.routes.ts` | `/login`, `/` (authGuard → Workspace) |
| `scripts/generate-env.mjs` | Writes `src/environments/*` from `.env` on `prestart`/`prebuild` |

## Roles

- `ADMIN` — plans, catalog, assign products, observations, user creation, deletions.
- `USER` — operational view; mark attended via RPC; read observations; receive realtime alerts.

## Where logic lives today

- Shell: `features/workspace/` (`WorkspaceComponent` + small utils)
- Domain I/O: `features/{orders,products,users,notifications,floor-plans}` + remaining `core/services` (geometry, table-validation/deletion)
- Cross-cutting: `core/infrastructure` (`SupabaseService`, `ErrorMessageService`)
- Large remaining UI: `plan-editor.component` (next: floor-editor / B8)

## Testing posture

- Unit: Vitest via Angular builder + jsdom; feature modules use mocked Supabase
- E2E: Playwright smoke on login title only
- Never point destructive tests at production / remote TableFlow

## Branding note

UI/package still carry legacy “Sala Chocolatte” / `discoteca` names in places. Treat as cosmetic debt unless a branding pass is authorized separately from modular refactor.
