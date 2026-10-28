-- =============================================================================
-- 0019_staff_profile_company_id.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- STATUS: READY FOR OPERATOR REVIEW — DO NOT APPLY UNTIL EXPLICITLY AUTHORIZED.
--
-- Goal: when Edge `create-user` creates a worker via Auth Admin API, attach the
-- ADMIN's company_id on the INSERT path (handle_new_user), reading it from
-- user_metadata.company_id. Never trusts metadata.role.
--
-- Needed for onboarding step 3 (staff USER belonging to the same company).
-- protect_profile_privileged_columns still blocks client-side company_id updates.
-- =============================================================================

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

    insert into public.profiles (id, full_name, phone, role, company_id)
    values (
      new.id,
      v_full_name,
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
      'USER'::public.app_role,
      v_company_id
    );
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'On auth.users insert: company signup → companies+ADMIN; staff → USER with optional metadata.company_id from create-user. Never trusts metadata.role.';
