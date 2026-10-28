-- =============================================================================
-- 0031_jornada_operational_rpcs.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- Additive RPCs for opening sessions (jornadas):
--   create_opening_jornada, open_jornada, close_jornada,
--   set_table_reserved, set_table_occupied, transfer_table_content
-- Requires: 0030_jornada_and_table_flags.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.assert_manager_same_company()
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_company uuid;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  if not (public.is_admin() or public.is_manager()) then
    raise exception 'No autorizado';
  end if;
  v_company := public.current_company_id();
  if v_company is null then
    raise exception 'No hay una empresa asociada a tu cuenta';
  end if;
  return v_company;
end;
$$;

revoke all on function public.assert_manager_same_company() from public;
grant execute on function public.assert_manager_same_company() to authenticated;

create or replace function public.jornada_window_end(
  p_opening_date date,
  p_closes_at time,
  p_closes_next_day boolean
)
returns timestamptz
language sql
immutable
as $$
  select (
    (p_opening_date + case when p_closes_next_day then 1 else 0 end)
    + p_closes_at
  )::timestamp at time zone 'UTC';
$$;

-- -----------------------------------------------------------------------------
-- create_opening_jornada — empty or layout copy (new table UUIDs, flags false)
-- -----------------------------------------------------------------------------
create or replace function public.create_opening_jornada(
  p_name text,
  p_opening_date date,
  p_opens_at time,
  p_closes_at time,
  p_closes_next_day boolean default false,
  p_source_floor_plan_id uuid default null,
  p_width integer default 2000,
  p_height integer default 1200
)
returns public.floor_plans
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company uuid;
  v_width integer;
  v_height integer;
  v_plan public.floor_plans;
  v_src public.floor_plans;
begin
  v_company := public.assert_manager_same_company();
  -- Strict ADMIN only (is_admin() also includes USER after 0022).
  if public.current_role() is distinct from 'ADMIN' then
    raise exception 'Solo un administrador puede crear jornadas';
  end if;

  if p_name is null or length(btrim(p_name)) < 2 then
    raise exception 'Introduce un nombre de jornada válido';
  end if;
  if p_opening_date is null or p_opens_at is null or p_closes_at is null then
    raise exception 'Fecha y horarios de apertura son obligatorios';
  end if;

  v_width := coalesce(p_width, 2000);
  v_height := coalesce(p_height, 1200);

  if p_source_floor_plan_id is not null then
    select * into v_src
      from public.floor_plans
     where id = p_source_floor_plan_id
       and company_id = v_company;
    if not found then
      raise exception 'Plano origen no encontrado o de otra empresa';
    end if;
    v_width := v_src.width;
    v_height := v_src.height;
  end if;

  insert into public.floor_plans (
    company_id, name, width, height,
    opening_date, opens_at, closes_at, closes_next_day,
    status, is_active, is_locked
  )
  values (
    v_company, btrim(p_name), v_width, v_height,
    p_opening_date, p_opens_at, p_closes_at, coalesce(p_closes_next_day, false),
    'scheduled', false, false
  )
  returning * into v_plan;

  if p_source_floor_plan_id is not null then
    insert into public.floor_plan_elements (
      floor_plan_id, kind, x, y, width, height, rotation, points, label, font_size, z_index
    )
    select
      v_plan.id, kind, x, y, width, height, rotation, points, label, font_size, z_index
    from public.floor_plan_elements
    where floor_plan_id = p_source_floor_plan_id;

    insert into public.tables (
      floor_plan_id, type, number, x, y, width, height, rotation, shape,
      attended, observation, reserved, occupied
    )
    select
      v_plan.id, type, number, x, y, width, height, rotation, shape,
      false, null, false, false
    from public.tables
    where floor_plan_id = p_source_floor_plan_id;
  end if;

  return v_plan;
exception
  when unique_violation then
    raise exception 'Ya existe una jornada con ese nombre en la misma fecha';
end;
$$;

revoke all on function public.create_opening_jornada(text, date, time, time, boolean, uuid, integer, integer) from public;
grant execute on function public.create_opening_jornada(text, date, time, time, boolean, uuid, integer, integer) to authenticated;

