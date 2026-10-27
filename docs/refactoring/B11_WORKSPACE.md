# B11 — Workspace modularization (phase 2)

**Status:** DONE (no visual/functional change; no commit/push)  
**Branch:** `main`

## Diagnosis

`WorkspaceComponent` (~700 LOC) coordinated tabs, plans, catalog, user admin, alerts, Realtime, and PlanEditor. Clear boundary: **user access + create-user** (own form state, only touches `users` + toast). Plan/catalog dialogs stay in shell — they mutate `plans` / `categories` / `products` / `selectedPlan` (single owner).

## Extracted

| Unit | Role | State owner |
|------|------|-------------|
| `WorkspaceUserAdminComponent` | Access password + create-user modals | Child (dialogs/forms); toast → parent |
| `workspace-shell-visibility.util` | ADMIN vs USER tab/control gates | Pure |
| `workspace-transient.util` | Overlay/form reset snapshot + copy name | Pure → applied by shell |
| `workspace-catalog.util` | Safe-delete messages + list apply | Pure → applied by shell |
| `workspace-dialog.styles.scss` | Shared modal CSS (identical rules) | Styles only |

**Not extracted (documented debt):** plan create/copy/rename/delete modals; catalog edit/delete modals; products tab UI — coupled to shell lists/selection; further child would risk style/DOM drift without auth.

## Contracts

- Shell → user-admin: `#userAdmin.openAccess()`, `#userAdmin.reset()`; `(toastMessage)`
- Shell keeps: tabs, plans, catalog, operativa, PlanEditor ViewChild, Realtime
- Roles: `workspaceShellVisibility(isAdmin)` mirrors `@if (isAdmin)` (ADMIN: Planos + Productos + Usuarios)

## Validation

- Automated: `npm test` (138), `lint`, `build` OK
- Manual pending: browser check ADMIN tabs/Usuarios modals look unchanged; USER only Operativa

## Agent (`tableflow-workspace`)

- Coordinate only; domain I/O via feature services
- Do not restyle dialogs; do not invent global state
- Prefer utils for pure logic; child components only with explicit Input/Output/ViewChild API
