-- =============================================================================
-- TableFlow — Bootstrap SQL (esquema final consolidado)
-- =============================================================================
-- Origen: estado final implícito de migrations 0001 … 0016 (squash)
--         + tabla public.reservations (paridad con crearSala / Copy as SQL).
-- Destino: proyecto Supabase NUEVO y vacío (TableFlow).
--
-- NO ejecutar contra Sala Chocolatte / CreadorSala.
-- NO incluye secretos reales, Edge Functions ni usuarios Auth.
--
-- Post-SQL obligatorio (manual):
--   1) Crear primer usuario (Auth o signup).
--   2) UPDATE public.profiles SET role = 'ADMIN' WHERE id = '<uuid>';
--   3) Sembrar app_secrets (table_deletion, user_management) — ver final del archivo.
--   4) Desplegar supabase/functions/create-user.
--   5) Auth Email/Password + environments Angular.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums (forma final)
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('ADMIN', 'USER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.table_shape as enum ('circle', 'rectangle');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.floor_element_kind as enum ('wall', 'zone', 'door', 'text');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.table_type as enum ('TABLE', 'RESERVED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.order_status as enum ('OPEN', 'CLOSED', 'CANCELLED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.order_item_status as enum ('PENDING', 'PLACED', 'CANCELLED');
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.app_role not null default 'USER',
  username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

comment on column public.profiles.username is
  'Nombre de usuario de acceso visible. Las cuentas creadas desde la aplicación usan un email técnico interno en Supabase Auth.';

create table if not exists public.app_secrets (
  id uuid primary key default gen_random_uuid(),
  secret_key text not null unique,
  description text,
  secret_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.floor_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  width integer not null default 2000 check (width between 500 and 10000),
  height integer not null default 1200 check (height between 500 and 10000),
  is_active boolean not null default false,
  is_locked boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.floor_plan_elements (
  id uuid primary key default gen_random_uuid(),
  floor_plan_id uuid not null references public.floor_plans (id) on delete cascade,
  kind public.floor_element_kind not null,
  x numeric not null,
  y numeric not null,
  width numeric not null default 0,
  height numeric not null default 0,
  rotation numeric not null default 0,
  points jsonb,
  label text,
  font_size integer null,
  z_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint floor_plan_elements_font_size_check
    check (font_size is null or (font_size >= 8 and font_size <= 120))
);

create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  floor_plan_id uuid not null references public.floor_plans (id) on delete cascade,
  type public.table_type not null default 'TABLE',
  number integer not null check (number > 0),
  x numeric not null,
  y numeric not null,
  width numeric not null default 100,
  height numeric not null default 100,
  rotation numeric not null default 0,
  shape public.table_shape not null default 'circle',
  attended boolean not null default false,
  observation text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (floor_plan_id, number)
);

comment on column public.tables.observation is
  'Observación operativa visible al personal USER y editable únicamente por ADMIN.';

-- Paridad con crearSala: reservas por fecha (legacy; la app actual usa tables.type=RESERVED
-- para reservados en plano). Se incluye para no divergir del esquema de producción.
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables (id) on delete cascade,
  name text not null,
  reservation_date date not null,
  reservation_time time without time zone,
  people integer not null default 1 check (people > 0),
  notes text,
  status text not null default 'PENDING'
    check (status = any (array['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'])),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reservations_table
  on public.reservations (table_id);

create index if not exists idx_reservations_date
  on public.reservations (reservation_date);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories (id),
  name text not null,
  price numeric(10, 2) null check (price is null or price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name)
);

comment on column public.products.price is
  'Reservado para futuro desarrollo. Actualmente puede ser NULL y no se usa en la interfaz.';

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  status public.order_status not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity integer not null check (quantity > 0),
  status public.order_item_status not null default 'PENDING',
  attended boolean not null default false,
  created_by uuid not null references public.profiles (id),
  placed_by uuid references public.profiles (id),
  placed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_open_order_per_table
  on public.orders (table_id) where status = 'OPEN';

create index if not exists idx_floor_elements_plan
  on public.floor_plan_elements (floor_plan_id, z_index);

create index if not exists idx_tables_plan
  on public.tables (floor_plan_id);

create index if not exists idx_products_category
  on public.products (category_id, active);

create index if not exists idx_orders_table_status
  on public.orders (table_id, status);

create index if not exists idx_order_items_order_status
  on public.order_items (order_id, status);

-- -----------------------------------------------------------------------------
-- Updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists floor_plans_updated on public.floor_plans;
create trigger floor_plans_updated
  before update on public.floor_plans
  for each row execute function public.set_updated_at();

drop trigger if exists floor_elements_updated on public.floor_plan_elements;
create trigger floor_elements_updated
  before update on public.floor_plan_elements
  for each row execute function public.set_updated_at();

drop trigger if exists tables_updated on public.tables;
create trigger tables_updated
  before update on public.tables
  for each row execute function public.set_updated_at();

drop trigger if exists reservations_updated on public.reservations;
create trigger reservations_updated
  before update on public.reservations
  for each row execute function public.set_updated_at();

drop trigger if exists categories_updated on public.product_categories;
create trigger categories_updated
  before update on public.product_categories
  for each row execute function public.set_updated_at();

drop trigger if exists products_updated on public.products;
create trigger products_updated
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists orders_updated on public.orders;
create trigger orders_updated
  before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists order_items_updated on public.order_items;
create trigger order_items_updated
  before update on public.order_items
  for each row execute function public.set_updated_at();

drop trigger if exists app_secrets_updated on public.app_secrets;
create trigger app_secrets_updated
  before update on public.app_secrets
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Auth: nuevo usuario → profile USER (nunca privilegios desde metadata)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'USER');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Role helpers
-- -----------------------------------------------------------------------------
create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'ADMIN'
$$;

