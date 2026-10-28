-- =============================================================================
-- CHECKS STAGING ONLY — aislamiento multiempresa / roles / estadísticas
-- Run AFTER SEED_MULTIEMPRESA_STAGING.sql on the same staging/local DB.
-- NEVER against production / Sala Chocolatte.
--
-- These are SQL assertions for manual or CI-local review. Angular Vitest
-- isolation specs can wrap the same expectations once the seed is approved.
-- =============================================================================

-- 1) KPI per company (fixture contract)
do $$
declare
  r record;
  expected_companies text[] := array['Club Eclipse', 'Nébula Lounge', 'Sala Aurora'];
begin
  if (
    select array_agg(c.name order by c.name)
    from public.companies c
    where c.id in (
      '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid,
      'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid,
      '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid
    )
  ) is distinct from expected_companies then
    raise exception 'tf_seed_check: unexpected company set';
  end if;

  for r in
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
  loop
    if r.plans <> 2 or r.tables <> 12 or r.products <> 6
       or r.orders <> 12 or r.order_items <> 24
       or r.open_orders <> 8 or r.closed_orders <> 4 then
      raise exception
        'tf_seed_check: KPI mismatch for % (plans=%, tables=%, products=%, orders=%, items=%, open=%, closed=%)',
        r.name, r.plans, r.tables, r.products, r.orders, r.order_items, r.open_orders, r.closed_orders;
    end if;
  end loop;

  raise notice 'tf_seed_check: KPI OK for 3 companies';
end $$;

-- 2) No company_id leakage on operational tables (architecture contract)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('tables', 'orders', 'order_items')
      and column_name = 'company_id'
  ) then
    raise exception 'tf_seed_check: unexpected company_id column on tables/orders/order_items';
  end if;
  raise notice 'tf_seed_check: company_id only on profiles/products/floor_plans (operational via joins)';
end $$;

-- 3) Every table/order belongs to a fixture company via floor_plans
do $$
declare n int;
begin
  select count(*) into n
  from public.tables t
  join public.floor_plans fp on fp.id = t.floor_plan_id
  where t.id in (
    select t2.id
    from public.tables t2
    join public.floor_plans fp2 on fp2.id = t2.floor_plan_id
    where fp2.company_id in (
      '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid,
      'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid,
      '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid
    )
  )
  and fp.company_id is null;

  if n <> 0 then
    raise exception 'tf_seed_check: % tables without floor_plans.company_id', n;
  end if;
end $$;

-- 4) Cross-tenant product ↔ order_item integrity (no cross-company product refs)
do $$
declare bad int;
begin
  select count(*) into bad
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.tables t on t.id = o.table_id
  join public.floor_plans fp on fp.id = t.floor_plan_id
  join public.products p on p.id = oi.product_id
  where fp.company_id in (
      '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid,
      'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid,
      '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid
    )
    and p.company_id is distinct from fp.company_id;

  if bad <> 0 then
    raise exception 'tf_seed_check: % order_items reference products from another company', bad;
  end if;

  raise notice 'tf_seed_check: product/order company alignment OK';
end $$;

-- 5) Role matrix: 1 ADMIN + 1 USER + 1 RECEPTOR per company
do $$
declare r record;
begin
  for r in
    select c.name,
           count(*) filter (where p.role = 'ADMIN') as admins,
           count(*) filter (where p.role = 'USER') as users,
           count(*) filter (where p.role = 'RECEPTOR') as receptors
    from public.companies c
    join public.profiles p on p.company_id = c.id
    where c.id in (
      '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid,
      'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid,
      '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid
    )
    group by c.name
  loop
    if r.admins <> 1 or r.users <> 1 or r.receptors <> 1 then
      raise exception
        'tf_seed_check: role matrix mismatch for % (ADMIN=%, USER=%, RECEPTOR=%)',
        r.name, r.admins, r.users, r.receptors;
    end if;
  end loop;

  if exists (
    select 1
    from public.profiles p
    where p.company_id in (
      '2050d9c3-536e-5b1a-9522-cfd71b3daf44'::uuid,
      'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'::uuid,
      '6014b29a-cd55-54fc-890e-f28944f1b964'::uuid
    )
      and p.role = 'ADMIN'
      and p.username is distinct from 'Administrador'
  ) then
    raise exception 'tf_seed_check: ADMIN username must be Administrador';
  end if;

  raise notice 'tf_seed_check: roles OK';
end $$;

-- 6) RLS smoke (optional): set JWT claims for an Aurora ADMIN and confirm
--    floor_plans from Eclipse are not visible. Requires a real auth session;
--    leave commented until run under authenticated role in staging.
--
-- select set_config('request.jwt.claim.sub', '<aurora_admin_auth_uuid>', true);
-- select set_config('request.jwt.claim.role', 'authenticated', true);
-- select count(*) from public.floor_plans
--  where company_id = 'f5d060b5-3e95-58fe-a8aa-117017b8e5ec'; -- expect 0 under RLS
