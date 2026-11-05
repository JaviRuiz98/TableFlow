-- =============================================================================
-- 0037_harden_remaining_0029_rpcs.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- STATUS: APPLIED on TableFlow via MCP (2026-11-05) as
--   harden_remaining_0029_operational_rpcs_company
--
-- Why not full 0029 file:
--   set_table_attended already tenant-guarded by 0032 (also closes OPEN orders).
--   replace_floor_plan_snapshot already tenant-guarded by 0030/0033.
--   Re-applying stock 0029 would regress those behaviours.
--
-- This migration hardens the remaining DEFINER RPCs from 0029:
--   assign_products_to_table, set_table_observation, delete_table_with_orders.
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
