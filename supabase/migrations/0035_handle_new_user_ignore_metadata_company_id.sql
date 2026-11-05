-- =============================================================================
-- 0035_handle_new_user_ignore_metadata_company_id.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- STATUS: READY FOR OPERATOR REVIEW — DO NOT APPLY UNTIL EXPLICITLY AUTHORIZED.
--
-- Goal: close public Auth signUp backdoor that associated RECEPTOR profiles to an
-- arbitrary metadata.company_id. Staff company binding is done only by Edge
-- create-user (service role UPDATE), never from client-controlled metadata.
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
  v_company_id uuid;
begin
  if exists (select 1 from public.profiles as p where p.id = new.id) then
    return new;
  end if;

  if v_establishment is not null then
    insert into public.companies (name)
    values (v_establishment)
    returning id into v_company_id;

    -- Company owner: fixed username label. Never take username/role/company_id from client.
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
    -- Staff / non-company path: create RECEPTOR without company.
    -- Edge create-user must SET company_id via service role after Auth insert.
    -- Never trust raw_user_meta_data.company_id (public signUp can forge it).
    insert into public.profiles (id, full_name, username, phone, role, company_id)
    values (
      new.id,
      v_full_name,
      v_username,
      v_phone,
      'RECEPTOR'::public.app_role,
      null
    );
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'On auth.users insert: establishment_name → company+ADMIN; otherwise RECEPTOR with company_id null. Never trusts metadata.role or metadata.company_id.';
