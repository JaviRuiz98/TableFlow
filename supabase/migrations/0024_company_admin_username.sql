-- =============================================================================
-- 0024_company_admin_username.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- STATUS: READY FOR OPERATOR REVIEW — DO NOT APPLY UNTIL EXPLICITLY AUTHORIZED.
-- Prefer applying after 0022 (handle_new_user RECEPTOR path).
--
-- Goal: company registration ADMIN always gets profiles.username = 'Administrador'.
-- Login for that account remains the real email from Auth (not username login).
-- 'administrador' is excluded from the global username unique index so each
-- tenant can have its registration ADMIN labeled Administrador.
-- =============================================================================

-- Allow the reserved company-admin label on every tenant.
drop index if exists public.profiles_username_unique;

create unique index profiles_username_unique
  on public.profiles (lower(username))
  where username is not null
    and lower(username) <> 'administrador';

comment on index public.profiles_username_unique is
  'Unique staff usernames (login). Reserved label Administrador is shared by company-registration ADMINs.';

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
  v_meta_company text := nullif(trim(coalesce(new.raw_user_meta_data->>'company_id', '')), '');
  v_company_id uuid;
begin
  if exists (select 1 from public.profiles as p where p.id = new.id) then
    return new;
  end if;

  if v_establishment is not null then
    insert into public.companies (name)
    values (v_establishment)
    returning id into v_company_id;

    -- Company owner: fixed username label. Never take username from client metadata.
    insert into public.profiles (id, full_name, username, phone, role, company_id)
    values (
      new.id,
      v_full_name,
      'Administrador',
      v_phone,
      'ADMIN'::public.app_role,
      v_company_id
    );
  else
    -- Staff path (create-user): optional company_id from trusted Edge metadata only.
    if v_meta_company is not null and v_meta_company ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_company_id := v_meta_company::uuid;
      if not exists (select 1 from public.companies c where c.id = v_company_id) then
        v_company_id := null;
      end if;
    end if;

    insert into public.profiles (id, full_name, username, phone, role, company_id)
    values (
      new.id,
      v_full_name,
      v_username,
      v_phone,
      'RECEPTOR'::public.app_role,
      v_company_id
    );
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'On auth.users insert: company signup → companies+ADMIN (username Administrador); staff → RECEPTOR with optional metadata.company_id. Never trusts metadata.role.';

-- Existing company ADMINs created before this migration.
update public.profiles
   set username = 'Administrador'
 where role = 'ADMIN'::public.app_role
   and company_id is not null
   and (username is null or btrim(username) = '');
