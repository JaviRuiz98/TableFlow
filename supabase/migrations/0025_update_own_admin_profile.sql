-- =============================================================================
-- 0025_update_own_admin_profile.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- STATUS: READY FOR OPERATOR REVIEW — DO NOT APPLY UNTIL EXPLICITLY AUTHORIZED.
--
-- Goal: allow ADMIN to update own full_name + phone via SECURITY DEFINER RPC.
-- Never accepts a profile UUID from the client — uses auth.uid().
-- Does not change role, company_id, username, or Auth email (email stays in Auth).
-- =============================================================================

create or replace function public.update_own_admin_profile(p_full_name text, p_phone text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_full_name text := nullif(btrim(p_full_name), '');
  v_phone text := nullif(btrim(p_phone), '');
  v_row public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;

  if public.current_role() <> 'ADMIN' then
    raise exception 'Solo un ADMIN puede editar estos datos';
  end if;

  if v_full_name is null or char_length(v_full_name) < 2 then
    raise exception 'Nombre demasiado corto';
  end if;

  if char_length(v_full_name) > 80 then
    raise exception 'Nombre demasiado largo';
  end if;

  if v_phone is null or char_length(v_phone) < 7 then
    raise exception 'Teléfono no válido';
  end if;

  if char_length(v_phone) > 30 then
    raise exception 'Teléfono demasiado largo';
  end if;

  if v_phone !~ '^[+\d\s().-]{7,30}$' then
    raise exception 'Teléfono no válido';
  end if;

  update public.profiles p
     set full_name = v_full_name,
         phone = v_phone,
         updated_at = now()
   where p.id = auth.uid()
     and p.role = 'ADMIN'::public.app_role
  returning p.* into v_row;

  if v_row.id is null then
    raise exception 'Perfil de administrador no encontrado';
  end if;

  return json_build_object(
    'full_name', v_row.full_name,
    'phone', v_row.phone
  );
end;
$$;

revoke all on function public.update_own_admin_profile(text, text) from public;
grant execute on function public.update_own_admin_profile(text, text) to authenticated;

comment on function public.update_own_admin_profile(text, text) is
  'ADMIN-only: update own profiles.full_name and phone. Never trusts client profile UUID.';
