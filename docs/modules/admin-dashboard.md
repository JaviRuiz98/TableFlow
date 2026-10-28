# Module: admin-dashboard

**Path:** `src/app/features/admin-dashboard/`

## Purpose

Enterprise shell for role `ADMIN` after onboarding: top navigation (no permanent sidebar), Resumen KPIs, Actividad (structure), Gestión de sala (links to `/sala`), Personal, Configuración.

## Routing

| Path | Who |
|------|-----|
| `/admin/*` | ADMIN onboarded (`adminDashboardGuard`) |
| `/sala` | Operative workspace (ADMIN/USER/RECEPTOR; ADMIN entry from dashboard) |
| `/` | USER/RECEPTOR home; onboarded ADMIN redirected to `/admin` |

Onboarding and `tf_setup` intents are unchanged.

## Metrics (real vs unavailable)

| KPI | Source | Status |
|-----|--------|--------|
| Nombre empresa | `companies` by `profiles.company_id` | Real + editable (RPC `0023` or RLS `0020`) |
| Productos activos | `ProductService.products()` + `company_id` | Real (needs `0018` applied) |
| Trabajadores | `profiles` count/list by `company_id` | Real |
| Mesas/reservados | UI placeholder (0) | Enable after `0027`–`0029` (`floor_plans.company_id` + RLS/RPC) |
| Pedidos pendientes / actividad | UI placeholder / “no disponible” | Same — join via `tables → floor_plans.company_id` |
| Facturación | — | Not in schema (future) |

Never runs global cross-tenant aggregates. Schema/RLS reasons stay in docs, not in ADMIN UI copy.

## Company rename

- Preferred: `update_own_company_name(p_name)` — migration `0023` (ADMIN-only, uses `profiles.company_id`).
- Fallback: `companies` UPDATE via existing RLS policy from `0020` (scoped to caller company).

## Admin profile edit (Configuración)

- Preferred: `update_own_admin_profile(p_full_name, p_phone)` — migration `0025` (ADMIN-only, `auth.uid()`).
- Fallback: `profiles` UPDATE of own row (`full_name`, `phone`) via existing RLS.
- Email: `AuthService.updateAccountEmail` → Supabase Auth `updateUser` (may require email confirmation).

## Reuse

- Personal → `WorkspaceUserAdminComponent` + Edge `create-user`
- Gestión de sala → existing `WorkspaceComponent` at `/sala`

## Restrictions

- No schema/RLS apply without authorization
- No commit/push unless requested
- Do not alter onboarding flows
