# Module: admin-dashboard

**Agent:** `tableflow-admin-dashboard` (`/tableflow-admin-dashboard`)  
**Path:** `src/app/features/admin-dashboard/`

## Purpose

Enterprise shell for role `ADMIN` after onboarding: top navigation (no permanent sidebar), Resumen KPIs around **jornadas** (floor plans as opening sessions), Actividad (structure), Gestión de sala (links to `/sala`), Personal, Configuración.

## Routing

| Path | Who |
|------|-----|
| `/admin/*` | ADMIN onboarded (`adminDashboardGuard`) |
| `/sala` | Operative workspace (ADMIN/USER/RECEPTOR; ADMIN entry from dashboard) |
| `/` | USER/RECEPTOR home; onboarded ADMIN redirected to `/admin` |

Onboarding and `tf_setup` intents are unchanged.

## Metrics (jornadas)

`AdminMetricsService.loadOverview(scope)` is tenant-scoped via `profiles.company_id`. Scope kinds: single **jornada** | last 7 days | last 30 days | custom date range (`opening_date`).

**Auto-select (jornada):** open → next scheduled → last closed → empty CTA (“Crear jornada de apertura” → `/sala?tab=planos`).

| Mode | KPI | Source |
|------|-----|--------|
| Jornada | Reservas | `tables.reserved` / total mesas+reservados |
| Jornada | Mesas atendidas | `tables.attended` / total (verde / botella puesta) |
| Jornada | Pedidos pendientes | mesas/reservados con ítems `PENDING` y `attended=false` (rojo) |
| Jornada | Libres | sin `reserved` ni `attended` / total |
| Jornada | Facturación + balance | `order_items` × `products.price` (excl. CANCELLED) on OPEN/CLOSED orders; table by product |
| Periodo | Aperturas | count jornadas by `status` with `opening_date` in range |
| Periodo | Reservas | reserved/total only on **open/closed** jornadas in range (not future scheduled as historical) |
| Periodo | Pedidos recibidos / atendidos | OPEN+CLOSED / CLOSED on those historical plans |
| Periodo | Facturación + gráfica diaria | same sales sum, grouped by `floor_plans.opening_date` (dense series with zeros) |
| Both | Próximas aperturas | `scheduled` with `opening_date >= today` |
| Both | Actividad reciente | latest OPEN/CLOSED orders; badge = `attended`/CLOSED→Atendido (verde), OPEN sin atender→Pendiente (rojo), reserved sin atender→Reservada (dorado) |

Also loads company name, active products, workers/staff for Personal/Configuración. Never runs global cross-tenant aggregates. Query failures → `error` / `unavailable` (never fake zeros). Schema/RLS reasons stay in docs, not in ADMIN UI copy.

## Company rename

- Preferred: `update_own_company_name(p_name)` — migration `0023` (ADMIN-only, uses `profiles.company_id`).
- Fallback: `companies` UPDATE via existing RLS policy from `0020` (scoped to caller company).

## Admin profile edit (Configuración)

- Preferred: `update_own_admin_profile(p_full_name, p_phone)` — migration `0025` (ADMIN-only, `auth.uid()`).
- Fallback: `profiles` UPDATE of own row (`full_name`, `phone`) via existing RLS.
- Email: `AuthService.updateAccountEmail` → Supabase Auth `updateUser` (may require email confirmation).

## Reuse

- Personal → `WorkspaceUserAdminComponent` + Edge `create-user`
- Gestión de sala → existing `WorkspaceComponent` at `/sala` (CTA crear jornada → planos)

## Restrictions

- No schema/RLS apply without authorization
- No commit/push unless requested
- Do not alter onboarding flows
