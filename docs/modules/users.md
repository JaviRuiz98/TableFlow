# Module: users

**Agent:** `tableflow-users`  
**Path:** `src/app/features/users/`

## Purpose

ADMIN-only **staff** provisioning via Edge Function (JWT + ADMIN + `company_id` match). Distinct from public company signup (`register-company` in auth). No UI management-password gate.

## Responsibilities

- Invoke `create-user` with caller JWT and `company_id` (resolved from ADMIN profile when omitted; Edge rejects mismatch vs token company)
- Optional `verify_app_secret` remains available if a client sends `admin_password`
- Humanize function/RPC errors for UI

**Not in this module:** login/session / `register-company` (`AuthService` in `core/auth`), RLS, Edge Function source deploy.

## Main files

| File | Role |
|------|------|
| `user-admin.service.ts` | Admin operations |
| `index.ts` | Barrel (`UserAdminService`, `CreateUserRequest`) |
| `user-admin.service.spec.ts` | Mocked RPC / functions / session tests |

## Public API

```ts
verifyAccess(password: string): Promise<boolean>
countAdditionalCompanyUsers(params: { companyId: string | null | undefined; currentUserId: string }): Promise<number>
createUser(request: CreateUserRequest): Promise<void>
```

`CreateUserRequest`: `full_name`, `username`, `password`, `role` (`ADMIN`|`USER`|`RECEPTOR`), `company_id` (required by Edge; client fills from session profile), optional `admin_password` (UI no longer sends it; Edge still requires JWT ADMIN).

Only ADMIN may invoke create-user. Edge binds the new profile with service-role `UPDATE` of `company_id` (never from Auth metadata). Role picker exposes the three roles. `countAdditionalCompanyUsers` counts any other company profile.

## Dependencies

- `core/infrastructure` (`SupabaseService`, `ErrorMessageService`) — **public key only**
- `core/models` (`Role`)
- Consumer: `WorkspaceComponent` (ADMIN dialogs)
- Related but separate: `AuthService` (session); server `supabase/functions/create-user`

## Supabase

| Kind | Name |
|------|------|
| RPC | `verify_app_secret` (`user_management`) |
| Edge Function | `create-user` (staff; requires Bearer + ADMIN + matching `company_id`) |
| Edge Function | `register-company` (public company ADMIN signup — owned by auth module) |
| Auth | `getSession()` for Bearer token |

## Security notes for agents

- Never add service_role / `sb_secret_*` to Angular
- Do not weaken ADMIN / `company_id` checks in the Edge Function from the client
- UI still gates ADMIN; server enforces again
- `create-user/config.toml` sets `verify_jwt = false` so browser OPTIONS preflight works; the function still validates JWT + ADMIN role + `company_id ===` token company
- Migration `0035` must be applied before relying on metadata-ignore; redeploy `create-user` after code changes

## Restrictions

- No Edge Function / RLS / schema changes in this module task
- No remote user-creation tests
- Preserve error strings that detect outdated `create-user` deploy
