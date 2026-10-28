# Module: users

**Agent:** `tableflow-users`  
**Path:** `src/app/features/users/`

## Purpose

ADMIN-only user provisioning via Edge Function (JWT + ADMIN). No UI management-password gate.

## Responsibilities

- Invoke `create-user` with caller JWT (optional `verify_app_secret` remains available if a client sends `admin_password`)
- Humanize function/RPC errors for UI

**Not in this module:** login/session (`AuthService` in `core/auth`), RLS, Edge Function source deploy.

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

`CreateUserRequest`: `full_name`, `username`, `password`, `role` (`ADMIN`|`USER`|`RECEPTOR`), optional `admin_password` (UI no longer sends it; Edge still requires JWT ADMIN).

Only ADMIN may invoke create-user. Role picker exposes the three roles. `countAdditionalCompanyUsers` counts any other company profile.

## Dependencies

- `core/infrastructure` (`SupabaseService`, `ErrorMessageService`) — **public key only**
- `core/models` (`Role`)
- Consumer: `WorkspaceComponent` (ADMIN dialogs)
- Related but separate: `AuthService` (session); server `supabase/functions/create-user`

## Supabase

| Kind | Name |
|------|------|
| RPC | `verify_app_secret` (`user_management`) |
| Edge Function | `create-user` |
| Auth | `getSession()` for Bearer token |

## Security notes for agents

- Never add service_role / `sb_secret_*` to Angular
- Do not weaken ADMIN checks in the Edge Function from the client
- UI still gates ADMIN; server enforces again
- `create-user/config.toml` sets `verify_jwt = false` so browser OPTIONS preflight works; the function still validates JWT + ADMIN role

## Restrictions

- No Edge Function / RLS / schema changes in this module task
- No remote user-creation tests
- Preserve error strings that detect outdated `create-user` deploy
