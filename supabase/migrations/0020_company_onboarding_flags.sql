-- =============================================================================
-- 0020_company_onboarding_flags.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- Adds three onboarding completion flags on public.companies (default false).
-- ADMIN may update their own company row (needed for Angular to mark steps).
-- =============================================================================

alter table public.companies
  add column if not exists onboarding_plan_done boolean not null default false;

alter table public.companies
  add column if not exists onboarding_products_done boolean not null default false;

alter table public.companies
  add column if not exists onboarding_users_done boolean not null default false;

comment on column public.companies.onboarding_plan_done is
  'Initial setup: first floor plan completed for this company.';
comment on column public.companies.onboarding_products_done is
  'Initial setup: first product(s) configured for this company.';
comment on column public.companies.onboarding_users_done is
  'Initial setup: first staff RECEPTOR configured for this company.';

-- Allow authenticated UPDATE; RLS still scopes rows to the caller's company.
grant update on table public.companies to authenticated;

drop policy if exists companies_admin_update_onboarding on public.companies;
create policy companies_admin_update_onboarding on public.companies
  for update to authenticated
  using (
    public.is_admin()
    and id = (
      select p.company_id
      from public.profiles p
      where p.id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    and id = (
      select p.company_id
      from public.profiles p
      where p.id = auth.uid()
    )
  );
