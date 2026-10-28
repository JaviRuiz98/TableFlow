-- =============================================================================
-- 0017_company_registration.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- STATUS: READY FOR OPERATOR REVIEW — DO NOT APPLY UNTIL EXPLICITLY AUTHORIZED.
--
-- Goal (simplified):
--   On Auth signUp for public company registration, create companies + ADMIN
--   profile immediately inside handle_new_user() (same transaction as auth.users).
--   Email confirmation remains Supabase Auth + Resend SMTP (login blocked until
--   confirmed). No post-confirm activation RPC.
--
-- Compatible with a remote DB where:
--   • public.companies already exists with trigger trg_companies_updated_at
--   • public.profiles already has phone + company_id (+ username unique index)
--   • profiles RLS is profiles_self_or_admin_select / profiles_admin_update
--   • handle_new_user() exists (today inserts role USER)
--
-- Object inventory
-- ---------------
-- NEW (safe / additive):
--   • policy companies_member_select (recreate)
--   • function public.protect_profile_privileged_columns() + trigger
--   • index profiles_company_id_idx (if missing)
--
-- REPLACE:
--   • function public.handle_new_user()
--     - company signup (metadata.establishment_name present):
--         insert companies + profiles as ADMIN linked to company_id
--     - staff / future USER workers (no establishment_name):
--         insert profiles as USER (username optional); never ADMIN from metadata
--
-- TOUCH BUT DO NOT RECREATE:
--   • public.companies (CREATE IF NOT EXISTS only; keep trg_companies_updated_at)
--   • public.profiles phone / company_id (ADD IF NOT EXISTS only)
--   • username unique index — untouched
--   • table shapes — no ALTER of existing column types/constraints beyond additive FK
--
-- NOT IN THIS MIGRATION (require separate authorization to drop):
--   • DROP of pending_company_registrations / activate_company_for_current_user
--     if an older draft created them — Angular no longer calls them.
--   • Tenant isolation RLS on floor_plans / orders / tables
--   • Public signup enablement (keep DISABLED in production until tenant RLS)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Preflight (run manually before apply)
-- ---------------------------------------------------------------------------
-- select tgname from pg_trigger
--  where tgrelid = 'public.companies'::regclass and not tgisinternal;
-- select column_name, data_type, is_nullable
--  from information_schema.columns
--  where table_schema='public' and table_name='profiles'
--    and column_name in ('username','full_name','role','phone','company_id');
-- select polname, cmd from pg_policies where tablename in ('profiles','companies');
-- select proname from pg_proc where pronamespace = 'public'::regnamespace
--   and proname in ('handle_new_user','activate_company_for_current_user');

-- ---------------------------------------------------------------------------
-- 1) companies — ensure relation; DO NOT touch trg_companies_updated_at
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cleanup only the accidental draft trigger name; keep trg_companies_updated_at.
drop trigger if exists companies_updated on public.companies;

alter table public.companies enable row level security;

drop policy if exists companies_member_select on public.companies;
create policy companies_member_select on public.companies
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles as p
      where p.id = (select auth.uid())
        and p.company_id = companies.id
    )
  );

revoke all on table public.companies from anon;
revoke insert, update, delete on table public.companies from authenticated;
grant select on table public.companies to authenticated;

-- ---------------------------------------------------------------------------
-- 2) profiles — additive columns only (do not change table structure otherwise)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  add column if not exists company_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_company_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_company_id_fkey
      foreign key (company_id) references public.companies (id);
  end if;
exception
  when duplicate_object then
    null;
end
$$;

create index if not exists profiles_company_id_idx
  on public.profiles (company_id);

comment on column public.profiles.company_id is
  'Tenant company. Set only by trusted server logic (handle_new_user / future RPCs).';

comment on column public.profiles.phone is
  'Contact phone (company registration or staff).';

revoke insert, delete on table public.profiles from authenticated;
revoke all on table public.profiles from anon;

-- Existing policies profiles_self_or_admin_select / profiles_admin_update stay.

-- ---------------------------------------------------------------------------
-- 3) Lock role + company_id against PostgREST privilege escalation
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.role is not distinct from old.role
     and new.company_id is not distinct from old.company_id then
    return new;
  end if;

  if lower(coalesce(current_setting('tableflow.allow_privileged_profile_update', true), '')) = 'on' then
    return new;
  end if;

  -- service_role / SQL console / create-user Edge (no JWT)
  if (select auth.uid()) is null then
    return new;
  end if;

  raise exception 'PRIVILEGED_PROFILE_FIELDS_LOCKED'
    using hint = 'role and company_id can only change via trusted server paths';
end;
$$;

drop trigger if exists trg_profiles_protect_privileged_columns on public.profiles;
create trigger trg_profiles_protect_privileged_columns
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileged_columns();

revoke all on function public.protect_profile_privileged_columns() from public;

-- ---------------------------------------------------------------------------
-- 4) REPLACE handle_new_user — transactional company + ADMIN on public signup
-- ---------------------------------------------------------------------------
-- Distinguishes:
--   A) Public company registration: raw_user_meta_data.establishment_name set
--      → companies row + profiles ADMIN + company_id (never reads metadata.role)
--   B) Staff / future USER workers (create-user): no establishment_name
--      → profiles USER (+ optional username); Edge may adjust role via service_role
--
-- Security:
--   • metadata.role is NEVER trusted
--   • existing profile → no-op (no privilege escalation on retries / metadata tricks)
--   • trigger runs only ON INSERT of auth.users (updating metadata later does nothing)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_full_name text := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
  v_username text := nullif(lower(trim(coalesce(new.raw_user_meta_data->>'username', ''))), '');
  v_establishment text := nullif(trim(coalesce(new.raw_user_meta_data->>'establishment_name', '')), '');
  v_phone text := nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), '');
  v_company_id uuid;
begin
  -- Idempotent / anti-escalation: never recreate or promote an existing profile.
  if exists (select 1 from public.profiles as p where p.id = new.id) then
    return new;
  end if;

  if v_establishment is not null then
    -- Public company registration (Angular signUpCompany metadata).
    insert into public.companies (name)
    values (v_establishment)
    returning id into v_company_id;

    insert into public.profiles (id, full_name, phone, role, company_id)
    values (
      new.id,
      v_full_name,
      v_phone,
      'ADMIN'::public.app_role,
      v_company_id
    );
  else
    -- Workers / admin.createUser path — always USER here; never ADMIN from metadata.
    insert into public.profiles (id, full_name, username, phone, role)
    values (
      new.id,
      v_full_name,
      v_username,
      v_phone,
      'USER'::public.app_role
    );
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
      and not tgisinternal
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row
      execute function public.handle_new_user();
  end if;
end
$$;

comment on function public.handle_new_user() is
  'On auth.users insert: company signup creates companies+ADMIN profile; otherwise USER profile. Never trusts metadata.role.';

-- ---------------------------------------------------------------------------
-- 5) Optional note — legacy draft objects (DO NOT DROP without authorization)
-- ---------------------------------------------------------------------------
-- If an earlier 0017 draft created these, leave them until explicitly approved:
--   • public.pending_company_registrations
--   • public.activate_company_for_current_user()
-- The app no longer references them. Example drop (NOT executed here):
--   -- revoke all on function public.activate_company_for_current_user() from public;
--   -- drop function if exists public.activate_company_for_current_user();
--   -- drop table if exists public.pending_company_registrations;

-- notify pgrst, 'reload schema';
