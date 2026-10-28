-- =============================================================================
-- SEED DEV — datos de ejemplo para Sala Chocolatte (empresa ya existente)
-- ADMIN: fjrh98@gmail.com (no crea auth.users)
-- company_id: 11b17658-8f9f-4c31-9e30-25badcf25a8f
-- Idempotente por UUID fijo. Staging/dev only.
-- =============================================================================

-- Resolve categories by name
create schema if not exists tf_seed;
drop table if exists tf_seed.choc_cat;
create table tf_seed.choc_cat (label text primary key, category_id uuid not null);
insert into tf_seed.choc_cat (label, category_id)
select c.name, c.id
from public.product_categories c
where c.name in ('Bebidas', 'Botellas', 'Coctelería');

-- Products (6) for Sala Chocolatte
insert into public.products (id, company_id, category_id, name, price, active, created_at, updated_at)
select v.id, '11b17658-8f9f-4c31-9e30-25badcf25a8f'::uuid, cat.category_id, v.name, v.price, true, now(), now()
from (values
  ('c75733eb-de3d-5de6-b89a-c0528a20062d'::uuid, 'Bebidas', 'Agua mineral', 3::numeric),
  ('4ee4202a-ca4f-5ee3-90cb-b173fa3b5a0e'::uuid, 'Bebidas', 'Refresco', 4::numeric),
  ('2d26c92f-43da-57a5-8668-48780c018563'::uuid, 'Bebidas', 'Cerveza', 5::numeric),
  ('3d856a9c-1aa3-5811-b1a7-a7fd4d35c256'::uuid, 'Coctelería', 'Gin tonic', 12::numeric),
  ('75d2a689-05a8-5345-bcdd-16c4a8f888d7'::uuid, 'Coctelería', 'Mojito', 11::numeric),
  ('03648900-62b2-5c20-8e6e-0824bc48cfc6'::uuid, 'Botellas', 'Botella premium', 110::numeric)
) as v(id, category_label, name, price)
join tf_seed.choc_cat cat on cat.label = v.category_label
on conflict (id) do update set
  company_id = excluded.company_id,
  category_id = excluded.category_id,
  name = excluded.name,
  price = excluded.price,
  active = true,
  updated_at = now();

-- Second plan (existing "sala 1" kept)
alter table public.floor_plans disable trigger trg_floor_plans_enforce_company_id;
insert into public.floor_plans (id, company_id, name, width, height, is_active, is_locked, created_at, updated_at)
values (
  '5d537d2d-931b-5334-8708-d0543ad9ec05'::uuid,
  '11b17658-8f9f-4c31-9e30-25badcf25a8f'::uuid,
  'Zona VIP', 2000, 1200, false, false, now(), now()
)
on conflict (id) do update set
  company_id = excluded.company_id,
  name = excluded.name,
  updated_at = now();
alter table public.floor_plans enable trigger trg_floor_plans_enforce_company_id;

