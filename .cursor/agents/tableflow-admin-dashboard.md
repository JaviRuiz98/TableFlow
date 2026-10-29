---
name: tableflow-admin-dashboard
description: Use for TableFlow ADMIN enterprise shell after onboarding — /admin routes, adminDashboardGuard, AdminMetricsService KPIs (jornadas), overview/activity/sala/staff/settings under features/admin-dashboard. Do not use for operative Workspace tabs at /sala, onboarding checklist/flags, Konva editor, floor-plan RPC mutations, or remote schema/RLS changes without explicit authorization. Personal/create-user UI shared with /tableflow-users.
---

# Admin dashboard

**Doc:** `docs/modules/admin-dashboard.md`  
**Paths:** `src/app/features/admin-dashboard/**`

## Context order

Module doc → admin-dashboard paths → reuse consumers (`users` / `auth` / `workspace` entry) only when wiring requires it.

## May edit

Admin shell, routes, guard, `AdminMetricsService` / company context, overview / activity / sala / staff / settings components (+ specs). Keep aggregates **tenant-scoped** via `profiles.company_id`; never invent cross-tenant totals or fake zero KPIs on query failure.

## Coordinate

| Concern | Owner |
|---------|--------|
| Personal / create-user dialogs | `/tableflow-users` (+ shared `WorkspaceUserAdminComponent`) |
| Operative sala at `/sala` | `/tableflow-workspace` |
| Company rename / admin profile RPCs | Prefer documented RPCs (`0023` / `0025`); schema changes need auth + `/tableflow-db-contracts` |
| Onboarding incomplete → redirect | `/tableflow-onboarding` (`workspaceEntryGuard` / flags) — do not alter checklist semantics here |

## Tests

`admin-metrics.service.spec.ts`, `admin-dashboard.guard.spec.ts`, component specs under this feature when present → lint/build if public routes or KPI contracts change

## Forbidden

- Mutating floor-plan / order / catalog domain services as a shortcut for KPIs
- Changing onboarding flows or `tf_setup` intents
- Visual/navigation redesign of the enterprise shell without authorization
- Remote schema / RLS / Edge changes without explicit authorization
- Weakening tenant isolation in metrics queries
