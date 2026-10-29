---
name: tableflow-auth
description: Use for TableFlow login, sessions, roles (ADMIN/USER/RECEPTOR), AuthService, authGuard, identity helpers, and company registration UI (registro-empresa / pendiente / activar) under core/auth, core/guards, features/auth. Do not use for workspace shell tabs, onboarding checklist flags, admin-dashboard KPIs, user-admin Edge create-user, or remote Auth provider/policy changes without explicit authorization.
---

# Auth

**Doc:** `docs/modules/auth.md`  
**Paths:** `src/app/core/auth/**`, `src/app/core/guards/**`, `src/app/features/auth/**`

## Context order

Module doc → paths above → cross-deps only if required.

## May edit

Those paths, including `features/auth/registro-empresa/**` (signup / pendiente / activar). Coordinate with `/tableflow-workspace` before changing logout UX in the shell. Post-signup ADMIN checklist → `/tableflow-onboarding`.

## Tests

`auth.service.spec.ts`, `auth.guard.spec.ts`, `auth-redirect.spec.ts`, registro-empresa related specs/e2e when touching that flow → then lint/build if public behaviour changes

## Forbidden

Altering 12h session policy, Auth providers, or ADMIN/USER/RECEPTOR semantics without authorization; onboarding company flags / guided shell → `/tableflow-onboarding` (+ workspace)
