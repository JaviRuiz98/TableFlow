-- =============================================================================
-- 0023_update_own_company_name.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- STATUS: READY FOR OPERATOR REVIEW — DO NOT APPLY UNTIL EXPLICITLY AUTHORIZED.
--
-- Goal: allow ADMIN to rename their own company via SECURITY DEFINER RPC.
-- Does not accept a company UUID from the client — uses profiles.company_id.
-- After 0022, is_admin() includes USER; this RPC stays ADMIN-only for name edits.
-- =============================================================================

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

revoke all on function public.update_own_company_name(text) from public;
grant execute on function public.update_own_company_name(text) to authenticated;

comment on function public.update_own_company_name(text) is
  'ADMIN-only: update companies.name for the caller profile.company_id. Never trusts client company UUID.';