-- 12 tables: 6 on sala 1 + 6 on Zona VIP
insert into public.tables (
  id, floor_plan_id, type, number, x, y, width, height, rotation, shape, attended, observation, created_at, updated_at
)
values
  -- sala 1
  ('655f85bf-a160-5a71-b515-9ddf2f412bb1'::uuid, 'da0f7005-8b5b-499d-9629-486342e6fcea'::uuid, 'TABLE'::public.table_type, 1, 120, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('b0bffc55-7e26-5843-afa0-bf377d8c565b'::uuid, 'da0f7005-8b5b-499d-9629-486342e6fcea'::uuid, 'TABLE'::public.table_type, 2, 280, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('d5ee6726-2b9a-5a9b-b990-eeb030038184'::uuid, 'da0f7005-8b5b-499d-9629-486342e6fcea'::uuid, 'TABLE'::public.table_type, 3, 440, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('df15d3ca-7207-5dcd-9f6e-41e44a063167'::uuid, 'da0f7005-8b5b-499d-9629-486342e6fcea'::uuid, 'TABLE'::public.table_type, 4, 600, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('7494bbbe-6ff8-5c37-8ff2-fc2dd7ab4012'::uuid, 'da0f7005-8b5b-499d-9629-486342e6fcea'::uuid, 'RESERVED'::public.table_type, 101, 120, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now()),
  ('b2080ac4-81a3-55d1-8a8a-5117b638830e'::uuid, 'da0f7005-8b5b-499d-9629-486342e6fcea'::uuid, 'RESERVED'::public.table_type, 102, 280, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now()),
  -- Zona VIP
  ('c632e92c-c4cf-5637-b916-3468bdc6b9e2'::uuid, '5d537d2d-931b-5334-8708-d0543ad9ec05'::uuid, 'TABLE'::public.table_type, 1, 120, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('0f9eccba-dff2-5f9e-9a13-16512cb16988'::uuid, '5d537d2d-931b-5334-8708-d0543ad9ec05'::uuid, 'TABLE'::public.table_type, 2, 280, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('90ee76e8-bdeb-5fd1-aefc-af3ea9d23477'::uuid, '5d537d2d-931b-5334-8708-d0543ad9ec05'::uuid, 'TABLE'::public.table_type, 3, 440, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('84f05c46-4d36-5b9e-a2ed-6a9f12699b1e'::uuid, '5d537d2d-931b-5334-8708-d0543ad9ec05'::uuid, 'TABLE'::public.table_type, 4, 600, 120, 100, 100, 0, 'circle'::public.table_shape, false, null, now(), now()),
  ('637616fd-c318-5313-8ccb-ce483cc51121'::uuid, '5d537d2d-931b-5334-8708-d0543ad9ec05'::uuid, 'RESERVED'::public.table_type, 101, 120, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now()),
  ('ade09d2b-6246-5b34-88e7-407e4aeac1bc'::uuid, '5d537d2d-931b-5334-8708-d0543ad9ec05'::uuid, 'RESERVED'::public.table_type, 102, 280, 420, 140, 90, 0, 'rectangle'::public.table_shape, false, null, now(), now())
on conflict (id) do update set
  floor_plan_id = excluded.floor_plan_id,
  type = excluded.type,
  number = excluded.number,
  x = excluded.x, y = excluded.y, width = excluded.width, height = excluded.height,
  rotation = excluded.rotation, shape = excluded.shape,
  updated_at = now();

-- 12 orders (created_by = fjrh98 ADMIN). Pattern: OPEN,OPEN,CLOSED ×4
insert into public.orders (id, table_id, created_by, status, created_at, updated_at)
values
  ('5273be87-e4ce-5e0f-87f6-0ba41e416634'::uuid, '655f85bf-a160-5a71-b515-9ddf2f412bb1'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'OPEN'::public.order_status, '2026-10-21T19:00:00+00:00', '2026-10-21T19:00:00+00:00'),
  ('49bcc326-45f3-5c83-9dbe-d2bc1ead057e'::uuid, 'b0bffc55-7e26-5843-afa0-bf377d8c565b'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'OPEN'::public.order_status, '2026-10-22T20:00:00+00:00', '2026-10-22T20:00:00+00:00'),
  ('7837061a-5693-5145-9f5f-69c84fb4c68b'::uuid, 'd5ee6726-2b9a-5a9b-b990-eeb030038184'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'CLOSED'::public.order_status, '2026-10-23T21:00:00+00:00', '2026-10-23T21:00:00+00:00'),
  ('fc0299c9-2cfb-5448-a774-7ec6ec55f132'::uuid, 'df15d3ca-7207-5dcd-9f6e-41e44a063167'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'OPEN'::public.order_status, '2026-10-24T22:00:00+00:00', '2026-10-24T22:00:00+00:00'),
  ('9625b641-f295-5965-bc4d-26f970405ba8'::uuid, '7494bbbe-6ff8-5c37-8ff2-fc2dd7ab4012'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'OPEN'::public.order_status, '2026-10-20T23:00:00+00:00', '2026-10-20T23:00:00+00:00'),
  ('008587cd-583c-5b6d-950d-fa5bae151ceb'::uuid, 'b2080ac4-81a3-55d1-8a8a-5117b638830e'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'CLOSED'::public.order_status, '2026-10-22T00:00:00+00:00', '2026-10-22T00:00:00+00:00'),
  ('ce000fde-2745-50eb-8357-191d6d875279'::uuid, 'c632e92c-c4cf-5637-b916-3468bdc6b9e2'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'OPEN'::public.order_status, '2026-10-23T01:00:00+00:00', '2026-10-23T01:00:00+00:00'),
  ('16a7a82c-c2fa-50f3-9e96-8c6322972077'::uuid, '0f9eccba-dff2-5f9e-9a13-16512cb16988'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'OPEN'::public.order_status, '2026-10-24T02:00:00+00:00', '2026-10-24T02:00:00+00:00'),
  ('dfc0e625-5084-52c5-b61c-0ec45fabf2a3'::uuid, '90ee76e8-bdeb-5fd1-aefc-af3ea9d23477'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'CLOSED'::public.order_status, '2026-10-25T03:00:00+00:00', '2026-10-25T03:00:00+00:00'),
  ('ffff1ccf-08bd-5813-a2d3-7540e73bd133'::uuid, '84f05c46-4d36-5b9e-a2ed-6a9f12699b1e'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'OPEN'::public.order_status, '2026-10-21T04:00:00+00:00', '2026-10-21T04:00:00+00:00'),
  ('6be70f6a-8db2-5722-b816-1a8683df7ea1'::uuid, '637616fd-c318-5313-8ccb-ce483cc51121'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'OPEN'::public.order_status, '2026-10-22T05:00:00+00:00', '2026-10-22T05:00:00+00:00'),
  ('e363a129-67e7-5aa7-914f-f41f2e1a8b19'::uuid, 'ade09d2b-6246-5b34-88e7-407e4aeac1bc'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'CLOSED'::public.order_status, '2026-10-23T06:00:00+00:00', '2026-10-23T06:00:00+00:00')
on conflict (id) do update set
  table_id = excluded.table_id,
  created_by = excluded.created_by,
  status = excluded.status,
  updated_at = excluded.created_at;

-- 24 order_items (2 per order). CLOSED orders → PLACED+attended
insert into public.order_items (
  id, order_id, product_id, quantity, status, attended, created_by, placed_by, placed_at, created_at, updated_at
)
values
  ('0a86d1be-75f9-5eea-ba6c-d32a9150b7df'::uuid, '5273be87-e4ce-5e0f-87f6-0ba41e416634'::uuid, '2d26c92f-43da-57a5-8668-48780c018563'::uuid, 1, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('ad6b23e4-9816-5c79-beaa-f3f6badb5c8d'::uuid, '5273be87-e4ce-5e0f-87f6-0ba41e416634'::uuid, '3d856a9c-1aa3-5811-b1a7-a7fd4d35c256'::uuid, 2, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('d3157a72-e26d-5870-acf6-8b30c806554b'::uuid, '49bcc326-45f3-5c83-9dbe-d2bc1ead057e'::uuid, '3d856a9c-1aa3-5811-b1a7-a7fd4d35c256'::uuid, 1, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('cbe14e23-62f0-5c91-8b65-747aa43a905c'::uuid, '49bcc326-45f3-5c83-9dbe-d2bc1ead057e'::uuid, '75d2a689-05a8-5345-bcdd-16c4a8f888d7'::uuid, 2, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('829092f6-fcba-56f9-a570-3a225440d7a4'::uuid, '7837061a-5693-5145-9f5f-69c84fb4c68b'::uuid, '75d2a689-05a8-5345-bcdd-16c4a8f888d7'::uuid, 1, 'PLACED'::public.order_item_status, true, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, now(), now(), now()),
  ('569d1008-6bf3-5d57-b9dd-0b45a7b8cb1a'::uuid, '7837061a-5693-5145-9f5f-69c84fb4c68b'::uuid, '03648900-62b2-5c20-8e6e-0824bc48cfc6'::uuid, 2, 'PLACED'::public.order_item_status, true, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, now(), now(), now()),
  ('163e5b37-4ebb-5897-8559-38ad02127214'::uuid, 'fc0299c9-2cfb-5448-a774-7ec6ec55f132'::uuid, '03648900-62b2-5c20-8e6e-0824bc48cfc6'::uuid, 1, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('9808d490-e23b-58ba-8dbc-f086f09fa47f'::uuid, 'fc0299c9-2cfb-5448-a774-7ec6ec55f132'::uuid, 'c75733eb-de3d-5de6-b89a-c0528a20062d'::uuid, 2, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('b84c9298-97e2-5804-8062-e2f66ebcfec5'::uuid, '9625b641-f295-5965-bc4d-26f970405ba8'::uuid, 'c75733eb-de3d-5de6-b89a-c0528a20062d'::uuid, 1, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('f5ade7db-47eb-5396-940a-9904c8e4747d'::uuid, '9625b641-f295-5965-bc4d-26f970405ba8'::uuid, '4ee4202a-ca4f-5ee3-90cb-b173fa3b5a0e'::uuid, 2, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('2c55b41b-c7c3-5785-9aa4-d3edfedae72b'::uuid, '008587cd-583c-5b6d-950d-fa5bae151ceb'::uuid, '4ee4202a-ca4f-5ee3-90cb-b173fa3b5a0e'::uuid, 1, 'PLACED'::public.order_item_status, true, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, now(), now(), now()),
  ('44b49f92-1a2e-5b4d-a6ae-b0ab32618b27'::uuid, '008587cd-583c-5b6d-950d-fa5bae151ceb'::uuid, '2d26c92f-43da-57a5-8668-48780c018563'::uuid, 2, 'PLACED'::public.order_item_status, true, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, now(), now(), now()),
  ('c594edcc-6d37-5d3e-be0b-b629eedee9fc'::uuid, 'ce000fde-2745-50eb-8357-191d6d875279'::uuid, '2d26c92f-43da-57a5-8668-48780c018563'::uuid, 1, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('a6988de7-a15e-52c3-bba9-b45e9eb5f647'::uuid, 'ce000fde-2745-50eb-8357-191d6d875279'::uuid, '3d856a9c-1aa3-5811-b1a7-a7fd4d35c256'::uuid, 2, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('10844be7-f230-540c-99f7-7ddda8bfb5ff'::uuid, '16a7a82c-c2fa-50f3-9e96-8c6322972077'::uuid, '3d856a9c-1aa3-5811-b1a7-a7fd4d35c256'::uuid, 1, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('750f0617-f82e-5ef3-b355-f6f45322aab6'::uuid, '16a7a82c-c2fa-50f3-9e96-8c6322972077'::uuid, '75d2a689-05a8-5345-bcdd-16c4a8f888d7'::uuid, 2, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('0ec78c43-df26-5185-908f-71799b47b1c8'::uuid, 'dfc0e625-5084-52c5-b61c-0ec45fabf2a3'::uuid, '75d2a689-05a8-5345-bcdd-16c4a8f888d7'::uuid, 1, 'PLACED'::public.order_item_status, true, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, now(), now(), now()),
  ('6fc1b8d7-45dc-5a48-8520-017398d37724'::uuid, 'dfc0e625-5084-52c5-b61c-0ec45fabf2a3'::uuid, '03648900-62b2-5c20-8e6e-0824bc48cfc6'::uuid, 2, 'PLACED'::public.order_item_status, true, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, now(), now(), now()),
  ('e6c9d675-742d-5604-aede-74332856517d'::uuid, 'ffff1ccf-08bd-5813-a2d3-7540e73bd133'::uuid, '03648900-62b2-5c20-8e6e-0824bc48cfc6'::uuid, 1, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('3e151f9f-2038-5a7d-8830-736c3fd13669'::uuid, 'ffff1ccf-08bd-5813-a2d3-7540e73bd133'::uuid, 'c75733eb-de3d-5de6-b89a-c0528a20062d'::uuid, 2, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('c949af98-43bc-591a-b58f-a9da16a595fe'::uuid, '6be70f6a-8db2-5722-b816-1a8683df7ea1'::uuid, 'c75733eb-de3d-5de6-b89a-c0528a20062d'::uuid, 1, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('c2c80cb3-7dd7-5636-85eb-fdd54c63404b'::uuid, '6be70f6a-8db2-5722-b816-1a8683df7ea1'::uuid, '4ee4202a-ca4f-5ee3-90cb-b173fa3b5a0e'::uuid, 2, 'PENDING'::public.order_item_status, false, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, null, null, now(), now()),
  ('5ba2bf4a-925f-50a4-a609-13d8c3c3f59b'::uuid, 'e363a129-67e7-5aa7-914f-f41f2e1a8b19'::uuid, '4ee4202a-ca4f-5ee3-90cb-b173fa3b5a0e'::uuid, 1, 'PLACED'::public.order_item_status, true, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, now(), now(), now()),
  ('844ecbd1-d9cf-5759-9039-9e5bb381c3f7'::uuid, 'e363a129-67e7-5aa7-914f-f41f2e1a8b19'::uuid, '2d26c92f-43da-57a5-8668-48780c018563'::uuid, 2, 'PLACED'::public.order_item_status, true, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, 'f704bd27-3538-4f61-a22e-9fc4a38a4bbe'::uuid, now(), now(), now())
on conflict (id) do update set
  order_id = excluded.order_id,
  product_id = excluded.product_id,
  quantity = excluded.quantity,
  status = excluded.status,
  attended = excluded.attended,
  created_by = excluded.created_by,
  updated_at = now();

drop table if exists tf_seed.choc_cat;

-- Expected: 2 plans, 12 tables, >=6 products, 12 orders (8 OPEN/4 CLOSED), 24 items
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
where c.id = '11b17658-8f9f-4c31-9e30-25badcf25a8f'::uuid
group by c.name;
