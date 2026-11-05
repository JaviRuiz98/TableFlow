-- =============================================================================
-- 0036_profiles_tenant_rls.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- STATUS: APPLIED MANUALLY on TableFlow (operator confirmed 2026-11-05).
-- Keep this file as the versioned source of truth; do not re-apply blindly.
--
-- Goal: stop cross-tenant SELECT/UPDATE on public.profiles.
--   • Anyone authenticated may read their own row (login / loadProfile).
--   • ADMIN may read/update only profiles of the same company_id.
--   • role / company_id remain locked for JWT clients via protect_profile_privileged_columns.
--   • Edge create-user uses service_role (bypasses RLS) to bind new staff.
-- =============================================================================

drop policy if exists profiles_self_or_admin_select on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;

create policy profiles_self_or_company_admin_select on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or (
    public.is_admin()
    and company_id is not null
    and company_id = public.current_company_id()
  )
);

create policy profiles_company_admin_update on public.profiles
for update
to authenticated
using (
  public.is_admin()
  and company_id is not null
  and company_id = public.current_company_id()
)
with check (
  public.is_admin()
  and company_id is not null
  and company_id = public.current_company_id()
);

comment on policy profiles_self_or_company_admin_select on public.profiles is
  'Self read always; ADMIN read limited to same company_id.';

comment on policy profiles_company_admin_update on public.profiles is
  'ADMIN update limited to same company_id (privileged columns still trigger-locked).';