-- Alias de compatibilidad
create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
$$;

-- -----------------------------------------------------------------------------
-- Floor plan snapshot (SECURITY INVOKER → RLS ADMIN)
-- -----------------------------------------------------------------------------
create or replace function public.replace_floor_plan_snapshot(
  p_floor_plan_id uuid,
  p_elements jsonb,
  p_tables jsonb
)
returns void
language plpgsql
security invoker
as $$
declare
  keep_ids uuid[];
begin
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

-- -----------------------------------------------------------------------------
-- App secrets verification
-- -----------------------------------------------------------------------------
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
  if auth.uid() is null or public.current_role() <> 'ADMIN' then
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

revoke all on function public.verify_app_secret(text, text) from public;
grant execute on function public.verify_app_secret(text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Operativa: attended / assign / observation / delete table
-- -----------------------------------------------------------------------------
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
  if auth.uid() is null or public.current_role() not in ('ADMIN', 'USER') then
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
end;
$$;

revoke all on function public.set_table_attended(uuid, boolean) from public;
grant execute on function public.set_table_attended(uuid, boolean) to authenticated;

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
  if auth.uid() is null or public.current_role() <> 'ADMIN' then
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

revoke all on function public.assign_products_to_table(uuid, jsonb) from public;
grant execute on function public.assign_products_to_table(uuid, jsonb) to authenticated;

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
  if auth.uid() is null or public.current_role() <> 'ADMIN' then
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

revoke all on function public.set_table_observation(uuid, text) from public;
grant execute on function public.set_table_observation(uuid, text) to authenticated;

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
  if auth.uid() is null or public.current_role() <> 'ADMIN' then
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

revoke all on function public.delete_table_with_orders(uuid, text, boolean) from public;
grant execute on function public.delete_table_with_orders(uuid, text, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Catálogo seguro (historial CANCELLED no bloquea)
-- -----------------------------------------------------------------------------
create or replace function public.product_has_order_history(p_product_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo ADMIN puede gestionar el catálogo';
  end if;

  return exists (
    select 1
    from public.order_items oi
    where oi.product_id = p_product_id
      and oi.status <> 'CANCELLED'::public.order_item_status
  );
end;
$$;

create or replace function public.category_has_order_history(p_category_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo ADMIN puede gestionar el catálogo';
  end if;

  return exists (
    select 1
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where p.category_id = p_category_id
      and oi.status <> 'CANCELLED'::public.order_item_status
  );
end;
$$;

create or replace function public.delete_product_safe(p_product_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted boolean := false;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo ADMIN puede gestionar el catálogo';
  end if;

  if exists (
    select 1
    from public.order_items oi
    where oi.product_id = p_product_id
      and oi.status <> 'CANCELLED'::public.order_item_status
  ) then
    return false;
  end if;

  delete from public.order_items
  where product_id = p_product_id
    and status = 'CANCELLED'::public.order_item_status;

  delete from public.orders o
  where not exists (
    select 1 from public.order_items oi where oi.order_id = o.id
  );

  delete from public.products where id = p_product_id;
  v_deleted := found;
  return v_deleted;
end;
$$;

create or replace function public.delete_category_safe(p_category_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted boolean := false;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo ADMIN puede gestionar el catálogo';
  end if;

  if exists (
    select 1
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where p.category_id = p_category_id
      and oi.status <> 'CANCELLED'::public.order_item_status
  ) then
    return false;
  end if;

  delete from public.order_items oi
  using public.products p
  where oi.product_id = p.id
    and p.category_id = p_category_id
    and oi.status = 'CANCELLED'::public.order_item_status;

  delete from public.orders o
  where not exists (
    select 1 from public.order_items oi where oi.order_id = o.id
  );

  delete from public.products where category_id = p_category_id;
  delete from public.product_categories where id = p_category_id;
  v_deleted := found;
  return v_deleted;
end;
$$;

revoke all on function public.product_has_order_history(uuid) from public;
revoke all on function public.category_has_order_history(uuid) from public;
revoke all on function public.delete_product_safe(uuid) from public;
revoke all on function public.delete_category_safe(uuid) from public;

grant execute on function public.product_has_order_history(uuid) to authenticated;
grant execute on function public.category_has_order_history(uuid) to authenticated;
grant execute on function public.delete_product_safe(uuid) to authenticated;
grant execute on function public.delete_category_safe(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.app_secrets enable row level security;
alter table public.floor_plans enable row level security;
alter table public.floor_plan_elements enable row level security;
alter table public.tables enable row level security;
alter table public.reservations enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on table public.app_secrets from anon, authenticated;

-- Limpiar posibles policies previas (idempotente)
drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_manager_update on public.profiles;
drop policy if exists profiles_self_or_admin_select on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
drop policy if exists plans_auth_select on public.floor_plans;
drop policy if exists plans_manager_insert on public.floor_plans;
drop policy if exists plans_manager_update on public.floor_plans;
drop policy if exists plans_manager_delete on public.floor_plans;
drop policy if exists plans_admin_insert on public.floor_plans;
drop policy if exists plans_admin_update on public.floor_plans;
drop policy if exists plans_admin_delete on public.floor_plans;
drop policy if exists elements_auth_select on public.floor_plan_elements;
drop policy if exists elements_manager_write on public.floor_plan_elements;
drop policy if exists elements_admin_write on public.floor_plan_elements;
drop policy if exists tables_auth_select on public.tables;
drop policy if exists tables_manager_write on public.tables;
drop policy if exists tables_admin_write on public.tables;
drop policy if exists reservations_auth_select on public.reservations;
drop policy if exists reservations_auth_insert on public.reservations;
drop policy if exists reservations_update on public.reservations;
drop policy if exists reservations_manager_delete on public.reservations;
drop policy if exists reservations_manager_write on public.reservations;
drop policy if exists reservations_admin_insert on public.reservations;
drop policy if exists reservations_admin_update on public.reservations;
drop policy if exists reservations_admin_delete on public.reservations;
drop policy if exists reservations_admin_write on public.reservations;
drop policy if exists categories_auth_select on public.product_categories;
drop policy if exists categories_manager_write on public.product_categories;
drop policy if exists categories_admin_write on public.product_categories;
drop policy if exists products_auth_select on public.products;
drop policy if exists products_manager_write on public.products;
drop policy if exists products_admin_write on public.products;
drop policy if exists orders_auth_select on public.orders;
drop policy if exists orders_auth_insert on public.orders;
drop policy if exists orders_manager_update on public.orders;
drop policy if exists orders_manager_delete on public.orders;
drop policy if exists orders_admin_insert on public.orders;
drop policy if exists orders_admin_update on public.orders;
drop policy if exists orders_admin_delete on public.orders;
drop policy if exists items_auth_select on public.order_items;
drop policy if exists items_auth_insert on public.order_items;
drop policy if exists items_update_own_or_manager on public.order_items;
drop policy if exists items_manager_delete on public.order_items;
drop policy if exists items_admin_insert on public.order_items;
drop policy if exists items_admin_update on public.order_items;
drop policy if exists items_admin_delete on public.order_items;

create policy profiles_self_or_admin_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy plans_auth_select on public.floor_plans
  for select to authenticated using (true);
create policy plans_admin_insert on public.floor_plans
  for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid());
create policy plans_admin_update on public.floor_plans
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy plans_admin_delete on public.floor_plans
  for delete to authenticated using (public.is_admin());

create policy elements_auth_select on public.floor_plan_elements
  for select to authenticated using (true);
create policy elements_admin_write on public.floor_plan_elements
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy tables_auth_select on public.tables
  for select to authenticated using (true);
create policy tables_admin_write on public.tables
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy reservations_auth_select on public.reservations
  for select to authenticated using (true);
create policy reservations_admin_write on public.reservations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy categories_auth_select on public.product_categories
  for select to authenticated using (true);
create policy categories_admin_write on public.product_categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy products_auth_select on public.products
  for select to authenticated using (true);
create policy products_admin_write on public.products
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy orders_auth_select on public.orders
  for select to authenticated using (true);
create policy orders_admin_insert on public.orders
  for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid());
create policy orders_admin_update on public.orders
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy orders_admin_delete on public.orders
  for delete to authenticated using (public.is_admin());

create policy items_auth_select on public.order_items
  for select to authenticated using (true);
create policy items_admin_insert on public.order_items
  for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid());
create policy items_admin_update on public.order_items
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy items_admin_delete on public.order_items
  for delete to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------
alter table public.tables replica identity full;
alter table public.order_items replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table public.order_items;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tables'
  ) then
    alter publication supabase_realtime add table public.tables;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'floor_plans'
  ) then
    alter publication supabase_realtime add table public.floor_plans;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Seed catálogo de ejemplo (opcional; on conflict safe)
-- -----------------------------------------------------------------------------
insert into public.product_categories (name, sort_order)
values ('Alcohol', 1), ('Refrescos', 2)
on conflict do nothing;

insert into public.products (category_id, name, price)
select id, 'Whisky', 7 from public.product_categories where name = 'Alcohol'
on conflict do nothing;
insert into public.products (category_id, name, price)
select id, 'Ron', 7 from public.product_categories where name = 'Alcohol'
on conflict do nothing;
insert into public.products (category_id, name, price)
select id, 'Vodka', 7 from public.product_categories where name = 'Alcohol'
on conflict do nothing;
insert into public.products (category_id, name, price)
select id, 'Gin', 7 from public.product_categories where name = 'Alcohol'
on conflict do nothing;
insert into public.products (category_id, name, price)
select id, 'Tequila', 7 from public.product_categories where name = 'Alcohol'
on conflict do nothing;
insert into public.products (category_id, name, price)
select id, 'Coca-Cola', 3 from public.product_categories where name = 'Refrescos'
on conflict do nothing;
insert into public.products (category_id, name, price)
select id, 'Coca-Cola Zero', 3 from public.product_categories where name = 'Refrescos'
on conflict do nothing;
insert into public.products (category_id, name, price)
select id, 'Fanta', 3 from public.product_categories where name = 'Refrescos'
on conflict do nothing;
insert into public.products (category_id, name, price)
select id, 'Sprite', 3 from public.product_categories where name = 'Refrescos'
on conflict do nothing;
insert into public.products (category_id, name, price)
select id, 'Red Bull', 4 from public.product_categories where name = 'Refrescos'
on conflict do nothing;
insert into public.products (category_id, name, price)
select id, 'Agua', 2 from public.product_categories where name = 'Refrescos'
on conflict do nothing;

notify pgrst, 'reload schema';

commit;

-- =============================================================================
-- POST-SETUP (ejecutar a mano; NO commitear contraseñas reales)
-- =============================================================================
-- 1) Primer ADMIN:
--    update public.profiles set role = 'ADMIN' where id = '<AUTH_USER_UUID>';
--
-- 2) Secretos (sustituye las contraseñas; usa extensions.crypt):
--
-- insert into public.app_secrets (secret_key, description, secret_hash)
-- values (
--   'table_deletion',
--   'Autorización para eliminar mesas y reservados',
--   extensions.crypt('TU_CONTRASENA_DE_BORRADO', extensions.gen_salt('bf'))
-- )
-- on conflict (secret_key) do update set
--   secret_hash = excluded.secret_hash,
--   description = excluded.description,
--   updated_at = now();
--
-- insert into public.app_secrets (secret_key, description, secret_hash)
-- values (
--   'user_management',
--   'Autorización para crear usuarios desde la app',
--   extensions.crypt('TU_CONTRASENA_ADMIN_USUARIOS', extensions.gen_salt('bf'))
-- )
-- on conflict (secret_key) do update set
--   secret_hash = excluded.secret_hash,
--   description = excluded.description,
--   updated_at = now();
--
-- 3) Desplegar Edge Function create-user y configurar Auth Email/Password.
-- =============================================================================
