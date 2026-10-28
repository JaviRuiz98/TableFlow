-- =============================================================================
-- 0022_app_role_receptor_responsibilities.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- STATUS: READY FOR OPERATOR REVIEW — DO NOT APPLY UNTIL EXPLICITLY AUTHORIZED.
-- Requires RECEPTOR on public.app_role (0021 and/or already present in remote).
--
-- Goal: three-role split after RECEPTOR enum exists:
--   • ADMIN  — provisioning only (create-user); no day-to-day floor ops in UI
--   • USER   — former ADMIN management (planos/catálogo/operativa write via is_admin)
--   • RECEPTOR — former USER receive path (alerts + attend)
--   • Migrate existing profiles.role USER → RECEPTOR (legacy operative staff)
--   • Default new profiles to RECEPTOR; staff handle_new_user → RECEPTOR
--   • is_admin() → ADMIN | USER (tenant management writes / RLS)
--   • set_table_attended → USER | RECEPTOR
-- =============================================================================

-- Existing staff that used the old operative role become receptors.
update public.profiles
   set role = 'RECEPTOR'::public.app_role
 where role = 'USER'::public.app_role;

alter table public.profiles
  alter column role set default 'RECEPTOR'::public.app_role;

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
      'RECEPTOR'::public.app_role,
      v_company_id
    );
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'On auth.users insert: company signup → companies+ADMIN; staff → RECEPTOR with optional metadata.company_id from create-user. Never trusts metadata.role.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Tenant management writes: day-to-day USER + ADMIN (onboarding / break-glass).
  select public.current_role() in ('ADMIN', 'USER')
$$;

comment on function public.is_admin() is
  'True for ADMIN or USER (management). RECEPTOR is false. Name kept for RLS/RPC compatibility.';

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
$$;

create or replace function public.set_table_attended(
  p_table_id uuid,
  p_attended boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.current_role() not in ('USER', 'RECEPTOR') then
    raise exception 'No autorizado';
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
end
$$;

revoke all on function public.set_table_attended(uuid, boolean) from public;
grant execute on function public.set_table_attended(uuid, boolean) to authenticated;

comment on function public.set_table_attended(uuid, boolean) is
  'Mark table attended and place open PENDING items. Allowed for USER and RECEPTOR.';

-- Management RPCs: gate via is_admin() (ADMIN|USER) instead of role = ADMIN only.
create or replace function public.verify_app_secret(p_key text, p_secret text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  if auth.uid() is null or not public.is_admin() then
    return false;
  end if;

  select secret_hash into v_hash
  from public.app_secrets
  where secret_key = p_key;

  if v_hash is null then
    return false;
  end if;

  return v_hash = extensions.crypt(p_secret, v_hash);
end;
$$;

create or replace function public.assign_products_to_table(
  p_table_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_order_item_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Sin productos';
  end if;

  if not exists (select 1 from public.tables where id = p_table_id) then
    raise exception 'Mesa no encontrada';
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

create or replace function public.set_table_observation(
  p_table_id uuid,
  p_observation text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_observation text := nullif(btrim(p_observation), '');
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if not exists (select 1 from public.tables where id = p_table_id) then
    raise exception 'Mesa o reservado no encontrado';
  end if;

  update public.tables
     set observation = v_observation,
         attended = case when v_observation is not null then false else attended end,
         updated_at = now()
   where id = p_table_id;
end;
$$;

create or replace function public.delete_table_with_orders(
  p_table_id uuid,
  p_secret text,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_attended boolean;
  v_has_products boolean;
  v_hash text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'No autorizado';
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
