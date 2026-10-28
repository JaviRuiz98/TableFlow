# Module: auth

**Agent:** `tableflow-auth`  
**Paths:** `src/app/core/auth/`, `src/app/core/guards/`, `src/app/features/auth/login/`

## Purpose

Session, profile/role loading, login UI, route guard, username↔internal email helpers.

## Public surface

- `AuthService`: `signIn`, `signUpCompany`, `resendCompanySignupEmail`, `refreshProfile`, `signOut`, `session`/`profile`/`ready` signals, `hasRole`, `whenReady`
- Email confirm redirect: `buildEmailConfirmRedirectUrl` → `/?tf_activate=1#/registro-empresa/activar` (PKCE-safe with hash router)
- `authGuard` → `/login` when no session
- Identity: `normalizeUsername`, `usernameToInternalEmail`, `isValidUsername`
- Company registration UI: `/registro-empresa`, `/registro-empresa/pendiente`, `/registro-empresa/activar` (confirm landing only)

## Company registration flow

1. Angular `signUpCompany` → Auth `signUp` with metadata `full_name`, `establishment_name`, `phone` (never `role` / `company_id`).
2. Trigger `handle_new_user` (migration `0017`, pending apply) creates `companies` + `profiles` as `ADMIN` in the same Auth insert transaction.
3. Resend SMTP sends confirm email; login blocked until confirmed.
4. `/registro-empresa/activar` only reports confirmation success — no second activation RPC.

Staff / future USER workers: Auth metadata without `establishment_name` → profile `USER` (create-user Edge).

## Dependencies

`core/infrastructure` (Supabase + errors). Consumed by workspace, editor, users flows.

## Tests

`auth.service.spec.ts`, `auth.guard.spec.ts`, `auth-redirect.spec.ts`

## Restrictions

Do not change 12h absolute session policy or Auth provider setup without authorization. UI brand strings on login are visual — leave unless authorized.

Session policy note: [SESSION_12H.md](../product/SESSION_12H.md).
