---
name: tableflow-auth
description: Use for TableFlow login, sessions, roles (ADMIN/USER/RECEPTOR), AuthService, authGuard, and identity helpers under core/auth, core/guards, features/auth. Do not use for workspace shell tabs, user-admin Edge create-user, or remote Auth provider/policy changes without explicit authorization.
---

# Auth

**Doc:** `docs/modules/auth.md`  
**Paths:** `src/app/core/auth/**`, `src/app/core/guards/**`, `src/app/features/auth/**`

## Context order

Module doc → paths above → cross-deps only if required.

## May edit

Those paths. Coordinate with `/tableflow-workspace` before changing logout UX in the shell.

## Tests

`auth.service.spec.ts`, `auth.guard.spec.ts` → then lint/build if public behaviour changes

## Forbidden

Altering 12h session policy, Auth providers, or ADMIN/USER/RECEPTOR semantics without authorization
