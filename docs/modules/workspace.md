# Module: workspace (shell)

**Agent:** `tableflow-workspace` (`/tableflow-workspace`)  
**Path:** `src/app/features/workspace/`

## Purpose

UI shell after login: tabs, plan list, operativa composition, product catalog UI, toasts/alerts. Coordinates feature modules; does **not** own domain persistence.

## Responsibilities

- Compose `PlanEditorComponent` + `TableProductPanelComponent` + workspace child panels
- Navigate tabs by role: USER → Planos/Operativa/Productos; RECEPTOR → Operativa; ADMIN → placeholder + Usuarios
- Presentation state (toast, editor mode, map visibility, RECEPTOR alert copy)
- Orchestrate → `floor-plans` / `products` / `orders` / `notifications` / `auth`
- User admin dialogs → child `WorkspaceUserAdminComponent` → `users`
- Plan create/copy/rename/delete/edit-schedule → `WorkspacePlanAdminDialogsComponent`
- Catalog list + dialogs → `WorkspaceCatalogPanelComponent` → `ProductService`
- RECEPTOR alert modal → `WorkspaceUserAlertModalComponent` (presentation)
- Init + teardown Realtime; reset transient UI on init/logout (delegates child `reset()`)

## Not this module

- Konva / snapshots → `floor-plans` / `floor-editor`
- Order mutations → `orders`
- Catalog API → `products`
- create-user Edge → `users` (via user-admin child)
- Raw Supabase → `core/infrastructure`

## Layout (folder-per-unit)

```text
workspace/
  index.ts
  styles/workspace-dialog.styles.scss
  workspace/                         # shell + shell utils/specs
  workspace-user-admin/              # component + user-form util
  workspace-plan-admin-dialogs/
  workspace-catalog-panel/           # component + catalog util
  workspace-user-alert-modal/        # component + alerts util
```

## Main folders

| Folder | Role |
|--------|------|
| `workspace/` | Shell coordinator (tabs, operativa, Realtime, toast) + init/visibility/transient utils |
| `workspace-user-admin/` | User access + create-user dialogs + form util (B11) |
| `workspace-plan-admin-dialogs/` | Create/copy/rename/delete/edit-schedule plan dialogs (C2) |
| `workspace-catalog-panel/` | Productos tab + catalog dialogs + catalog util (C2) |
| `workspace-user-alert-modal/` | RECEPTOR alert modal + alert copy util (C2) |
| `styles/` | Shared modal SCSS |
| `index.ts` | Exports `WorkspaceComponent` |

## State ownership

| State | Owner |
|-------|--------|
| tabs, plans, selectedPlan, editorMode, showMap | Workspace |
| plan create/copy/rename/delete/edit-schedule dialogs | `WorkspacePlanAdminDialogsComponent` |
| categories, products, catalog dialogs | `WorkspaceCatalogPanelComponent` |
| user access + create-user forms/dialogs | `WorkspaceUserAdminComponent` |
| RECEPTOR alert open + copy | Workspace (modal child is presentation) |
| toast | Workspace (receives child toasts) |
| Realtime channels | Workspace |

## Init flow

1. `resetTransientUi()` (+ children `reset()`)
2. Resolve optional onboarding setup intent (`tf_setup` / session)
3. Load plans
4. `initialWorkspacePresentation(isAdmin, plans)`
5. RECEPTOR → order/observation alerts; always → orders subscribe
6. Apply setup intent (plan dialog / productos / users) + onboarding return banner when relevant
7. Catalog child loads categories/products on its own init
8. Destroy/logout → unsubscribe + reset

Incomplete ADMIN tenants are redirected to `/onboarding` by `workspaceEntryGuard` unless a setup intent is active. See [onboarding.md](./onboarding.md).

## Tests

- `workspace.component.spec.ts` — ADMIN/RECEPTOR init, visibility, plans navigation, logout, child delegates
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
