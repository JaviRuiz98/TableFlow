-- =============================================================================
-- SEED DEMO — tenant "empresa" (ADMIN fjrh98-2@hotmail.com)
-- company_id: 4e26ac13-b3e6-4ef3-ad7f-47a5b0fcafe3
-- admin:      889f62b6-dd97-446d-b2a1-9355fe4c09c2
--
-- • Catálogo 6 productos
-- • ~30 jornadas closed (últimos 30 días) con productos en cada mesa
-- • 1 jornada open «en curso» con ventana 24h desde now() (Europe/Madrid)
-- • 3 jornadas scheduled futuras: solo reserved, SIN pedidos
-- Idempotente por UUID determinista (md5).
-- =============================================================================

create schema if not exists tf_seed;

do $$
declare
  v_company uuid := '4e26ac13-b3e6-4ef3-ad7f-47a5b0fcafe3';
  v_admin   uuid := '889f62b6-dd97-446d-b2a1-9355fe4c09c2';
  v_cat_bebidas uuid;
  v_cat_botellas uuid;
  v_cat_coctel uuid;
  v_madrid_now timestamp;
  v_open_time time;
  v_open_date date;
  v_day date;
  v_plan uuid;
  v_t1 uuid; v_t2 uuid; v_t3 uuid; v_t4 uuid; v_r101 uuid;
  v_o uuid;
  v_prod uuid[];
  v_i int;
  v_future date;
  v_name text;
