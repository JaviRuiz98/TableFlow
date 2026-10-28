-- =============================================================================
-- 0033_drop_table_occupied.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- Business rule: when guests sit, they already ordered. "occupied" is removed.
-- Colors/ops use: reserved + pending products (rojo) + attended (verde).
-- =============================================================================

-- 1) set_table_reserved — no occupied gate
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

  update public.tables
     set reserved = coalesce(p_reserved, false),
         updated_at = now()
   where id = p_table_id
  returning * into v_row;

  return v_row;
end;
$$;

-- 2) transfer — no occupied
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

  if v_dst.reserved
     or exists (select 1 from public.orders o where o.table_id = p_target_table_id and o.status <> 'CANCELLED') then
    raise exception 'La mesa de destino no está libre (reserva o pedidos existentes)';
  end if;

  update public.orders
     set table_id = p_target_table_id,
         updated_at = now()
   where table_id = p_source_table_id;
  get diagnostics v_moved = row_count;

  update public.tables
     set reserved = v_src.reserved,
         observation = coalesce(v_src.observation, observation),
         attended = v_src.attended,
         updated_at = now()
   where id = p_target_table_id;

  update public.tables
     set reserved = false,
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

comment on function public.transfer_table_content(uuid, uuid) is
  'ADMIN/USER: move orders + reserved within same jornada. Blocks busy targets. No merge.';

-- 3) create_opening_jornada — copy tables without occupied (same auth as 0031)
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
      attended, observation, reserved
    )
    select
      v_plan.id, type, number, x, y, width, height, rotation, shape,
      false, null, false
    from public.tables
    where floor_plan_id = p_source_floor_plan_id;
  end if;

  return v_plan;
exception
  when unique_violation then
    raise exception 'Ya existe una jornada con ese nombre en la misma fecha';
end;
$$;

comment on function public.create_opening_jornada(text, date, time, time, boolean, uuid, integer, integer) is
  'ADMIN: create scheduled jornada (+ optional geometry copy). New table UUIDs; reserved false; no orders.';

-- 4) snapshot — preserve reserved only (no occupied)
create or replace function public.replace_floor_plan_snapshot(
  p_floor_plan_id uuid,
  p_elements jsonb,
  p_tables jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  keep_ids uuid[];
  v_status public.jornada_status;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if not public.floor_plan_belongs_to_current_company(p_floor_plan_id) then
    raise exception 'Plano no encontrado o de otra empresa';
  end if;

  select status into v_status
    from public.floor_plans
   where id = p_floor_plan_id;

  if v_status = 'closed' then
    raise exception 'No se puede editar el plano de una jornada cerrada';
  end if;

  delete from public.floor_plan_elements where floor_plan_id = p_floor_plan_id;

  insert into public.floor_plan_elements (
    floor_plan_id, kind, x, y, width, height, rotation, points, label, font_size, z_index
  )
  select
    p_floor_plan_id,
    (e->>'kind')::public.floor_element_kind,
    (e->>'x')::numeric,
    (e->>'y')::numeric,
    (e->>'width')::numeric,
    (e->>'height')::numeric,
    (e->>'rotation')::numeric,
    e->'points',
    e->>'label',
    case
      when e->>'kind' = 'text' then coalesce((e->>'font_size')::integer, 22)
      else null
    end,
    (e->>'z_index')::integer
  from jsonb_array_elements(p_elements) e;

  select array_agg((t->>'id')::uuid)
    into keep_ids
  from jsonb_array_elements(p_tables) t
  where (t->>'id') is not null;

  delete from public.tables
   where floor_plan_id = p_floor_plan_id
     and (keep_ids is null or not (id = any (keep_ids)));

  insert into public.tables (
    id, floor_plan_id, type, number, x, y, width, height, rotation, shape, attended,
    reserved
  )
  select
    coalesce((t->>'id')::uuid, gen_random_uuid()),
    p_floor_plan_id,
    coalesce((t->>'type')::public.table_type, 'TABLE'),
    (t->>'number')::integer,
    (t->>'x')::numeric,
    (t->>'y')::numeric,
    (t->>'width')::numeric,
    (t->>'height')::numeric,
    (t->>'rotation')::numeric,
    (t->>'shape')::public.table_shape,
    coalesce((t->>'attended')::boolean, false),
    false
  from jsonb_array_elements(p_tables) t
  on conflict (id) do update set
    floor_plan_id = excluded.floor_plan_id,
    type = excluded.type,
    number = excluded.number,
    x = excluded.x,
    y = excluded.y,
    width = excluded.width,
    height = excluded.height,
    rotation = excluded.rotation,
    shape = excluded.shape,
    attended = excluded.attended,
    -- reserved intentionally NOT updated (operational flag via set_table_reserved)
    updated_at = now();
end;
$$;

comment on function public.replace_floor_plan_snapshot(uuid, jsonb, jsonb) is
  'Replace plan elements + upsert tables geometry. Preserves reserved. Blocks closed jornadas.';

-- 5) drop occupied RPC + column
drop function if exists public.set_table_occupied(uuid, boolean, boolean);

alter table public.tables drop column if exists occupied;

notify pgrst, 'reload schema';
