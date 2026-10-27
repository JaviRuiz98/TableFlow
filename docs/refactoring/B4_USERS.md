# B4 — Users module

**Date:** 2026-10-27 · **Branch:** `main`

## Changes

- Moved `UserAdminService` → `src/app/features/users/`
- Workspace import updated to `./users`
- Added mocked unit tests (access RPC, create-user invoke, session/authz errors)
- Docs: `docs/modules/users.md`

## Unchanged

- Edge Function source, RLS, AuthService, roles, error humanization paths