comment on function public.create_opening_jornada(text, date, time, time, boolean, uuid, integer, integer) is
  'ADMIN: create scheduled jornada (+ optional geometry copy). New table UUIDs; reserved/occupied false; no orders.';

-- -----------------------------------------------------------------------------
-- open_jornada / close_jornada
-- -----------------------------------------------------------------------------
create or replace function public.open_jornada(p_floor_plan_id uuid)
returns public.floor_plans
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company uuid;
  v_plan public.floor_plans;
begin
  v_company := public.assert_manager_same_company();
  if public.current_role() is distinct from 'ADMIN' then
    raise exception 'Solo un administrador puede abrir jornadas';
  end if;

  select * into v_plan
    from public.floor_plans
   where id = p_floor_plan_id
     and company_id = v_company
   for update;
  if not found then
    raise exception 'Jornada no encontrada';
  end if;
  if v_plan.status = 'closed' then
    raise exception 'No se puede reabrir una jornada cerrada';
  end if;
  if v_plan.status = 'open' then
    return v_plan;
  end if;

  -- Close any other open jornada for this company first? Spec: prevent two open.
  -- Refuse if another is already open.
  if exists (
    select 1 from public.floor_plans
     where company_id = v_company
       and status = 'open'
       and id <> p_floor_plan_id
  ) then
    raise exception 'Ya hay una jornada abierta. Ciérrala antes de abrir otra.';
  end if;

  update public.floor_plans
     set status = 'open',
         is_active = true,
         updated_at = now()
   where id = p_floor_plan_id
  returning * into v_plan;

  return v_plan;
end;
$$;

revoke all on function public.open_jornada(uuid) from public;
grant execute on function public.open_jornada(uuid) to authenticated;

create or replace function public.close_jornada(p_floor_plan_id uuid)
returns public.floor_plans
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company uuid;
  v_plan public.floor_plans;
begin
  v_company := public.assert_manager_same_company();
  if public.current_role() is distinct from 'ADMIN' then
    raise exception 'Solo un administrador puede cerrar jornadas';
  end if;

  select * into v_plan
    from public.floor_plans
   where id = p_floor_plan_id
     and company_id = v_company
   for update;
  if not found then
    raise exception 'Jornada no encontrada';
  end if;
  if v_plan.status = 'closed' then
    return v_plan;
  end if;

  update public.floor_plans
     set status = 'closed',
         is_active = false,
         updated_at = now()
   where id = p_floor_plan_id
  returning * into v_plan;

  return v_plan;
end;
$$;

