# Module: onboarding

**Paths:** `src/app/features/onboarding/` (+ guided shell hooks in `features/workspace`)

## Purpose

First-run checklist for new company **ADMIN** tenants: create a plan, configure products, add staff. Premium TableFlow-branded screen before the operational workspace.

During **initial setup** (any company onboarding flag still `false`) or an active setup intent (`tf_setup` / session), Workspace renders a **guided shell**: logo + step label + «Volver a la configuración» + logout. Tabs Planos/Operativa/Productos and admin chrome are hidden. Domain modules are reused, not duplicated.

## Progress model

Progress is persisted on `public.companies` (migration `0020_company_onboarding_flags.sql`):

| Column | Meaning | Default |
|--------|---------|---------|
| `onboarding_plan_done` | First floor plan created/saved | `false` |
| `onboarding_products_done` | Products configured | `false` |
| `onboarding_users_done` | Staff users configured | `false` |

**Initial setup** = any of the three flags is `false`. When all three are `true`, ADMIN may use the normal workspace (Planos / Operativa / Productos).

`OnboardingService.refresh()` reads the flags; `markStepDone(step)` sets the matching column to `true` (ADMIN RLS update on own company). Survives logout.

## Guided step behaviour

| Intent | Workspace shows | Completes when |
|--------|-----------------|----------------|
| `plan` | Create-plan dialog → Konva editor + «Guardar y continuar» | Snapshot saved + `onboarding_plan_done = true` |
| `products` | Catalog panel only + «Finalizar productos» | Explicit finish CTA (≥1 product) → `onboarding_products_done = true` |
| `users` | Create-user dialog (role locked to RECEPTOR; **no** management-password gate) | `onboarding_users_done = true` (staff needs `0019`/`0022` + redeployed `create-user`) |

«Volver a la configuración» warns if the plan editor has undoable edits (`historyIndex > 0`).

## Routing

| Path | Guards | Notes |
|------|--------|--------|
| `/onboarding` | `authGuard` + `onboardingAdminGuard` | ADMIN only |
| `/` | `authGuard` + `workspaceEntryGuard` | Incomplete ADMIN (`isInitialSetup`) → `/onboarding` unless setup intent |
| `/onboarding-preview` | `onboardingPreviewGuard` | Localhost visual QA |

## Multitenant blockers

- **Plans / orders / tables:** still largely “any authenticated” RLS — plan step cannot verify company ownership yet.
- **Staff create:** Edge `create-user` must pass `company_id` in Auth metadata; `handle_new_user` must copy it on INSERT → migration **`0019_staff_profile_company_id.sql`** (pending apply) + function redeploy.
- **Categories:** `product_categories` remain global.
- **Flags:** migration **`0020_company_onboarding_flags.sql`** must be applied before Angular can read/update the booleans (not applied without authorization).

## Tests

`onboarding.progress.spec.ts`, `onboarding.service.spec.ts`, `workspace-entry.guard.spec.ts` + workspace characterization with onboarding hooks.
