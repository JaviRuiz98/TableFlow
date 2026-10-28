-- =============================================================================
-- SEED STAGING ONLY — TableFlow multiempresa (adaptado del dataset de pruebas)
-- NEVER run against production / Sala Chocolatte.
--
-- Prerequisites:
--   1) Migrations through 0029 applied on the target DB.
--   2) Create 9 Auth users (Dashboard / Admin API) with these emails:
--        admin.aurora@tableflow.test  (aurora_admin)
--        user.aurora@tableflow.test  (aurora_user)
--        receptor.aurora@tableflow.test  (aurora_receptor)
--        admin.eclipse@tableflow.test  (eclipse_admin)
--        user.eclipse@tableflow.test  (eclipse_user)
--        receptor.eclipse@tableflow.test  (eclipse_receptor)
--        admin.nebula@tableflow.test  (nebula_admin)
--        user.nebula@tableflow.test  (nebula_user)
--        receptor.nebula@tableflow.test  (nebula_receptor)
--      Passwords: store only in a private staging vault — never commit them.
--   3) Create Auth users WITHOUT company-signup metadata (avoid handle_new_user
--      creating extra companies). Prefer Admin API: email + password only.
--      The seed then upserts profiles (role/company_id/username).
--   4) Staging must not already use commercial names Sala Aurora / Club Eclipse /
--      Nébula Lounge under other company ids (companies_name_unique).
--   5) Run this script as postgres/service_role on staging/local only.
--
-- Adaptations from fixtures:
--   - orders.status COMPLETED → CLOSED
--   - order_items.status ATTENDED → PLACED (+ attended=true)
--   - products.category_label → product_categories by name (+ products.category_id)
--   - products.price_reference_eur → products.price
--   - tables.name → tables.number (RESERVED 1/2 → 101/102; unique per plan)
--   - floor_plans: width/height/is_active/is_locked; ownership via company_id
--   - profiles: resolved via auth.users email join (never invent auth rows)
--   - orders/order_items.created_by → company ADMIN auth id
--   - _company_reference columns discarded (tenant via floor_plans / products)
-- =============================================================================

-- Persistent helpers (SQL Editor may auto-commit; TEMP ON COMMIT DROP vanishes).
create schema if not exists tf_seed;
drop table if exists tf_seed.auth_map;
drop table if exists tf_seed.categories;

create table tf_seed.auth_map (
  seed_key text primary key,
  email text not null,
  auth_user_id uuid not null
);

-- Resolve Auth UUIDs by email (Auth generates ids; profiles must match).
insert into tf_seed.auth_map (seed_key, email, auth_user_id)
select x.seed_key, x.email, u.id
from (values
  ('aurora_admin', 'admin.aurora@tableflow.test'),
  ('aurora_user', 'user.aurora@tableflow.test'),
  ('aurora_receptor', 'receptor.aurora@tableflow.test'),
  ('eclipse_admin', 'admin.eclipse@tableflow.test'),
  ('eclipse_user', 'user.eclipse@tableflow.test'),
  ('eclipse_receptor', 'receptor.eclipse@tableflow.test'),
  ('nebula_admin', 'admin.nebula@tableflow.test'),
  ('nebula_user', 'user.nebula@tableflow.test'),
  ('nebula_receptor', 'receptor.nebula@tableflow.test')
) as x(seed_key, email)
join auth.users u on lower(u.email) = lower(x.email);

do $$
declare n int;
begin
  select count(*) into n from tf_seed.auth_map;
  if n < 9 then
    raise exception 'tf_seed: expected 9 auth users by email (got %). Create them first.', n;
  end if;
end $$;

