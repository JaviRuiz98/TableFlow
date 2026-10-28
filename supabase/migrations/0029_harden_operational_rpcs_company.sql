-- =============================================================================
-- 0029_harden_operational_rpcs_company.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- STATUS: READY FOR OPERATOR REVIEW — DO NOT APPLY UNTIL EXPLICITLY AUTHORIZED.
-- Requires: 0027 + 0028 (current_company_id, table_belongs_to_current_company).
--
-- Goal: SECURITY DEFINER RPCs must refuse cross-tenant table/product IDs.
-- replace_floor_plan_snapshot stays SECURITY INVOKER (RLS from 0028 applies).
-- =============================================================================

create or replace function public.assign_products_to_table(
  p_table_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_order_item_id uuid;
  v_company uuid := public.current_company_id();
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if v_company is null then
    raise exception 'Sin empresa asociada';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Sin productos';
  end if;

  if not public.table_belongs_to_current_company(p_table_id) then
    raise exception 'Mesa no encontrada o de otra empresa';
  end if;

  select id
    into v_order_id
    from public.orders
   where table_id = p_table_id
     and status = 'OPEN'
   order by created_at desc
   limit 1;

  if v_order_id is null then
    insert into public.orders (table_id, created_by)
    values (p_table_id, auth.uid())
    returning id into v_order_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      continue;
    end if;

    if not exists (
      select 1
        from public.products pr
       where pr.id = v_product_id
         and pr.company_id = v_company
    ) then
      raise exception 'Producto no encontrado o de otra empresa';
    end if;

    v_order_item_id := null;

    select id
      into v_order_item_id
      from public.order_items
     where order_id = v_order_id
       and product_id = v_product_id
       and status = 'PENDING'
       and attended = false
     order by created_at desc
     limit 1;

    if v_order_item_id is not null then
      update public.order_items
         set quantity = quantity + v_quantity,
             updated_at = now()
       where id = v_order_item_id;
    else
      insert into public.order_items (
        order_id, product_id, quantity, status, attended, created_by
      )
      values (
        v_order_id, v_product_id, v_quantity, 'PENDING', false, auth.uid()
      );
    end if;
  end loop;

  update public.tables
     set attended = false,
         updated_at = now()
   where id = p_table_id;

  return v_order_id;
end;
$$;

comment on function public.assign_products_to_table(uuid, jsonb) is
  'Assign products to a table order. is_admin() + same-company table and products.';

create or replace function public.set_table_attended(
  p_table_id uuid,
  p_attended boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or public.current_role() not in ('USER', 'RECEPTOR') then
    raise exception 'No autorizado';
  end if;

  if not public.table_belongs_to_current_company(p_table_id) then
    raise exception 'Mesa no encontrada o de otra empresa';
  end if;

  update public.tables
     set attended = p_attended,
         updated_at = now()
   where id = p_table_id;

  if p_attended then
    update public.order_items oi
       set status = 'PLACED',
           attended = true,
           placed_by = auth.uid(),
           placed_at = coalesce(oi.placed_at, now()),
           updated_at = now()
      from public.orders o
     where oi.order_id = o.id
       and o.table_id = p_table_id
       and o.status = 'OPEN'
       and oi.status = 'PENDING'
       and oi.attended = false;
  end if;
end;
$$;

comment on function public.set_table_attended(uuid, boolean) is
  'Mark table attended / place pending items. USER|RECEPTOR + same-company table.';

create or replace function public.set_table_observation(
  p_table_id uuid,
  p_observation text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_observation text := nullif(btrim(p_observation), '');
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if not public.table_belongs_to_current_company(p_table_id) then
    raise exception 'Mesa o reservado no encontrado o de otra empresa';
  end if;

  update public.tables
     set observation = v_observation,
         attended = case when v_observation is not null then false else attended end,
         updated_at = now()
   where id = p_table_id;
end;
$$;

comment on function public.set_table_observation(uuid, text) is
  'Set table observation. is_admin() + same-company table.';

create or replace function public.delete_table_with_orders(
  p_table_id uuid,
  p_secret text,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_attended boolean;
  v_has_products boolean;
  v_hash text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if not public.table_belongs_to_current_company(p_table_id) then
    return jsonb_build_object('ok', false, 'reason', 'NOT_FOUND_OR_FOREIGN');
  end if;

  select secret_hash into v_hash
    from public.app_secrets
   where secret_key = 'table_deletion';

  if v_hash is null or v_hash <> extensions.crypt(p_secret, v_hash) then
    return jsonb_build_object('ok', false, 'reason', 'BAD_PASSWORD');
  end if;

  select attended into v_attended from public.tables where id = p_table_id;
  if not found then
    return jsonb_build_object('ok', true, 'reason', 'NOT_PERSISTED');
  end if;

  select exists (
    select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
     where o.table_id = p_table_id
       and oi.status <> 'CANCELLED'
  ) into v_has_products;

  if v_has_products and coalesce(v_attended, false) and not p_force then
    return jsonb_build_object('ok', false, 'reason', 'SERVED_PRODUCTS');
  end if;

  delete from public.tables where id = p_table_id;
  return jsonb_build_object('ok', true, 'reason', 'DELETED');
end;
$$;

comment on function public.delete_table_with_orders(uuid, text, boolean) is
  'Password-gated table delete. is_admin() + same-company table.';

-- Snapshot remains INVOKER (behaviour from 0012) + same-company plan assert.
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
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if not public.floor_plan_belongs_to_current_company(p_floor_plan_id) then
    raise exception 'Plano no encontrado o de otra empresa';
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
    id, floor_plan_id, type, number, x, y, width, height, rotation, shape, attended
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
    coalesce((t->>'attended')::boolean, false)
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
    updated_at = now();
end;
$$;

comment on function public.replace_floor_plan_snapshot(uuid, jsonb, jsonb) is
  'Replace plan elements + upsert tables. INVOKER + same-company plan check (0012 behaviour).';