revoke all on function public.close_jornada(uuid) from public;
grant execute on function public.close_jornada(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- set_table_reserved / set_table_occupied
-- -----------------------------------------------------------------------------
create or replace function public.set_table_reserved(
  p_table_id uuid,
  p_reserved boolean
)
returns public.tables
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company uuid;
  v_row public.tables;
  v_status public.jornada_status;
begin
  v_company := public.assert_manager_same_company();

  select t.* into v_row
  from public.tables t
  join public.floor_plans fp on fp.id = t.floor_plan_id
  where t.id = p_table_id
    and fp.company_id = v_company
  for update of t;

  if not found then
    raise exception 'Mesa no encontrada o de otra empresa';
  end if;

  select fp.status into v_status
    from public.floor_plans fp
   where fp.id = v_row.floor_plan_id;

  if v_status = 'closed' then
    raise exception 'La jornada está cerrada';
  end if;

  if p_reserved = false and v_row.occupied = true then
    raise exception 'No se puede cancelar la reserva de una mesa ocupada sin liberarla antes';
  end if;

  update public.tables
     set reserved = coalesce(p_reserved, false),
         updated_at = now()
   where id = p_table_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.set_table_reserved(uuid, boolean) from public;
grant execute on function public.set_table_reserved(uuid, boolean) to authenticated;

create or replace function public.set_table_occupied(
  p_table_id uuid,
  p_occupied boolean,
  p_force boolean default false
)
returns public.tables
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company uuid;
  v_row public.tables;
  v_status public.jornada_status;
  v_pending integer;
begin
  v_company := public.assert_manager_same_company();

  select t.* into v_row
  from public.tables t
  join public.floor_plans fp on fp.id = t.floor_plan_id
  where t.id = p_table_id
    and fp.company_id = v_company
  for update of t;

  if not found then
    raise exception 'Mesa no encontrada o de otra empresa';
  end if;

  select fp.status into v_status
    from public.floor_plans fp
   where fp.id = v_row.floor_plan_id;

  if v_status = 'closed' then
    raise exception 'La jornada está cerrada';
  end if;

  if p_occupied = false and coalesce(p_force, false) = false then
    select count(*) into v_pending
      from public.orders o
     where o.table_id = p_table_id
       and o.status = 'OPEN';
    if v_pending > 0 then
      raise exception 'Hay pedidos pendientes. Confirma la liberación (force) o ciérralos antes.';
    end if;
  end if;

  update public.tables
     set occupied = coalesce(p_occupied, false),
         updated_at = now()
   where id = p_table_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.set_table_occupied(uuid, boolean, boolean) from public;
grant execute on function public.set_table_occupied(uuid, boolean, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- transfer_table_content — same plan only; move orders; swap flags
-- -----------------------------------------------------------------------------
create or replace function public.transfer_table_content(
  p_source_table_id uuid,
  p_target_table_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company uuid;
  v_src public.tables;
  v_dst public.tables;
  v_src_status public.jornada_status;
  v_moved integer;
begin
  v_company := public.assert_manager_same_company();
  -- RECEPTOR blocked: assert_manager requires admin/manager (USER)

  if p_source_table_id = p_target_table_id then
    raise exception 'El origen y el destino deben ser mesas distintas';
  end if;

  select t.* into v_src
  from public.tables t
  join public.floor_plans fp on fp.id = t.floor_plan_id
  where t.id = p_source_table_id
    and fp.company_id = v_company
  for update of t;

  if not found then
    raise exception 'Mesa de origen no encontrada o de otra empresa';
  end if;

  select fp.status into v_src_status
    from public.floor_plans fp
   where fp.id = v_src.floor_plan_id;

  if v_src_status = 'closed' then
    raise exception 'No se pueden trasladar mesas en una jornada cerrada';
  end if;

  select t.* into v_dst
  from public.tables t
  join public.floor_plans fp on fp.id = t.floor_plan_id
  where t.id = p_target_table_id
    and fp.company_id = v_company
  for update of t;

  if not found then
    raise exception 'Mesa de destino no encontrada o de otra empresa';
  end if;

  if v_src.floor_plan_id <> v_dst.floor_plan_id then
    raise exception 'Solo se puede trasladar dentro de la misma jornada';
  end if;

  if v_dst.reserved or v_dst.occupied
     or exists (select 1 from public.orders o where o.table_id = p_target_table_id and o.status <> 'CANCELLED') then
    raise exception 'La mesa de destino no está libre (reserva, ocupación o pedidos existentes)';
  end if;

  update public.orders
     set table_id = p_target_table_id,
         updated_at = now()
   where table_id = p_source_table_id;
  get diagnostics v_moved = row_count;

  update public.tables
     set reserved = v_src.reserved,
         occupied = v_src.occupied,
         observation = coalesce(v_src.observation, observation),
         attended = v_src.attended,
         updated_at = now()
   where id = p_target_table_id;

  update public.tables
     set reserved = false,
         occupied = false,
         observation = null,
         attended = false,
         updated_at = now()
   where id = p_source_table_id;

  return jsonb_build_object(
    'ok', true,
    'moved_orders', v_moved,
    'source_table_id', p_source_table_id,
    'target_table_id', p_target_table_id
  );
end;
$$;

revoke all on function public.transfer_table_content(uuid, uuid) from public;
grant execute on function public.transfer_table_content(uuid, uuid) to authenticated;

comment on function public.transfer_table_content(uuid, uuid) is
  'ADMIN/USER: move orders + reserved/occupied within same jornada. Blocks busy targets. No merge.';