-- companies
insert into public.companies (id, name, created_at, updated_at)
values
  ('2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid, 'Sala Aurora', '2026-10-08T18:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid, 'Club Eclipse', '2026-09-26T18:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('6014b29a-cd55-54fc-890e-f28944f1b964'::uuid, 'Nébula Lounge', '2026-09-14T18:00:00+00:00', '2026-10-20T18:00:00+00:00')
on conflict (id) do update set name = excluded.name, updated_at = excluded.updated_at;

-- profiles (FK to auth.users only; ADMIN username = Administrador)
insert into public.profiles (id, full_name, phone, role, company_id, username, created_at, updated_at)
select a.auth_user_id,
       v.full_name,
       v.phone,
       v.role::public.app_role,
       v.company_id,
       case when v.role = 'ADMIN' then 'Administrador' else null end,
       v.created_at::timestamptz,
       v.updated_at::timestamptz
from (values
  ('aurora_admin', 'Administrador Sala Aurora', '+346000001001', 'ADMIN', '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid, '2026-10-20T18:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('aurora_user', 'Encargado Málaga', '+346000001002', 'USER', '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid, '2026-10-20T18:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('aurora_receptor', 'Receptor Málaga', '+346000001003', 'RECEPTOR', '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid, '2026-10-20T18:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('eclipse_admin', 'Administrador Club Eclipse', '+346000002001', 'ADMIN', 'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid, '2026-10-20T18:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('eclipse_user', 'Encargado Sevilla', '+346000002002', 'USER', 'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid, '2026-10-20T18:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('eclipse_receptor', 'Receptor Sevilla', '+346000002003', 'RECEPTOR', 'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid, '2026-10-20T18:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('nebula_admin', 'Administrador Nébula Lounge', '+346000003001', 'ADMIN', '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid, '2026-10-20T18:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('nebula_user', 'Encargado Cádiz', '+346000003002', 'USER', '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid, '2026-10-20T18:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('nebula_receptor', 'Receptor Cádiz', '+346000003003', 'RECEPTOR', '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid, '2026-10-20T18:00:00+00:00', '2026-10-20T18:00:00+00:00')
) as v(seed_key, full_name, phone, role, company_id, created_at, updated_at)
join tf_seed.auth_map a on a.seed_key = v.seed_key
on conflict (id) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  role = excluded.role,
  company_id = excluded.company_id,
  username = excluded.username,
  updated_at = excluded.updated_at;

-- product_categories (unique by name; reuse existing rows if present)
insert into public.product_categories (name, sort_order, created_at, updated_at)
values
  ('Bebidas', 0, now(), now()),
  ('Botellas', 1, now(), now()),
  ('Coctelería', 2, now(), now())
on conflict (name) do update set sort_order = excluded.sort_order;

create table tf_seed.categories (
  label text primary key,
  category_id uuid not null
);

insert into tf_seed.categories (label, category_id)
select c.name, c.id
from public.product_categories c
where c.name in ('Bebidas', 'Botellas', 'Coctelería');

-- products (category_id resolved by label)
insert into public.products (id, company_id, category_id, name, price, active, created_at, updated_at)
select v.id, v.company_id, cat.category_id, v.name, v.price, v.active, now(), now()
from (values
  ('8460a1ae-9adc-5dd1-b9de-70987d3de96b'::uuid, '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid, 'Bebidas', 'Agua mineral', 3::numeric, true),
  ('0d1556f5-4598-5c3c-b8a9-9ce314869184'::uuid, '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid, 'Bebidas', 'Refresco', 4::numeric, true),
  ('1338ba13-7b4e-56b0-ad4e-c457fa175d35'::uuid, '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid, 'Bebidas', 'Cerveza', 5::numeric, true),
  ('eefd548b-af92-59d6-8d3d-5b6c894c2236'::uuid, '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid, 'Coctelería', 'Gin tonic', 12::numeric, true),
  ('66da26cd-1881-5e4a-a8dc-af2a09299cc1'::uuid, '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid, 'Coctelería', 'Mojito', 11::numeric, true),
  ('0974a938-4dda-571e-8d79-cb55c7d772b3'::uuid, '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid, 'Botellas', 'Botella premium', 110::numeric, true),
  ('3da45358-3f17-5355-9c14-461a8a899ec6'::uuid, 'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid, 'Bebidas', 'Agua mineral', 3::numeric, true),
  ('5e612c2d-b771-528c-83aa-be65be66e9b1'::uuid, 'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid, 'Bebidas', 'Refresco', 4::numeric, true),
  ('03d446c5-a8cf-5cd7-97a2-f5f02b0dd9c4'::uuid, 'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid, 'Bebidas', 'Cerveza', 5::numeric, true),
  ('08abcbfb-cfa5-5361-a15e-f6435ede1169'::uuid, 'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid, 'Coctelería', 'Gin tonic', 12::numeric, true),
  ('fdf886f6-0c4a-5c12-a4d6-4fab56c2ec07'::uuid, 'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid, 'Coctelería', 'Mojito', 11::numeric, true),
  ('83b6b252-4bcd-55dc-97a6-7949f4fa1f01'::uuid, 'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid, 'Botellas', 'Botella premium', 110::numeric, true),
  ('f42c2569-1850-5f81-a349-d80040adbb32'::uuid, '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid, 'Bebidas', 'Agua mineral', 3::numeric, true),
  ('a234aac9-282e-5a4d-897c-7aa4c92ba520'::uuid, '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid, 'Bebidas', 'Refresco', 4::numeric, true),
  ('c1bb8c46-17ef-52b3-9b44-beedc92ba30f'::uuid, '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid, 'Bebidas', 'Cerveza', 5::numeric, true),
  ('5bd806c0-056d-5291-adf0-0847ea2faf8d'::uuid, '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid, 'Coctelería', 'Gin tonic', 12::numeric, true),
  ('f226aa35-0d02-57af-b75b-49dab61ffb6d'::uuid, '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid, 'Coctelería', 'Mojito', 11::numeric, true),
  ('5fcb49a4-14d7-592f-a54b-bd8b273a31b4'::uuid, '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid, 'Botellas', 'Botella premium', 110::numeric, true)
) as v(id, company_id, category_label, name, price, active)
join tf_seed.categories cat on cat.label = v.category_label
on conflict (id) do update set
  company_id = excluded.company_id,
  category_id = excluded.category_id,
  name = excluded.name,
  price = excluded.price,
  active = excluded.active,
  updated_at = now();

-- floor_plans (tenant via company_id)
-- Bypass trg_floor_plans_enforce_company_id: it requires auth.uid() (app session).
-- SQL Editor / service role has auth.uid()=null and must seed 3 tenants at once.
alter table public.floor_plans disable trigger trg_floor_plans_enforce_company_id;
insert into public.floor_plans (id, company_id, name, width, height, is_active, is_locked, created_at, updated_at)
values
  ('2a642083-995a-53ad-adb9-e056fed936c4'::uuid, '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid, 'Sala principal', 2000, 1200, false, false, '2026-10-20T19:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('c29c075a-aa0b-5fd7-ba4f-6bfce0809832'::uuid, '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid, 'Zona VIP', 2000, 1200, false, false, '2026-10-20T20:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('dcb03f41-b696-562c-9117-0c8f96c9acbb'::uuid, 'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid, 'Sala principal', 2000, 1200, false, false, '2026-10-20T19:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('39094b0a-0ae4-5d31-8304-e6695a7c54bf'::uuid, 'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid, 'Zona VIP', 2000, 1200, false, false, '2026-10-20T20:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('e8d4d8d3-1557-580c-984d-a2e0581e60de'::uuid, '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid, 'Sala principal', 2000, 1200, false, false, '2026-10-20T19:00:00+00:00', '2026-10-20T18:00:00+00:00'),
  ('c5f7218d-1f27-547f-995b-8bfb3a97c2b9'::uuid, '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid, 'Zona VIP', 2000, 1200, false, false, '2026-10-20T20:00:00+00:00', '2026-10-20T18:00:00+00:00')
on conflict (id) do update set
  company_id = excluded.company_id,
  name = excluded.name,
  updated_at = excluded.updated_at;
alter table public.floor_plans enable trigger trg_floor_plans_enforce_company_id;

-- tables
insert into public.tables (
  id, floor_plan_id, type, number, x, y, width, height, rotation, shape, attended, observation, created_at, updated_at
)
values
  ('cecfbb36-83f0-5e24-93a2-a63e30909c6c'::uuid, '2a642083-995a-53ad-adb9-e056fed936c4'::uuid, 'TABLE'::public.table_type, 1, 120, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('bd094e87-2f9f-5896-a9fc-361d179705df'::uuid, '2a642083-995a-53ad-adb9-e056fed936c4'::uuid, 'TABLE'::public.table_type, 2, 280, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('1b3778f6-df20-5ce1-abd3-b85369d6eacd'::uuid, '2a642083-995a-53ad-adb9-e056fed936c4'::uuid, 'TABLE'::public.table_type, 3, 440, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('6120748e-8112-5055-8e12-6eab0a673caa'::uuid, '2a642083-995a-53ad-adb9-e056fed936c4'::uuid, 'TABLE'::public.table_type, 4, 600, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('92e0110b-c76b-53fe-9f40-fdfe3f9aec46'::uuid, '2a642083-995a-53ad-adb9-e056fed936c4'::uuid, 'RESERVED'::public.table_type, 101, 120, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now()),
  ('c16be33a-1125-5b94-9818-5841188e6edf'::uuid, '2a642083-995a-53ad-adb9-e056fed936c4'::uuid, 'RESERVED'::public.table_type, 102, 280, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now()),
  ('cf26cefe-e35e-5fec-b051-d68251233d79'::uuid, 'c29c075a-aa0b-5fd7-ba4f-6bfce0809832'::uuid, 'TABLE'::public.table_type, 1, 120, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('df4896f1-c934-5f2a-8317-3a4179be5e63'::uuid, 'c29c075a-aa0b-5fd7-ba4f-6bfce0809832'::uuid, 'TABLE'::public.table_type, 2, 280, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('78502ef9-af57-5018-b60a-f3ed8ebb8c54'::uuid, 'c29c075a-aa0b-5fd7-ba4f-6bfce0809832'::uuid, 'TABLE'::public.table_type, 3, 440, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('ff491245-f883-5217-8bb2-906881b5b9dc'::uuid, 'c29c075a-aa0b-5fd7-ba4f-6bfce0809832'::uuid, 'TABLE'::public.table_type, 4, 600, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('285adec7-ac94-570d-9709-83d3f031280a'::uuid, 'c29c075a-aa0b-5fd7-ba4f-6bfce0809832'::uuid, 'RESERVED'::public.table_type, 101, 120, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now()),
  ('9794ceac-35da-5a05-93be-ca1a9289b055'::uuid, 'c29c075a-aa0b-5fd7-ba4f-6bfce0809832'::uuid, 'RESERVED'::public.table_type, 102, 280, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now()),
  ('e19c6e86-69dc-5180-b76c-7a96d35248f1'::uuid, 'dcb03f41-b696-562c-9117-0c8f96c9acbb'::uuid, 'TABLE'::public.table_type, 1, 120, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('2f4b2618-3730-54a0-95bf-4d18e0687b03'::uuid, 'dcb03f41-b696-562c-9117-0c8f96c9acbb'::uuid, 'TABLE'::public.table_type, 2, 280, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('8bacbdef-a39e-50ec-9ebc-2433e54110dc'::uuid, 'dcb03f41-b696-562c-9117-0c8f96c9acbb'::uuid, 'TABLE'::public.table_type, 3, 440, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('6d74114d-0637-53f4-898d-252cd37a89a0'::uuid, 'dcb03f41-b696-562c-9117-0c8f96c9acbb'::uuid, 'TABLE'::public.table_type, 4, 600, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('e549d048-f247-504c-8764-85838a9a6cc8'::uuid, 'dcb03f41-b696-562c-9117-0c8f96c9acbb'::uuid, 'RESERVED'::public.table_type, 101, 120, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now()),
  ('a0526bd1-a6b1-5bbd-9b6f-41ede8c04fc6'::uuid, 'dcb03f41-b696-562c-9117-0c8f96c9acbb'::uuid, 'RESERVED'::public.table_type, 102, 280, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now()),
  ('0d8416b4-a811-5511-ae53-730342535159'::uuid, '39094b0a-0ae4-5d31-8304-e6695a7c54bf'::uuid, 'TABLE'::public.table_type, 1, 120, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('b2aa3ee4-ea5a-5f9b-bcfe-6ed477543b28'::uuid, '39094b0a-0ae4-5d31-8304-e6695a7c54bf'::uuid, 'TABLE'::public.table_type, 2, 280, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('8c76f960-664b-5c8f-aae7-d54d5ef36604'::uuid, '39094b0a-0ae4-5d31-8304-e6695a7c54bf'::uuid, 'TABLE'::public.table_type, 3, 440, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('932d080f-1741-5754-8fbf-f10af757a5fe'::uuid, '39094b0a-0ae4-5d31-8304-e6695a7c54bf'::uuid, 'TABLE'::public.table_type, 4, 600, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('c94d948a-6383-595d-88bb-d1ece9dc73f2'::uuid, '39094b0a-0ae4-5d31-8304-e6695a7c54bf'::uuid, 'RESERVED'::public.table_type, 101, 120, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now()),
  ('915b8d3d-0e30-55d4-8b3e-7c9e9fe3af17'::uuid, '39094b0a-0ae4-5d31-8304-e6695a7c54bf'::uuid, 'RESERVED'::public.table_type, 102, 280, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now()),
  ('a10e7084-072e-5f44-8500-6149ee505025'::uuid, 'e8d4d8d3-1557-580c-984d-a2e0581e60de'::uuid, 'TABLE'::public.table_type, 1, 120, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('b295fe56-2957-527a-9754-bbd049c8d90a'::uuid, 'e8d4d8d3-1557-580c-984d-a2e0581e60de'::uuid, 'TABLE'::public.table_type, 2, 280, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('f373a48e-c21b-5e15-8c1d-d4ebb6063070'::uuid, 'e8d4d8d3-1557-580c-984d-a2e0581e60de'::uuid, 'TABLE'::public.table_type, 3, 440, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('2b0b54a7-8038-5876-8adc-a0b6b2fd4d6c'::uuid, 'e8d4d8d3-1557-580c-984d-a2e0581e60de'::uuid, 'TABLE'::public.table_type, 4, 600, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('ff66f9c8-0c35-5330-86f6-b04db4cb95e9'::uuid, 'e8d4d8d3-1557-580c-984d-a2e0581e60de'::uuid, 'RESERVED'::public.table_type, 101, 120, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now()),
  ('8cd07f41-8d81-5ce5-bef3-6f189c69723e'::uuid, 'e8d4d8d3-1557-580c-984d-a2e0581e60de'::uuid, 'RESERVED'::public.table_type, 102, 280, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now()),
  ('fd7f29b7-0a42-5855-85cd-96c30be16d1e'::uuid, 'c5f7218d-1f27-547f-995b-8bfb3a97c2b9'::uuid, 'TABLE'::public.table_type, 1, 120, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('f51f812e-70e0-527b-b29a-f6fd4fe7602c'::uuid, 'c5f7218d-1f27-547f-995b-8bfb3a97c2b9'::uuid, 'TABLE'::public.table_type, 2, 280, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('5c8dbcfd-d205-515c-b5a1-0b82a5500a87'::uuid, 'c5f7218d-1f27-547f-995b-8bfb3a97c2b9'::uuid, 'TABLE'::public.table_type, 3, 440, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('828cd11a-50e5-59cc-9893-be32e926b355'::uuid, 'c5f7218d-1f27-547f-995b-8bfb3a97c2b9'::uuid, 'TABLE'::public.table_type, 4, 600, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('581d6d08-2cb1-5653-8d39-ed5af4797aab'::uuid, 'c5f7218d-1f27-547f-995b-8bfb3a97c2b9'::uuid, 'RESERVED'::public.table_type, 101, 120, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now()),
  ('a2a52541-5277-5793-a5f9-e62d130ab87b'::uuid, 'c5f7218d-1f27-547f-995b-8bfb3a97c2b9'::uuid, 'RESERVED'::public.table_type, 102, 280, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now())
on conflict (id) do update set
  floor_plan_id = excluded.floor_plan_id,
  type = excluded.type,
  number = excluded.number,
  x = excluded.x, y = excluded.y, width = excluded.width, height = excluded.height,
  rotation = excluded.rotation, shape = excluded.shape,
  updated_at = now();

-- orders (COMPLETED → CLOSED; created_by = company ADMIN)
insert into public.orders (id, table_id, created_by, status, created_at, updated_at)
select v.id, v.table_id, a.auth_user_id, v.status::public.order_status, v.created_at, v.created_at
from (values
  ('254092f3-fea9-51bf-a6d1-2845ab74af5b'::uuid, 'cecfbb36-83f0-5e24-93a2-a63e30909c6c'::uuid, 'aurora_admin', 'OPEN', '2026-10-21T19:00:00+00:00'::timestamptz),
  ('f01713b2-0cf0-5dac-840c-86ae102425d7'::uuid, 'bd094e87-2f9f-5896-a9fc-361d179705df'::uuid, 'aurora_admin', 'OPEN', '2026-10-22T20:00:00+00:00'::timestamptz),
  ('71cd32c7-9325-5d5d-9e75-3e7fe735249d'::uuid, '1b3778f6-df20-5ce1-abd3-b85369d6eacd'::uuid, 'aurora_admin', 'CLOSED', '2026-10-23T21:00:00+00:00'::timestamptz),
  ('22de8a85-962f-5183-869e-c1fdc34a8d13'::uuid, '6120748e-8112-5055-8e12-6eab0a673caa'::uuid, 'aurora_admin', 'OPEN', '2026-10-24T22:00:00+00:00'::timestamptz),
  ('9a774624-5c7c-5f83-a492-9ed37571ce75'::uuid, '92e0110b-c76b-53fe-9f40-fdfe3f9aec46'::uuid, 'aurora_admin', 'OPEN', '2026-10-20T23:00:00+00:00'::timestamptz),
  ('b599ea36-036c-5c5d-9a60-80daf6fc238b'::uuid, 'c16be33a-1125-5b94-9818-5841188e6edf'::uuid, 'aurora_admin', 'CLOSED', '2026-10-22T00:00:00+00:00'::timestamptz),
  ('8e822f21-bf77-50ab-ad54-f893fca660c8'::uuid, 'cf26cefe-e35e-5fec-b051-d68251233d79'::uuid, 'aurora_admin', 'OPEN', '2026-10-23T01:00:00+00:00'::timestamptz),
  ('d62668e6-6f29-5b80-b258-09bd3e9be0c1'::uuid, 'df4896f1-c934-5f2a-8317-3a4179be5e63'::uuid, 'aurora_admin', 'OPEN', '2026-10-24T02:00:00+00:00'::timestamptz),
  ('350feaa0-5861-5c7c-bc12-4fcaff5893e7'::uuid, '78502ef9-af57-5018-b60a-f3ed8ebb8c54'::uuid, 'aurora_admin', 'CLOSED', '2026-10-25T03:00:00+00:00'::timestamptz),
  ('0f0b1eb2-00f9-52ad-98ed-30e47b4ed69c'::uuid, 'ff491245-f883-5217-8bb2-906881b5b9dc'::uuid, 'aurora_admin', 'OPEN', '2026-10-21T04:00:00+00:00'::timestamptz),
  ('2295d47c-b6aa-5a76-bb2e-952de6313b66'::uuid, '285adec7-ac94-570d-9709-83d3f031280a'::uuid, 'aurora_admin', 'OPEN', '2026-10-22T05:00:00+00:00'::timestamptz),
  ('9606f4d0-72e0-58f5-8ffe-142080dde2b9'::uuid, '9794ceac-35da-5a05-93be-ca1a9289b055'::uuid, 'aurora_admin', 'CLOSED', '2026-10-23T06:00:00+00:00'::timestamptz),
  ('4d38083c-d7e3-5e0d-8133-19df7e3f55f2'::uuid, 'e19c6e86-69dc-5180-b76c-7a96d35248f1'::uuid, 'eclipse_admin', 'OPEN', '2026-10-21T19:00:00+00:00'::timestamptz),
  ('25ec43bb-eb69-529f-96ff-d014675b87a8'::uuid, '2f4b2618-3730-54a0-95bf-4d18e0687b03'::uuid, 'eclipse_admin', 'OPEN', '2026-10-22T20:00:00+00:00'::timestamptz),
  ('91bf0855-a900-5186-a97c-25c402a7eb63'::uuid, '8bacbdef-a39e-50ec-9ebc-2433e54110dc'::uuid, 'eclipse_admin', 'CLOSED', '2026-10-23T21:00:00+00:00'::timestamptz),
  ('c615a3f8-27b3-505d-b9f5-a275d344075f'::uuid, '6d74114d-0637-53f4-898d-252cd37a89a0'::uuid, 'eclipse_admin', 'OPEN', '2026-10-24T22:00:00+00:00'::timestamptz),
  ('6f84e4e2-4af8-50cb-8b51-b3953ab5bccd'::uuid, 'e549d048-f247-504c-8764-85838a9a6cc8'::uuid, 'eclipse_admin', 'OPEN', '2026-10-20T23:00:00+00:00'::timestamptz),
  ('04e962a3-f4c1-5a93-af7c-28d07fd3f468'::uuid, 'a0526bd1-a6b1-5bbd-9b6f-41ede8c04fc6'::uuid, 'eclipse_admin', 'CLOSED', '2026-10-22T00:00:00+00:00'::timestamptz),
  ('9d8c39b4-4d22-5f24-8c6b-71628d77c928'::uuid, '0d8416b4-a811-5511-ae53-730342535159'::uuid, 'eclipse_admin', 'OPEN', '2026-10-23T01:00:00+00:00'::timestamptz),
  ('d89528d6-47e6-5911-b5ca-dfe5731074cc'::uuid, 'b2aa3ee4-ea5a-5f9b-bcfe-6ed477543b28'::uuid, 'eclipse_admin', 'OPEN', '2026-10-24T02:00:00+00:00'::timestamptz),
  ('513d6d3d-28da-5d52-8600-4e374bffc3f0'::uuid, '8c76f960-664b-5c8f-aae7-d54d5ef36604'::uuid, 'eclipse_admin', 'CLOSED', '2026-10-25T03:00:00+00:00'::timestamptz),
  ('bfabd722-ba64-51d8-bb84-c722277bc245'::uuid, '932d080f-1741-5754-8fbf-f10af757a5fe'::uuid, 'eclipse_admin', 'OPEN', '2026-10-21T04:00:00+00:00'::timestamptz),
  ('796f503b-db12-5569-8243-c538f24558fa'::uuid, 'c94d948a-6383-595d-88bb-d1ece9dc73f2'::uuid, 'eclipse_admin', 'OPEN', '2026-10-22T05:00:00+00:00'::timestamptz),
  ('d863b6f1-b2c8-584f-bc2f-95e2c83d770c'::uuid, '915b8d3d-0e30-55d4-8b3e-7c9e9fe3af17'::uuid, 'eclipse_admin', 'CLOSED', '2026-10-23T06:00:00+00:00'::timestamptz),
  ('5872ff09-9a5b-5607-a229-1331c80f3a37'::uuid, 'a10e7084-072e-5f44-8500-6149ee505025'::uuid, 'nebula_admin', 'OPEN', '2026-10-21T19:00:00+00:00'::timestamptz),
  ('a9e7175d-f8ed-54dc-bd30-b05ddfbade68'::uuid, 'b295fe56-2957-527a-9754-bbd049c8d90a'::uuid, 'nebula_admin', 'OPEN', '2026-10-22T20:00:00+00:00'::timestamptz),
  ('a5e57dc2-b173-52e9-85e3-49826a4100bc'::uuid, 'f373a48e-c21b-5e15-8c1d-d4ebb6063070'::uuid, 'nebula_admin', 'CLOSED', '2026-10-23T21:00:00+00:00'::timestamptz),
  ('f408e00e-372a-510f-b355-4b2f8c05f483'::uuid, '2b0b54a7-8038-5876-8adc-a0b6b2fd4d6c'::uuid, 'nebula_admin', 'OPEN', '2026-10-24T22:00:00+00:00'::timestamptz),
  ('479afd50-a5de-5c6d-8e9d-91d339616fa3'::uuid, 'ff66f9c8-0c35-5330-86f6-b04db4cb95e9'::uuid, 'nebula_admin', 'OPEN', '2026-10-20T23:00:00+00:00'::timestamptz),
  ('a1ca4d07-366d-5e26-90d7-42b62ff83a0f'::uuid, '8cd07f41-8d81-5ce5-bef3-6f189c69723e'::uuid, 'nebula_admin', 'CLOSED', '2026-10-22T00:00:00+00:00'::timestamptz),
  ('dd3531c2-e635-5d58-94b6-5807f422be59'::uuid, 'fd7f29b7-0a42-5855-85cd-96c30be16d1e'::uuid, 'nebula_admin', 'OPEN', '2026-10-23T01:00:00+00:00'::timestamptz),
  ('e2a32507-3ec1-51eb-8c90-45431bc8b497'::uuid, 'f51f812e-70e0-527b-b29a-f6fd4fe7602c'::uuid, 'nebula_admin', 'OPEN', '2026-10-24T02:00:00+00:00'::timestamptz),
  ('ea618f2f-5f2a-5ad9-938f-ab9cccb1734e'::uuid, '5c8dbcfd-d205-515c-b5a1-0b82a5500a87'::uuid, 'nebula_admin', 'CLOSED', '2026-10-25T03:00:00+00:00'::timestamptz),
  ('8ec2ca07-f9e8-5968-93d5-80400f4eb14e'::uuid, '828cd11a-50e5-59cc-9893-be32e926b355'::uuid, 'nebula_admin', 'OPEN', '2026-10-21T04:00:00+00:00'::timestamptz),
  ('efac8dd4-539b-59cd-a811-612a55b5955c'::uuid, '581d6d08-2cb1-5653-8d39-ed5af4797aab'::uuid, 'nebula_admin', 'OPEN', '2026-10-22T05:00:00+00:00'::timestamptz),
  ('a78a2f9f-6030-59fe-ab7d-657bdbc3e0b6'::uuid, 'a2a52541-5277-5793-a5f9-e62d130ab87b'::uuid, 'nebula_admin', 'CLOSED', '2026-10-23T06:00:00+00:00'::timestamptz)
) as v(id, table_id, seed_key, status, created_at)
join tf_seed.auth_map a on a.seed_key = v.seed_key
on conflict (id) do update set
  table_id = excluded.table_id,
  created_by = excluded.created_by,
  status = excluded.status,
  updated_at = excluded.created_at;

-- order_items (ATTENDED → PLACED)
insert into public.order_items (
  id, order_id, product_id, quantity, status, attended, created_by, placed_by, placed_at, created_at, updated_at
)
select v.id, v.order_id, v.product_id, v.quantity, v.status::public.order_item_status, v.attended,
       a.auth_user_id,
       case when v.attended then a.auth_user_id else null end,
       case when v.attended then now() else null end,
       now(), now()
from (values
  ('e6eb3f0c-6cdc-533e-ad76-6a87b0c90ef1'::uuid, '254092f3-fea9-51bf-a6d1-2845ab74af5b'::uuid, '1338ba13-7b4e-56b0-ad4e-c457fa175d35'::uuid, 1, 'PENDING', false, 'aurora_admin'),
  ('aa76ba5a-62d6-5687-b09c-63f6fe1a5710'::uuid, '254092f3-fea9-51bf-a6d1-2845ab74af5b'::uuid, 'eefd548b-af92-59d6-8d3d-5b6c894c2236'::uuid, 2, 'PENDING', false, 'aurora_admin'),
  ('6d969fbc-65e1-5e59-a5e9-e4c915540638'::uuid, 'f01713b2-0cf0-5dac-840c-86ae102425d7'::uuid, 'eefd548b-af92-59d6-8d3d-5b6c894c2236'::uuid, 1, 'PENDING', false, 'aurora_admin'),
  ('4bc808f0-6104-5120-ac1a-48213500bb23'::uuid, 'f01713b2-0cf0-5dac-840c-86ae102425d7'::uuid, '66da26cd-1881-5e4a-a8dc-af2a09299cc1'::uuid, 2, 'PENDING', false, 'aurora_admin'),
  ('c9e765a0-69f6-5a19-9f65-200fea92b52a'::uuid, '71cd32c7-9325-5d5d-9e75-3e7fe735249d'::uuid, '66da26cd-1881-5e4a-a8dc-af2a09299cc1'::uuid, 1, 'PLACED', true, 'aurora_admin'),
  ('fbfa8cc7-5eb0-5d92-ab7b-7180235767d3'::uuid, '71cd32c7-9325-5d5d-9e75-3e7fe735249d'::uuid, '0974a938-4dda-571e-8d79-cb55c7d772b3'::uuid, 2, 'PLACED', true, 'aurora_admin'),
  ('5b13d61e-b6a0-532d-85e1-3ec9f6be3b26'::uuid, '22de8a85-962f-5183-869e-c1fdc34a8d13'::uuid, '0974a938-4dda-571e-8d79-cb55c7d772b3'::uuid, 1, 'PENDING', false, 'aurora_admin'),
  ('392d2539-02aa-5374-a368-c78c1b0a78b4'::uuid, '22de8a85-962f-5183-869e-c1fdc34a8d13'::uuid, '8460a1ae-9adc-5dd1-b9de-70987d3de96b'::uuid, 2, 'PENDING', false, 'aurora_admin'),
  ('61354716-8d5e-5c3d-93a3-b8f2a168fd0d'::uuid, '9a774624-5c7c-5f83-a492-9ed37571ce75'::uuid, '8460a1ae-9adc-5dd1-b9de-70987d3de96b'::uuid, 1, 'PENDING', false, 'aurora_admin'),
  ('1df62fd6-90f7-513a-b6d0-5e5a654e6e97'::uuid, '9a774624-5c7c-5f83-a492-9ed37571ce75'::uuid, '0d1556f5-4598-5c3c-b8a9-9ce314869184'::uuid, 2, 'PENDING', false, 'aurora_admin'),
  ('7741ec38-a222-5b77-9547-1f90a35f6ea5'::uuid, 'b599ea36-036c-5c5d-9a60-80daf6fc238b'::uuid, '0d1556f5-4598-5c3c-b8a9-9ce314869184'::uuid, 1, 'PLACED', true, 'aurora_admin'),
  ('c39c732b-4eb2-5c7c-ae24-db184b2cd205'::uuid, 'b599ea36-036c-5c5d-9a60-80daf6fc238b'::uuid, '1338ba13-7b4e-56b0-ad4e-c457fa175d35'::uuid, 2, 'PLACED', true, 'aurora_admin'),
  ('b214ec67-319e-5298-960a-019142d5b55e'::uuid, '8e822f21-bf77-50ab-ad54-f893fca660c8'::uuid, '1338ba13-7b4e-56b0-ad4e-c457fa175d35'::uuid, 1, 'PENDING', false, 'aurora_admin'),
  ('6a5b4688-daf1-5357-bcd1-be6a381cacd1'::uuid, '8e822f21-bf77-50ab-ad54-f893fca660c8'::uuid, 'eefd548b-af92-59d6-8d3d-5b6c894c2236'::uuid, 2, 'PENDING', false, 'aurora_admin'),
  ('90163832-20ab-5548-a7e8-de83dd07f1da'::uuid, 'd62668e6-6f29-5b80-b258-09bd3e9be0c1'::uuid, 'eefd548b-af92-59d6-8d3d-5b6c894c2236'::uuid, 1, 'PENDING', false, 'aurora_admin'),
  ('b2cb78bf-5fe8-51d8-8965-3f40ffb1fd30'::uuid, 'd62668e6-6f29-5b80-b258-09bd3e9be0c1'::uuid, '66da26cd-1881-5e4a-a8dc-af2a09299cc1'::uuid, 2, 'PENDING', false, 'aurora_admin'),
  ('4741d683-49ba-5b73-9007-db79124fac85'::uuid, '350feaa0-5861-5c7c-bc12-4fcaff5893e7'::uuid, '66da26cd-1881-5e4a-a8dc-af2a09299cc1'::uuid, 1, 'PLACED', true, 'aurora_admin'),
  ('81197733-fba4-5aa7-82af-83fed27ee784'::uuid, '350feaa0-5861-5c7c-bc12-4fcaff5893e7'::uuid, '0974a938-4dda-571e-8d79-cb55c7d772b3'::uuid, 2, 'PLACED', true, 'aurora_admin'),
  ('820b90c6-a9aa-535f-b845-49f3a291bc46'::uuid, '0f0b1eb2-00f9-52ad-98ed-30e47b4ed69c'::uuid, '0974a938-4dda-571e-8d79-cb55c7d772b3'::uuid, 1, 'PENDING', false, 'aurora_admin'),
  ('861806fb-705a-5c49-aa5a-6487ff61a667'::uuid, '0f0b1eb2-00f9-52ad-98ed-30e47b4ed69c'::uuid, '8460a1ae-9adc-5dd1-b9de-70987d3de96b'::uuid, 2, 'PENDING', false, 'aurora_admin'),
  ('f3fc1d08-0060-5054-86a3-8fa23fea882a'::uuid, '2295d47c-b6aa-5a76-bb2e-952de6313b66'::uuid, '8460a1ae-9adc-5dd1-b9de-70987d3de96b'::uuid, 1, 'PENDING', false, 'aurora_admin'),
  ('99f4a7b5-dc71-5ca5-9d63-f138aee5ef19'::uuid, '2295d47c-b6aa-5a76-bb2e-952de6313b66'::uuid, '0d1556f5-4598-5c3c-b8a9-9ce314869184'::uuid, 2, 'PENDING', false, 'aurora_admin'),
  ('69b2b3ce-e4db-5532-8b88-5c3e29310c51'::uuid, '9606f4d0-72e0-58f5-8ffe-142080dde2b9'::uuid, '0d1556f5-4598-5c3c-b8a9-9ce314869184'::uuid, 1, 'PLACED', true, 'aurora_admin'),
  ('60b2056a-4e40-5ffe-ac63-34cdc340760d'::uuid, '9606f4d0-72e0-58f5-8ffe-142080dde2b9'::uuid, '1338ba13-7b4e-56b0-ad4e-c457fa175d35'::uuid, 2, 'PLACED', true, 'aurora_admin'),
  ('91c6adb5-3925-5672-bd04-c041a8733408'::uuid, '4d38083c-d7e3-5e0d-8133-19df7e3f55f2'::uuid, '03d446c5-a8cf-5cd7-97a2-f5f02b0dd9c4'::uuid, 1, 'PENDING', false, 'eclipse_admin'),
  ('17f61772-8a0b-527f-8eb6-bd48ce18b0b9'::uuid, '4d38083c-d7e3-5e0d-8133-19df7e3f55f2'::uuid, '08abcbfb-cfa5-5361-a15e-f6435ede1169'::uuid, 2, 'PENDING', false, 'eclipse_admin'),
  ('60b38a7c-15e3-5f48-a1f6-cffb4c5f7bb3'::uuid, '25ec43bb-eb69-529f-96ff-d014675b87a8'::uuid, '08abcbfb-cfa5-5361-a15e-f6435ede1169'::uuid, 1, 'PENDING', false, 'eclipse_admin'),
  ('8b7604b5-6b96-5770-a960-661247d8d927'::uuid, '25ec43bb-eb69-529f-96ff-d014675b87a8'::uuid, 'fdf886f6-0c4a-5c12-a4d6-4fab56c2ec07'::uuid, 2, 'PENDING', false, 'eclipse_admin'),
  ('cea622f7-3a59-56fb-9506-550a62056665'::uuid, '91bf0855-a900-5186-a97c-25c402a7eb63'::uuid, 'fdf886f6-0c4a-5c12-a4d6-4fab56c2ec07'::uuid, 1, 'PLACED', true, 'eclipse_admin'),
  ('59551c45-c224-5c73-8c1f-6c10bfa0b545'::uuid, '91bf0855-a900-5186-a97c-25c402a7eb63'::uuid, '83b6b252-4bcd-55dc-97a6-7949f4fa1f01'::uuid, 2, 'PLACED', true, 'eclipse_admin'),
  ('952e5af0-1342-5d54-8332-5d9a5b6f874d'::uuid, 'c615a3f8-27b3-505d-b9f5-a275d344075f'::uuid, '83b6b252-4bcd-55dc-97a6-7949f4fa1f01'::uuid, 1, 'PENDING', false, 'eclipse_admin'),
  ('8556154a-97a2-5bdb-a9a8-02a5e8d0f3f6'::uuid, 'c615a3f8-27b3-505d-b9f5-a275d344075f'::uuid, '3da45358-3f17-5355-9c14-461a8a899ec6'::uuid, 2, 'PENDING', false, 'eclipse_admin'),
  ('2204d5a1-6ec6-50dd-bd3c-7bcc204acd39'::uuid, '6f84e4e2-4af8-50cb-8b51-b3953ab5bccd'::uuid, '3da45358-3f17-5355-9c14-461a8a899ec6'::uuid, 1, 'PENDING', false, 'eclipse_admin'),
  ('527a54b4-bbdd-59ba-9090-35b25d9252c1'::uuid, '6f84e4e2-4af8-50cb-8b51-b3953ab5bccd'::uuid, '5e612c2d-b771-528c-83aa-be65be66e9b1'::uuid, 2, 'PENDING', false, 'eclipse_admin'),
  ('03c0667f-8be2-5212-b968-1379c0e5d7a4'::uuid, '04e962a3-f4c1-5a93-af7c-28d07fd3f468'::uuid, '5e612c2d-b771-528c-83aa-be65be66e9b1'::uuid, 1, 'PLACED', true, 'eclipse_admin'),
  ('2953edfa-4d5e-5c3a-a469-881edbeb21a7'::uuid, '04e962a3-f4c1-5a93-af7c-28d07fd3f468'::uuid, '03d446c5-a8cf-5cd7-97a2-f5f02b0dd9c4'::uuid, 2, 'PLACED', true, 'eclipse_admin'),
  ('c8c6bf47-cb53-5d64-80a2-f9c66f9269c5'::uuid, '9d8c39b4-4d22-5f24-8c6b-71628d77c928'::uuid, '03d446c5-a8cf-5cd7-97a2-f5f02b0dd9c4'::uuid, 1, 'PENDING', false, 'eclipse_admin'),
  ('68e072de-2010-5907-92dd-052c3d34ac1e'::uuid, '9d8c39b4-4d22-5f24-8c6b-71628d77c928'::uuid, '08abcbfb-cfa5-5361-a15e-f6435ede1169'::uuid, 2, 'PENDING', false, 'eclipse_admin'),
  ('88af02e6-e9e0-5dd1-b3d1-3688f92abc30'::uuid, 'd89528d6-47e6-5911-b5ca-dfe5731074cc'::uuid, '08abcbfb-cfa5-5361-a15e-f6435ede1169'::uuid, 1, 'PENDING', false, 'eclipse_admin'),
  ('897c932f-c931-53bf-a8e4-e30072f1d11e'::uuid, 'd89528d6-47e6-5911-b5ca-dfe5731074cc'::uuid, 'fdf886f6-0c4a-5c12-a4d6-4fab56c2ec07'::uuid, 2, 'PENDING', false, 'eclipse_admin'),
  ('892f2566-65f3-549e-8925-a4540b241bde'::uuid, '513d6d3d-28da-5d52-8600-4e374bffc3f0'::uuid, 'fdf886f6-0c4a-5c12-a4d6-4fab56c2ec07'::uuid, 1, 'PLACED', true, 'eclipse_admin'),
  ('1a74f17d-187d-533e-b485-5ae25015c664'::uuid, '513d6d3d-28da-5d52-8600-4e374bffc3f0'::uuid, '83b6b252-4bcd-55dc-97a6-7949f4fa1f01'::uuid, 2, 'PLACED', true, 'eclipse_admin'),
  ('939232ce-dbb7-5580-ae17-b8512ba81c2a'::uuid, 'bfabd722-ba64-51d8-bb84-c722277bc245'::uuid, '83b6b252-4bcd-55dc-97a6-7949f4fa1f01'::uuid, 1, 'PENDING', false, 'eclipse_admin'),
  ('a66fa0a6-84bf-544e-ba9b-2ad18014ea0c'::uuid, 'bfabd722-ba64-51d8-bb84-c722277bc245'::uuid, '3da45358-3f17-5355-9c14-461a8a899ec6'::uuid, 2, 'PENDING', false, 'eclipse_admin'),
  ('546e165c-4b82-5162-80c7-4fa3c42a3533'::uuid, '796f503b-db12-5569-8243-c538f24558fa'::uuid, '3da45358-3f17-5355-9c14-461a8a899ec6'::uuid, 1, 'PENDING', false, 'eclipse_admin'),
  ('767633fa-99fa-589f-9239-41c291709817'::uuid, '796f503b-db12-5569-8243-c538f24558fa'::uuid, '5e612c2d-b771-528c-83aa-be65be66e9b1'::uuid, 2, 'PENDING', false, 'eclipse_admin'),
  ('66f4b8e9-9097-5c12-ab41-6132ba8a6487'::uuid, 'd863b6f1-b2c8-584f-bc2f-95e2c83d770c'::uuid, '5e612c2d-b771-528c-83aa-be65be66e9b1'::uuid, 1, 'PLACED', true, 'eclipse_admin'),
  ('ce4ff0b4-2e5c-5aff-96a3-cfaebc48f0fc'::uuid, 'd863b6f1-b2c8-584f-bc2f-95e2c83d770c'::uuid, '03d446c5-a8cf-5cd7-97a2-f5f02b0dd9c4'::uuid, 2, 'PLACED', true, 'eclipse_admin'),
  ('43c50ed2-d0b7-529c-8f23-0494ee091d8e'::uuid, '5872ff09-9a5b-5607-a229-1331c80f3a37'::uuid, 'c1bb8c46-17ef-52b3-9b44-beedc92ba30f'::uuid, 1, 'PENDING', false, 'nebula_admin'),
  ('92b7882a-6159-5cdc-94d5-bbf633e24b22'::uuid, '5872ff09-9a5b-5607-a229-1331c80f3a37'::uuid, '5bd806c0-056d-5291-adf0-0847ea2faf8d'::uuid, 2, 'PENDING', false, 'nebula_admin'),
  ('a631d071-c135-5056-9c33-dc96e8bf8d42'::uuid, 'a9e7175d-f8ed-54dc-bd30-b05ddfbade68'::uuid, '5bd806c0-056d-5291-adf0-0847ea2faf8d'::uuid, 1, 'PENDING', false, 'nebula_admin'),
  ('433f13fa-c2b5-5b43-a581-9f70ee316f0a'::uuid, 'a9e7175d-f8ed-54dc-bd30-b05ddfbade68'::uuid, 'f226aa35-0d02-57af-b75b-49dab61ffb6d'::uuid, 2, 'PENDING', false, 'nebula_admin'),
  ('e6648e7f-5c2f-507e-bbd0-6c15b5de4d5a'::uuid, 'a5e57dc2-b173-52e9-85e3-49826a4100bc'::uuid, 'f226aa35-0d02-57af-b75b-49dab61ffb6d'::uuid, 1, 'PLACED', true, 'nebula_admin'),
  ('e8711bff-d1be-53d3-9ab1-4bdfa8c74417'::uuid, 'a5e57dc2-b173-52e9-85e3-49826a4100bc'::uuid, '5fcb49a4-14d7-592f-a54b-bd8b273a31b4'::uuid, 2, 'PLACED', true, 'nebula_admin'),
  ('f01b545d-3344-5f27-9135-fc344d1c7e2a'::uuid, 'f408e00e-372a-510f-b355-4b2f8c05f483'::uuid, '5fcb49a4-14d7-592f-a54b-bd8b273a31b4'::uuid, 1, 'PENDING', false, 'nebula_admin'),
  ('1c2ffb0f-0928-524a-a8ab-882b20dda1f7'::uuid, 'f408e00e-372a-510f-b355-4b2f8c05f483'::uuid, 'f42c2569-1850-5f81-a349-d80040adbb32'::uuid, 2, 'PENDING', false, 'nebula_admin'),
  ('90f01916-83e5-52ea-8543-cf1aa761cc83'::uuid, '479afd50-a5de-5c6d-8e9d-91d339616fa3'::uuid, 'f42c2569-1850-5f81-a349-d80040adbb32'::uuid, 1, 'PENDING', false, 'nebula_admin'),
  ('fbecc679-218d-583c-8c82-3cb2bd65580d'::uuid, '479afd50-a5de-5c6d-8e9d-91d339616fa3'::uuid, 'a234aac9-282e-5a4d-897c-7aa4c92ba520'::uuid, 2, 'PENDING', false, 'nebula_admin'),
  ('4ab680ab-8b8e-5318-879f-3a0a99e5485d'::uuid, 'a1ca4d07-366d-5e26-90d7-42b62ff83a0f'::uuid, 'a234aac9-282e-5a4d-897c-7aa4c92ba520'::uuid, 1, 'PLACED', true, 'nebula_admin'),
  ('0b55bbf4-fca7-507c-83f1-595cded7a408'::uuid, 'a1ca4d07-366d-5e26-90d7-42b62ff83a0f'::uuid, 'c1bb8c46-17ef-52b3-9b44-beedc92ba30f'::uuid, 2, 'PLACED', true, 'nebula_admin'),
  ('6fbe1f55-12d2-5e49-94eb-9f6e6963e9b9'::uuid, 'dd3531c2-e635-5d58-94b6-5807f422be59'::uuid, 'c1bb8c46-17ef-52b3-9b44-beedc92ba30f'::uuid, 1, 'PENDING', false, 'nebula_admin'),
  ('0d31c4c9-3bbd-569e-9995-3a3234fc17fc'::uuid, 'dd3531c2-e635-5d58-94b6-5807f422be59'::uuid, '5bd806c0-056d-5291-adf0-0847ea2faf8d'::uuid, 2, 'PENDING', false, 'nebula_admin'),
  ('498c9150-e978-571d-85b1-1b26b404feb7'::uuid, 'e2a32507-3ec1-51eb-8c90-45431bc8b497'::uuid, '5bd806c0-056d-5291-adf0-0847ea2faf8d'::uuid, 1, 'PENDING', false, 'nebula_admin'),
  ('8df0e05a-f455-54ce-9cd2-4d7b33e85856'::uuid, 'e2a32507-3ec1-51eb-8c90-45431bc8b497'::uuid, 'f226aa35-0d02-57af-b75b-49dab61ffb6d'::uuid, 2, 'PENDING', false, 'nebula_admin'),
  ('5985a93c-eb20-5e55-b7ef-f58fe1382061'::uuid, 'ea618f2f-5f2a-5ad9-938f-ab9cccb1734e'::uuid, 'f226aa35-0d02-57af-b75b-49dab61ffb6d'::uuid, 1, 'PLACED', true, 'nebula_admin'),
  ('81e5ced2-acbe-5040-84a3-ba7901c6f088'::uuid, 'ea618f2f-5f2a-5ad9-938f-ab9cccb1734e'::uuid, '5fcb49a4-14d7-592f-a54b-bd8b273a31b4'::uuid, 2, 'PLACED', true, 'nebula_admin'),
  ('4afbf777-1a3a-5647-8a84-b3164823bffa'::uuid, '8ec2ca07-f9e8-5968-93d5-80400f4eb14e'::uuid, '5fcb49a4-14d7-592f-a54b-bd8b273a31b4'::uuid, 1, 'PENDING', false, 'nebula_admin'),
  ('1b3e59bc-7f87-5bed-9cf8-ad8fccaaa9b4'::uuid, '8ec2ca07-f9e8-5968-93d5-80400f4eb14e'::uuid, 'f42c2569-1850-5f81-a349-d80040adbb32'::uuid, 2, 'PENDING', false, 'nebula_admin'),
  ('d21cd1b7-39a6-589b-b90b-2ed8c634cec2'::uuid, 'efac8dd4-539b-59cd-a811-612a55b5955c'::uuid, 'f42c2569-1850-5f81-a349-d80040adbb32'::uuid, 1, 'PENDING', false, 'nebula_admin'),
  ('936c5bfc-4e01-53c9-b665-439850982e67'::uuid, 'efac8dd4-539b-59cd-a811-612a55b5955c'::uuid, 'a234aac9-282e-5a4d-897c-7aa4c92ba520'::uuid, 2, 'PENDING', false, 'nebula_admin'),
  ('cc2a0bac-1005-5843-9029-093fde99a308'::uuid, 'a78a2f9f-6030-59fe-ab7d-657bdbc3e0b6'::uuid, 'a234aac9-282e-5a4d-897c-7aa4c92ba520'::uuid, 1, 'PLACED', true, 'nebula_admin'),
  ('0d6e3c06-0136-57b1-beef-7c6fc715602a'::uuid, 'a78a2f9f-6030-59fe-ab7d-657bdbc3e0b6'::uuid, 'c1bb8c46-17ef-52b3-9b44-beedc92ba30f'::uuid, 2, 'PLACED', true, 'nebula_admin')
) as v(id, order_id, product_id, quantity, status, attended, seed_key)
join tf_seed.auth_map a on a.seed_key = v.seed_key
on conflict (id) do update set
  order_id = excluded.order_id,
  product_id = excluded.product_id,
  quantity = excluded.quantity,
  status = excluded.status,
  attended = excluded.attended,
  created_by = excluded.created_by,
  updated_at = now();

-- Post-seed sanity (expected per company: 2/12/6/12 orders with 8 OPEN + 4 CLOSED / 24 items)
select c.name,
       count(distinct fp.id) as plans,
       count(distinct t.id) as tables,
       count(distinct p.id) as products,
       count(distinct o.id) as orders,
       count(distinct oi.id) as order_items,
       count(distinct o.id) filter (where o.status = 'OPEN') as open_orders,
       count(distinct o.id) filter (where o.status = 'CLOSED') as closed_orders
from public.companies c
left join public.floor_plans fp on fp.company_id = c.id
left join public.tables t on t.floor_plan_id = fp.id
left join public.products p on p.company_id = c.id
left join public.orders o on o.table_id = t.id
left join public.order_items oi on oi.order_id = o.id
where c.id in (
  '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid,
  'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid,
  '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid
)
group by c.name
order by c.name;

drop table if exists tf_seed.auth_map;
drop table if exists tf_seed.categories;

-- ROLLBACK helper (staging only; Auth users via Dashboard/Admin API):
-- delete order_items/orders/tables/floor_plans/products/profiles/companies
-- scoped by the three fixture company ids above.
