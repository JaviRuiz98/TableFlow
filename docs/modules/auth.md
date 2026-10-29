# Module: auth

**Agent:** `tableflow-auth`  
**Paths:** `src/app/core/auth/`, `src/app/core/guards/`, `src/app/features/auth/` (login + `registro-empresa/`)

## Purpose

Session, profile/role loading, login UI, route guard, username↔internal email helpers.

## Public surface

- `AuthService`: `signIn`, `signUpCompany`, `resendCompanySignupEmail`, `refreshProfile`, `signOut`, `session`/`profile`/`ready` signals, `hasRole`, `whenReady`
- Email confirm redirect: `buildEmailConfirmRedirectUrl` → `/?tf_activate=1#/registro-empresa/activar` (PKCE-safe with hash router)
- `authGuard` → `/login` when no session
- Identity: `normalizeUsername`, `usernameToInternalEmail`, `isValidUsername`
- Company registration UI: `/registro-empresa`, `/registro-empresa/pendiente`, `/registro-empresa/activar` (confirm landing only)

## Company registration flow

1. Angular `signUpCompany` checks `is_company_name_available` then Auth `signUp` with metadata `full_name`, `establishment_name`, `phone` (never `role` / `company_id` / `username`). Duplicate emails: Auth may return a fake user with empty `identities` — the client treats that as «correo ya registrado».
2. Trigger `handle_new_user` creates `companies` + `profiles` as `ADMIN` with fixed `username = Administrador` (migration `0024`; unique commercial name in `0026`). Login remains the real email.
3. Resend SMTP sends confirm email; login blocked until confirmed.
4. `/registro-empresa/activar` only reports confirmation success — no second activation RPC.
5. Staff create-user must not use reserved username `administrador` (Angular + Edge).

**TEMP:** `TEMP_SKIP_EMAIL_VERIFICATION` in `core/auth/auth-temp-flags.ts` skips `emailRedirectTo` / pending-email UI and opens `/activar` after signup. Requires Auth **Confirm email** OFF in the Supabase dashboard (otherwise SMTP still 500s). Re-enable flag + Confirm email before production mail.

Staff / RECEPTOR workers: Auth metadata without `establishment_name` → profile `RECEPTOR` (create-user Edge; migration `0022`). Enum also keeps reserved `USER` for a future operational view.

## Dependencies

`core/infrastructure` (Supabase + errors). Consumed by workspace, editor, users flows.

## Tests

`auth.service.spec.ts`, `auth.guard.spec.ts`, `auth-redirect.spec.ts`

## Restrictions

Do not change 12h absolute session policy or Auth provider setup without authorization. UI brand strings on login are visual — leave unless authorized.

Session policy note: [SESSION_12H.md](../product/SESSION_12H.md).