begin
  select id into v_cat_bebidas from public.product_categories where name = 'Bebidas' limit 1;
  select id into v_cat_botellas from public.product_categories where name = 'Botellas' limit 1;
  select id into v_cat_coctel from public.product_categories where name = 'Coctelería' limit 1;

  if v_cat_bebidas is null or v_cat_botellas is null or v_cat_coctel is null then
    raise exception 'Faltan categorías Bebidas/Botellas/Coctelería';
  end if;

  -- Configuración inicial completa (salta onboarding)
  update public.companies
  set
    onboarding_plan_done = true,
    onboarding_products_done = true,
    onboarding_users_done = true
  where id = v_company;

  -- Products
  insert into public.products (id, company_id, category_id, name, price, active, created_at, updated_at)
  values
    (md5('emp-prod-agua')::uuid, v_company, v_cat_bebidas, 'Agua mineral', 3, true, now(), now()),
    (md5('emp-prod-refresco')::uuid, v_company, v_cat_bebidas, 'Refresco', 4, true, now(), now()),
    (md5('emp-prod-cerveza')::uuid, v_company, v_cat_bebidas, 'Cerveza', 5, true, now(), now()),
    (md5('emp-prod-gintonic')::uuid, v_company, v_cat_coctel, 'Gin tonic', 12, true, now(), now()),
    (md5('emp-prod-mojito')::uuid, v_company, v_cat_coctel, 'Mojito', 11, true, now(), now()),
    (md5('emp-prod-botella')::uuid, v_company, v_cat_botellas, 'Botella premium', 110, true, now(), now())
  on conflict (id) do update set
    company_id = excluded.company_id,
    category_id = excluded.category_id,
    name = excluded.name,
    price = excluded.price,
    active = true,
    updated_at = now();

  v_prod := array[
    md5('emp-prod-agua')::uuid,
    md5('emp-prod-refresco')::uuid,
    md5('emp-prod-cerveza')::uuid,
    md5('emp-prod-gintonic')::uuid,
    md5('emp-prod-mojito')::uuid,
    md5('emp-prod-botella')::uuid
  ];

  v_madrid_now := timezone('Europe/Madrid', now());
  v_open_date := (v_madrid_now)::date;
  v_open_time := (v_madrid_now)::time;

  -- Wipe previous demo plans for this company (orders cascade via tables? check FKs)
  -- Delete order_items → orders → tables → floor_plan_elements → floor_plans for this company
  delete from public.order_items oi
  using public.orders o, public.tables t, public.floor_plans fp
  where oi.order_id = o.id and o.table_id = t.id and t.floor_plan_id = fp.id
    and fp.company_id = v_company;

  delete from public.orders o
  using public.tables t, public.floor_plans fp
  where o.table_id = t.id and t.floor_plan_id = fp.id and fp.company_id = v_company;

  delete from public.tables t
  using public.floor_plans fp
  where t.floor_plan_id = fp.id and fp.company_id = v_company;

  delete from public.floor_plan_elements e
  using public.floor_plans fp
  where e.floor_plan_id = fp.id and fp.company_id = v_company;

  delete from public.floor_plans where company_id = v_company;

  -- Bypass trg_floor_plans_enforce_company_id: requires auth.uid() (app session).
  alter table public.floor_plans disable trigger trg_floor_plans_enforce_company_id;

  -- ========== Past 30 days (closed) ==========
  for v_day in
    select generate_series(v_open_date - 30, v_open_date - 1, interval '1 day')::date
  loop
    v_plan := md5('emp-plan-closed-' || v_day::text)::uuid;
    v_t1 := md5('emp-t1-' || v_day::text)::uuid;
    v_t2 := md5('emp-t2-' || v_day::text)::uuid;
    v_t3 := md5('emp-t3-' || v_day::text)::uuid;
    v_t4 := md5('emp-t4-' || v_day::text)::uuid;
    v_r101 := md5('emp-r101-' || v_day::text)::uuid;

    insert into public.floor_plans (
      id, company_id, name, width, height, is_active, is_locked,
      opening_date, opens_at, closes_at, closes_next_day, status,
      created_at, updated_at
    ) values (
      v_plan, v_company,
      'Apertura ' || to_char(v_day, 'DD Mon'),
      2000, 1200, false, true,
      v_day, time '22:00', time '06:00', true, 'closed',
      v_day + time '22:00', v_day + time '22:00'
    );

    insert into public.tables (
      id, floor_plan_id, type, number, x, y, width, height, rotation, shape,
      attended, reserved, observation, created_at, updated_at
    ) values
      (v_t1, v_plan, 'TABLE', 1, 120, 120, 100, 100, 0, 'circle', true, true, null, now(), now()),
      (v_t2, v_plan, 'TABLE', 2, 280, 120, 100, 100, 0, 'circle', true, true, null, now(), now()),
      (v_t3, v_plan, 'TABLE', 3, 440, 120, 100, 100, 0, 'circle', true, true, null, now(), now()),
      (v_t4, v_plan, 'TABLE', 4, 600, 120, 100, 100, 0, 'circle', true, false, null, now(), now()),
      (v_r101, v_plan, 'RESERVED', 101, 120, 420, 140, 90, 0, 'rectangle', true, true, null, now(), now());

    -- One CLOSED order + PLACED items per table (productos en cada mesa)
    foreach v_i in array array[1,2,3,4,5]
    loop
      v_o := md5('emp-ord-closed-' || v_day::text || '-' || v_i::text)::uuid;
      insert into public.orders (id, table_id, created_by, status, created_at, updated_at)
      values (
        v_o,
        case v_i when 1 then v_t1 when 2 then v_t2 when 3 then v_t3 when 4 then v_t4 else v_r101 end,
        v_admin, 'CLOSED',
        v_day + time '23:00', v_day + interval '1 day' + time '01:00'
      );
      insert into public.order_items (
        id, order_id, product_id, quantity, status, attended, created_by, placed_by, placed_at, created_at, updated_at
      ) values
        (
          md5('emp-oi-c-' || v_day::text || '-' || v_i::text || '-a')::uuid,
          v_o, v_prod[1 + ((v_i + extract(dow from v_day)::int) % 6)],
          1 + (v_i % 3), 'PLACED', true, v_admin, v_admin,
          v_day + interval '1 day' + time '00:30',
          v_day + time '23:10', v_day + interval '1 day' + time '00:30'
        ),
        (
          md5('emp-oi-c-' || v_day::text || '-' || v_i::text || '-b')::uuid,
          v_o, v_prod[1 + ((v_i + 2) % 6)],
          1 + ((v_i + 1) % 2), 'PLACED', true, v_admin, v_admin,
          v_day + interval '1 day' + time '00:45',
          v_day + time '23:20', v_day + interval '1 day' + time '00:45'
        );
    end loop;
  end loop;

  -- ========== Open jornada (24h from now) ==========
  v_plan := md5('emp-plan-open-now')::uuid;
  v_t1 := md5('emp-open-t1')::uuid;
  v_t2 := md5('emp-open-t2')::uuid;
  v_t3 := md5('emp-open-t3')::uuid;
  v_t4 := md5('emp-open-t4')::uuid;
  v_r101 := md5('emp-open-r101')::uuid;

  insert into public.floor_plans (
    id, company_id, name, width, height, is_active, is_locked,
    opening_date, opens_at, closes_at, closes_next_day, status,
    created_at, updated_at
  ) values (
    v_plan, v_company, 'En curso (24h)',
    2000, 1200, true, false,
    v_open_date, v_open_time, v_open_time, true, 'open',
    now(), now()
  );

  insert into public.tables (
    id, floor_plan_id, type, number, x, y, width, height, rotation, shape,
    attended, reserved, observation, created_at, updated_at
  ) values
    -- 1 atendida, 2 pendiente, 3 atendida, 4 pendiente, 101 atendido — todos con productos
    (v_t1, v_plan, 'TABLE', 1, 120, 120, 100, 100, 0, 'circle', true, true, null, now(), now()),
    (v_t2, v_plan, 'TABLE', 2, 280, 120, 100, 100, 0, 'circle', false, true, null, now(), now()),
    (v_t3, v_plan, 'TABLE', 3, 440, 120, 100, 100, 0, 'circle', true, true, null, now(), now()),
    (v_t4, v_plan, 'TABLE', 4, 600, 120, 100, 100, 0, 'circle', false, true, 'VIP llegada 23h', now(), now()),
    (v_r101, v_plan, 'RESERVED', 101, 120, 420, 140, 90, 0, 'rectangle', true, true, null, now(), now());

  -- Mesa 1 CLOSED attended
  v_o := md5('emp-open-ord-1')::uuid;
  insert into public.orders values (v_o, v_t1, v_admin, 'CLOSED', now() - interval '40 minutes', now() - interval '10 minutes');
  insert into public.order_items (id, order_id, product_id, quantity, status, attended, created_by, placed_by, placed_at, created_at, updated_at)
  values
    (md5('emp-open-oi-1a')::uuid, v_o, v_prod[6], 1, 'PLACED', true, v_admin, v_admin, now() - interval '10 minutes', now() - interval '40 minutes', now()),
    (md5('emp-open-oi-1b')::uuid, v_o, v_prod[4], 2, 'PLACED', true, v_admin, v_admin, now() - interval '10 minutes', now() - interval '35 minutes', now());

  -- Mesa 2 OPEN pending (rojo)
  v_o := md5('emp-open-ord-2')::uuid;
  insert into public.orders values (v_o, v_t2, v_admin, 'OPEN', now() - interval '15 minutes', now() - interval '15 minutes');
  insert into public.order_items (id, order_id, product_id, quantity, status, attended, created_by, placed_by, placed_at, created_at, updated_at)
  values
    (md5('emp-open-oi-2a')::uuid, v_o, v_prod[4], 2, 'PENDING', false, v_admin, null, null, now() - interval '15 minutes', now()),
    (md5('emp-open-oi-2b')::uuid, v_o, v_prod[3], 4, 'PENDING', false, v_admin, null, null, now() - interval '14 minutes', now());

  -- Mesa 3 CLOSED attended
  v_o := md5('emp-open-ord-3')::uuid;
  insert into public.orders values (v_o, v_t3, v_admin, 'CLOSED', now() - interval '50 minutes', now() - interval '20 minutes');
  insert into public.order_items (id, order_id, product_id, quantity, status, attended, created_by, placed_by, placed_at, created_at, updated_at)
  values
    (md5('emp-open-oi-3a')::uuid, v_o, v_prod[5], 3, 'PLACED', true, v_admin, v_admin, now() - interval '20 minutes', now() - interval '50 minutes', now()),
    (md5('emp-open-oi-3b')::uuid, v_o, v_prod[2], 2, 'PLACED', true, v_admin, v_admin, now() - interval '20 minutes', now() - interval '45 minutes', now());

  -- Mesa 4 OPEN pending
  v_o := md5('emp-open-ord-4')::uuid;
  insert into public.orders values (v_o, v_t4, v_admin, 'OPEN', now() - interval '8 minutes', now() - interval '8 minutes');
  insert into public.order_items (id, order_id, product_id, quantity, status, attended, created_by, placed_by, placed_at, created_at, updated_at)
  values
    (md5('emp-open-oi-4a')::uuid, v_o, v_prod[6], 1, 'PENDING', false, v_admin, null, null, now() - interval '8 minutes', now()),
    (md5('emp-open-oi-4b')::uuid, v_o, v_prod[2], 3, 'PENDING', false, v_admin, null, null, now() - interval '7 minutes', now());

  -- Reservado 101 CLOSED attended
  v_o := md5('emp-open-ord-101')::uuid;
  insert into public.orders values (v_o, v_r101, v_admin, 'CLOSED', now() - interval '30 minutes', now() - interval '5 minutes');
  insert into public.order_items (id, order_id, product_id, quantity, status, attended, created_by, placed_by, placed_at, created_at, updated_at)
  values
    (md5('emp-open-oi-101a')::uuid, v_o, v_prod[5], 3, 'PLACED', true, v_admin, v_admin, now() - interval '5 minutes', now() - interval '30 minutes', now()),
    (md5('emp-open-oi-101b')::uuid, v_o, v_prod[1], 2, 'PLACED', true, v_admin, v_admin, now() - interval '5 minutes', now() - interval '28 minutes', now());

  -- ========== Future scheduled (reservas only, sin botellas) ==========
  foreach v_future in array array[
    (v_open_date + 2),
    (v_open_date + 5),
    (v_open_date + 12)
  ]
  loop
    v_plan := md5('emp-plan-future-' || v_future::text)::uuid;
    v_t1 := md5('emp-fut-t1-' || v_future::text)::uuid;
    v_t2 := md5('emp-fut-t2-' || v_future::text)::uuid;
    v_t3 := md5('emp-fut-t3-' || v_future::text)::uuid;
    v_t4 := md5('emp-fut-t4-' || v_future::text)::uuid;
    v_r101 := md5('emp-fut-r101-' || v_future::text)::uuid;
    v_name := 'Próxima ' || to_char(v_future, 'DD Mon');

    insert into public.floor_plans (
      id, company_id, name, width, height, is_active, is_locked,
      opening_date, opens_at, closes_at, closes_next_day, status,
      created_at, updated_at
    ) values (
      v_plan, v_company, v_name,
      2000, 1200, false, false,
      v_future, time '22:00', time '06:00', true, 'scheduled',
      now(), now()
    );

    insert into public.tables (
      id, floor_plan_id, type, number, x, y, width, height, rotation, shape,
      attended, reserved, observation, created_at, updated_at
    ) values
      (v_t1, v_plan, 'TABLE', 1, 120, 120, 100, 100, 0, 'circle', false, true, null, now(), now()),
      (v_t2, v_plan, 'TABLE', 2, 280, 120, 100, 100, 0, 'circle', false, true, null, now(), now()),
      (v_t3, v_plan, 'TABLE', 3, 440, 120, 100, 100, 0, 'circle', false, false, null, now(), now()),
      (v_t4, v_plan, 'TABLE', 4, 600, 120, 100, 100, 0, 'circle', false, true, null, now(), now()),
      (v_r101, v_plan, 'RESERVED', 101, 120, 420, 140, 90, 0, 'rectangle', false, true, 'Reserva grupo', now(), now());
    -- sin orders a propósito
  end loop;

  alter table public.floor_plans enable trigger trg_floor_plans_enforce_company_id;

  raise notice 'SEED empresa demo OK. open_date=% opens_at=% (24h closes_next_day)', v_open_date, v_open_time;
exception
  when others then
    alter table public.floor_plans enable trigger trg_floor_plans_enforce_company_id;
    raise;
end $$;
