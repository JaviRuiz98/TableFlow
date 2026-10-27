# Module: auth

**Agent:** `tableflow-auth`  
**Paths:** `src/app/core/auth/`, `src/app/core/guards/`, `src/app/features/auth/login/`

## Purpose

Session, profile/role loading, login UI, route guard, username↔internal email helpers.

## Public surface

- `AuthService`: `signIn`, `signOut`, `session`/`profile`/`ready` signals, `hasRole`, `whenReady`
- `authGuard` → `/login` when no session
- Identity: `normalizeUsername`, `usernameToInternalEmail`, `isValidUsername`

## Dependencies

`core/infrastructure` (Supabase + errors). Consumed by workspace, editor, users flows.

## Tests

`auth.service.spec.ts`, `auth.guard.spec.ts`

## Restrictions

Do not change 12h absolute session policy or Auth provider setup without authorization. UI brand strings on login are visual — leave unless authorized.

Session policy note: [SESSION_12H.md](../product/SESSION_12H.md).
