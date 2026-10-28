-- =============================================================================
-- 0026_unique_company_name.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- STATUS: READY FOR OPERATOR REVIEW — DO NOT APPLY UNTIL EXPLICITLY AUTHORIZED.
--
-- Goal: commercial names must be unique (case-insensitive, trimmed).
--   • Unique index on companies.name
--   • Public RPC to check availability before Auth signUp (anon + authenticated)
--   • Friendly conflict on company registration / rename
-- =============================================================================

-- Fail fast if remote already has colliding names (operator must resolve first).
do $$
declare
  v_dup text;
begin
  select lower(btrim(c.name)) into v_dup
    from public.companies c
   group by lower(btrim(c.name))
  having count(*) > 1
   limit 1;

  if v_dup is not null then
    raise exception
      'Cannot create companies_name_unique: duplicate commercial names exist (e.g. %). Resolve before applying 0026.',
      v_dup;
  end if;
end $$;

create unique index if not exists companies_name_unique
  on public.companies (lower(btrim(name)));

comment on index public.companies_name_unique is
  'Case-insensitive unique commercial name across tenants.';

create or replace function public.is_company_name_available(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := nullif(btrim(p_name), '');
begin
  if v_name is null or char_length(v_name) < 2 then
    return false;
  end if;

  return not exists (
    select 1
      from public.companies c
     where lower(btrim(c.name)) = lower(v_name)
  );
end;
$$;

revoke all on function public.is_company_name_available(text) from public;
grant execute on function public.is_company_name_available(text) to anon, authenticated;

comment on function public.is_company_name_available(text) is
  'Returns true when no company uses this commercial name (case-insensitive). Safe for public signup pre-check.';

-- Keep rename path consistent with the unique index.
create or replace function public.update_own_company_name(p_name text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid;
  v_name text := nullif(btrim(p_name), '');
  v_saved text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;

  if public.current_role() <> 'ADMIN' then
    raise exception 'Solo un ADMIN puede cambiar el nombre comercial';
  end if;

  if v_name is null or char_length(v_name) < 2 then
    raise exception 'Nombre comercial demasiado corto';
  end if;

  if char_length(v_name) > 80 then
    raise exception 'Nombre comercial demasiado largo';
  end if;

  select p.company_id into v_company_id
    from public.profiles p
   where p.id = auth.uid();

  if v_company_id is null then
    raise exception 'Sin empresa asociada';
  end if;

  if exists (
    select 1
      from public.companies c
     where lower(btrim(c.name)) = lower(v_name)
       and c.id <> v_company_id
  ) then
    raise exception 'Ya existe una empresa con ese nombre';
  end if;

  update public.companies c
     set name = v_name,
         updated_at = now()
   where c.id = v_company_id
  returning c.name into v_saved;

  if v_saved is null then
    raise exception 'Empresa no encontrada';
  end if;

  return v_saved;
end;
$$;

-- Company registration path: clear error before unique index fires.
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
    if exists (
      select 1
        from public.companies c
       where lower(btrim(c.name)) = lower(v_establishment)
    ) then
      raise exception 'Ya existe una empresa con ese nombre';
    end if;

    insert into public.companies (name)
    values (v_establishment)
    returning id into v_company_id;

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
  'On auth.users insert: company signup → companies+ADMIN (unique name, username Administrador); staff → RECEPTOR. Never trusts metadata.role.';
