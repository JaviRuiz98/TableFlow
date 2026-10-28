# Company registration — deploy checklist (TableFlow)

**Do not apply to Sala Chocolatte.** Do not commit secrets. Do not enable public signup in production until tenant RLS exists.

## What the app expects

1. Auth `signUp` with metadata: `full_name`, `establishment_name`, `phone` (never `role` / `company_id`).
2. Trigger `handle_new_user` creates `companies` + `profiles` as `ADMIN` with `company_id` **immediately** (same transaction as `auth.users` insert).
3. User confirms email (Resend SMTP via Supabase Auth — no Resend API in Angular). Login is blocked until confirmed.
4. `/#/registro-empresa/activar` only shows “correo confirmado” + link to login. **No** post-confirm company insert.
5. Staff path (create-user): metadata without `establishment_name` → profile `RECEPTOR` (after `0022`).

## Auth callback / PKCE note

TableFlow uses **hash routing** + Supabase Auth **PKCE** (`flowType: 'pkce'`).

- `emailRedirectTo`: `?tf_activate=1#/registro-empresa/activar` so GoTrue can append `?code=` on search.
- Opening the link in another browser may not recover a session; email is still confirmed — user signs in normally.

## Pending migration (NOT applied — awaiting authorization)

File: `supabase/migrations/0017_company_registration.sql`

**Assumes remote already has** `companies` + `trg_companies_updated_at`, and `profiles.phone` / `profiles.company_id`. Does **not** create a second companies `updated_at` trigger. Does **not** drop legacy draft objects (`pending_company_registrations`, `activate_company_for_current_user`) without separate approval.

Before applying:

1. Inventory remote triggers/columns/policies (`companies`, `profiles`, `handle_new_user`).
2. Confirm Resend SMTP + Auth **Confirm email** enabled.
3. Redirect allowlist:
   - `https://<prod-host>/?tf_activate=1`
   - `https://<prod-host>/?tf_activate=1#/registro-empresa/activar`
   - legacy: `https://<prod-host>/#/registro-empresa/activar`
4. Keep **public signup disabled** in production until tenant RLS exists.
5. Apply `0017` only after explicit authorization (TableFlow project only).
6. Smoke-test on a non-production project first.

## Known gap (blocker for production multi-tenant)

Existing RLS on floor plans / tables / orders is still largely “any authenticated”.  
`company_id` on profiles alone does **not** isolate those domains.

**Products:** migration `0018_products_company_id.sql` adds `products.company_id`, company-scoped RLS, and the Angular catalog inserts/lists by company. Still pending: `product_categories` tenancy and full operational RLS.

**Staff users:** migrations `0019_staff_profile_company_id.sql` + `0021`/`0022` (RECEPTOR) + redeploy Edge `create-user` so new RECEPTOR profiles inherit the ADMIN `company_id` from trusted metadata on INSERT.

## App routes

| Route | Purpose |
|-------|---------|
| `/#/registro-empresa` | Signup form |
| `/#/registro-empresa/pendiente` | “Check your email” |
| `/#/registro-empresa/activar` | Post-confirm info only |
| `/#/login` | Unchanged login |
