# Module: workspace (shell)

**Agent (future):** `tableflow-workspace`  
**Path:** `src/app/features/workspace/`

## Purpose

UI shell after login: tabs, plan list, operativa composition, product catalog UI, toasts/alerts. Coordinates feature modules; does **not** own domain persistence.

## Responsibilities

- Compose `PlanEditorComponent` + `TableProductPanelComponent` + `WorkspaceUserAdminComponent`
- Navigate tabs (`planos` / `operativo` / `productos`) by role
- Presentation state (plan/catalog dialogs, toast, editor mode, map visibility)
- Orchestrate → `floor-plans` / `products` / `orders` / `notifications` / `auth`
- User admin dialogs → child `WorkspaceUserAdminComponent` → `users`
- Init + teardown Realtime; reset transient UI on init/logout

## Not this module

- Konva / snapshots → `floor-plans` / `floor-editor`
- Order mutations → `orders`
- Catalog API → `products`
- create-user Edge → `users` (via user-admin child)
- Raw Supabase → `core/infrastructure`

## Main files

| File | Role |
|------|------|
| `workspace.component.*` | Shell coordinator + plan/catalog/operativa UI |
| `workspace-user-admin.component.*` | User access + create-user dialogs (B11) |
| `workspace-dialog.styles.scss` | Shared modal styles |
| `workspace-init.util.ts` | Role-based initial presentation |
| `workspace-shell-visibility.util.ts` | ADMIN/USER control gates |
| `workspace-transient.util.ts` | Overlay reset + copy-plan name |
| `workspace-catalog.util.ts` | Catalog delete apply/messages |
| `workspace-user-form.util.ts` | New-user validation |
| `workspace-alerts.util.ts` | USER alert copy |
| `index.ts` | Exports `WorkspaceComponent` |

## State ownership

| State | Owner |
|-------|--------|
| tabs, plans, selectedPlan, editorMode, showMap | Workspace |
| categories, products, catalog dialogs | Workspace |
| plan create/copy/rename/delete dialogs | Workspace |
| user access + create-user forms/dialogs | `WorkspaceUserAdminComponent` |
| toast | Workspace (receives child toasts) |
| Realtime channels | Workspace |

## Init flow

1. `resetTransientUi()` (+ child `reset()`)
2. Load plans/categories/products
3. `initialWorkspacePresentation(isAdmin, plans)`
4. USER → order/observation alerts; always → orders subscribe
5. Destroy/logout → unsubscribe + reset

## Tests

- `workspace.component.spec.ts` — ADMIN/USER init, visibility, plans, catalog, logout, user-admin delegate
- `workspace-user-admin.component.spec.ts`
- utils: init, visibility, transient, catalog, user-form, alerts

## Restrictions for agents

- No visual/HTML/CSS/navigation changes unless authorized
- No cycles (features must not import workspace)
- No exposing Supabase from shell
- Do not auto-start B12 without authorization
