# Module: onboarding

**Paths:** `src/app/features/onboarding/`

## Purpose

First-run checklist for new company **ADMIN** tenants: create a plan, configure products, add staff. Premium TableFlow-branded screen before the operational workspace.

## Progress model

Progress is **derived from real data** (not a fragile UI flag):

| Step | Complete when |
|------|----------------|
| Plan | ≥ 1 `floor_plans` row |
| Products | ≥ 1 active `products` row for the signed-in `company_id` (`ProductService.products()` / migration `0018`) |
| Users | ≥ 1 other `profiles` row in the same `company_id` (excludes the signing-in admin) |

Survives logout because it re-queries Supabase. Product tenancy requires `0018_products_company_id.sql` applied on TableFlow.

## Routing

| Path | Guards | Notes |
|------|--------|--------|
| `/onboarding` | `authGuard` + `onboardingAdminGuard` | ADMIN only |
| `/` | `authGuard` + `workspaceEntryGuard` | Incomplete ADMIN → `/onboarding` unless `tf_setup` / session intent |
| `/onboarding-preview` | `onboardingPreviewGuard` | Localhost visual QA (`?preview=initial\|plan-done\|products-done\|complete`) |

## Public surface

- `OnboardingService.refresh()` / `progress` signal
- `computeOnboardingProgress(facts)`
- `beginSetupIntent` / `clearSetupIntent` / `TF_SETUP_QUERY`
- Guards: `onboardingAdminGuard`, `workspaceEntryGuard`

## Workspace integration

CTA → `/?tf_setup=plan|products|users` + sessionStorage intent. Workspace opens create-plan dialog / productos tab / users dialog and shows “Volver a la configuración”. After first plan create while in setup, returns to `/onboarding`.

## Permissions

- **ADMIN:** full checklist + CTAs
- **USER:** never redirected to onboarding; operational workspace only

## Tests

`onboarding.progress.spec.ts`, `onboarding.service.spec.ts`, `workspace-entry.guard.spec.ts`
