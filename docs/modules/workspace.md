# Module: workspace (shell)

**Agent (future):** `tableflow-workspace`  
**Path:** `src/app/features/workspace/`

## Purpose

UI shell after login: tabs, plan list, operativa composition, product catalog UI, toasts/alerts. Coordinates feature modules; does **not** own domain persistence.

## Responsibilities

- Compose `PlanEditorComponent` + `TableProductPanelComponent` + workspace child panels
- Navigate tabs (`planos` / `operativo` / `productos`) by role
- Presentation state (toast, editor mode, map visibility, USER alert copy)
- Orchestrate → `floor-plans` / `products` / `orders` / `notifications` / `auth`
- User admin dialogs → child `WorkspaceUserAdminComponent` → `users`
- Plan create/copy/rename/delete → `WorkspacePlanAdminDialogsComponent`
- Catalog list + dialogs → `WorkspaceCatalogPanelComponent` → `ProductService`
- USER alert modal → `WorkspaceUserAlertModalComponent` (presentation)
- Init + teardown Realtime; reset transient UI on init/logout (delegates child `reset()`)

## Not this module

- Konva / snapshots → `floor-plans` / `floor-editor`
- Order mutations → `orders`
- Catalog API → `products`
- create-user Edge → `users` (via user-admin child)
- Raw Supabase → `core/infrastructure`

## Main files

| File | Role |
|------|------|
| `workspace.component.*` | Shell coordinator (tabs, operativa, Realtime, toast) |
| `workspace-user-admin.component.*` | User access + create-user dialogs (B11) |
| `components/workspace-plan-admin-dialogs/` | Create/copy/rename/delete plan dialogs (C2) |
| `components/workspace-catalog-panel/` | Productos tab + catalog dialogs (C2) |
| `components/workspace-user-alert-modal/` | USER order/observation alert modal (C2) |
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
| plan create/copy/rename/delete dialogs | `WorkspacePlanAdminDialogsComponent` |
| categories, products, catalog dialogs | `WorkspaceCatalogPanelComponent` |
| user access + create-user forms/dialogs | `WorkspaceUserAdminComponent` |
| USER alert open + copy | Workspace (modal child is presentation) |
| toast | Workspace (receives child toasts) |
| Realtime channels | Workspace |

## Init flow

1. `resetTransientUi()` (+ children `reset()`)
2. Load plans
3. `initialWorkspacePresentation(isAdmin, plans)`
4. USER → order/observation alerts; always → orders subscribe
5. Catalog child loads categories/products on its own init
6. Destroy/logout → unsubscribe + reset

## Tests

- `workspace.component.spec.ts` — ADMIN/USER init, visibility, plans navigation, logout, child delegates
- `workspace-user-admin.component.spec.ts`
- `components/workspace-plan-admin-dialogs/*.spec.ts`
- `components/workspace-catalog-panel/*.spec.ts`
- `components/workspace-user-alert-modal/*.spec.ts`
- utils: init, visibility, transient, catalog, user-form, alerts

## Restrictions for agents

- No visual/HTML/CSS/navigation changes unless authorized
- No cycles (features must not import workspace)
- No exposing Supabase from shell
- Do not auto-start further extractions without authorization
