-- =============================================================================
-- 0028_operational_tenant_rls.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- STATUS: READY FOR OPERATOR REVIEW — DO NOT APPLY UNTIL EXPLICITLY AUTHORIZED.
-- Requires: 0027_floor_plans_company_id.sql (company_id + current_company_id).
--
-- Goal: replace open authenticated SELECT/WRITE on operational tables with
-- tenant predicates via floor_plans.company_id joins.
-- Does NOT add company_id to tables/orders/order_items/reservations/elements.
-- =============================================================================

-- Prefer resolving floor_plans orphans (company_id null) before apply.
do $$
declare
  v_orphans integer;
begin
  select count(*) into v_orphans
    from public.floor_plans
   where company_id is null;
  if v_orphans > 0 then
    raise notice
      '0028 WARNING: % floor_plans still have company_id null — they will be invisible under new RLS.',
      v_orphans;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.floor_plan_belongs_to_current_company(p_floor_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.floor_plans fp
     where fp.id = p_floor_plan_id
       and fp.company_id is not null
       and fp.company_id = public.current_company_id()
  );
$$;

create or replace function public.table_belongs_to_current_company(p_table_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.tables t
      join public.floor_plans fp on fp.id = t.floor_plan_id
     where t.id = p_table_id
       and fp.company_id is not null
       and fp.company_id = public.current_company_id()
  );
$$;

revoke all on function public.floor_plan_belongs_to_current_company(uuid) from public;
revoke all on function public.table_belongs_to_current_company(uuid) from public;
grant execute on function public.floor_plan_belongs_to_current_company(uuid) to authenticated;
grant execute on function public.table_belongs_to_current_company(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- floor_plans — already scoped in 0027; recreate idempotently
-- -----------------------------------------------------------------------------
drop policy if exists plans_auth_select on public.floor_plans;
drop policy if exists plans_admin_insert on public.floor_plans;
drop policy if exists plans_admin_update on public.floor_plans;
drop policy if exists plans_admin_delete on public.floor_plans;

create policy plans_company_select on public.floor_plans
  for select to authenticated
  using (
    company_id is not null
    and company_id = public.current_company_id()
  );

create policy plans_admin_company_insert on public.floor_plans
  for insert to authenticated
  with check (
    public.is_admin()
    and company_id is not null
    and company_id = public.current_company_id()
  );

create policy plans_admin_company_update on public.floor_plans
  for update to authenticated
  using (
    public.is_admin()
    and company_id is not null
    and company_id = public.current_company_id()
  )
  with check (
    public.is_admin()
    and company_id is not null
    and company_id = public.current_company_id()
  );

create policy plans_admin_company_delete on public.floor_plans
  for delete to authenticated
  using (
    public.is_admin()
    and company_id is not null
    and company_id = public.current_company_id()
  );

-- -----------------------------------------------------------------------------
-- floor_plan_elements
-- -----------------------------------------------------------------------------
drop policy if exists elements_auth_select on public.floor_plan_elements;
drop policy if exists elements_admin_write on public.floor_plan_elements;
drop policy if exists elements_manager_write on public.floor_plan_elements;

create policy elements_company_select on public.floor_plan_elements
  for select to authenticated
  using (public.floor_plan_belongs_to_current_company(floor_plan_id));

create policy elements_admin_company_write on public.floor_plan_elements
  for all to authenticated
  using (
    public.is_admin()
    and public.floor_plan_belongs_to_current_company(floor_plan_id)
  )
  with check (
    public.is_admin()
    and public.floor_plan_belongs_to_current_company(floor_plan_id)
  );

-- -----------------------------------------------------------------------------
-- tables
-- -----------------------------------------------------------------------------
drop policy if exists tables_auth_select on public.tables;
drop policy if exists tables_admin_write on public.tables;
drop policy if exists tables_manager_write on public.tables;

create policy tables_company_select on public.tables
  for select to authenticated
  using (public.floor_plan_belongs_to_current_company(floor_plan_id));

create policy tables_admin_company_write on public.tables
  for all to authenticated
  using (
    public.is_admin()
    and public.floor_plan_belongs_to_current_company(floor_plan_id)
  )
  with check (
    public.is_admin()
    and public.floor_plan_belongs_to_current_company(floor_plan_id)
  );

-- -----------------------------------------------------------------------------
-- reservations (legacy; same join path)
-- -----------------------------------------------------------------------------
drop policy if exists reservations_auth_select on public.reservations;
drop policy if exists reservations_admin_write on public.reservations;

create policy reservations_company_select on public.reservations
  for select to authenticated
  using (public.table_belongs_to_current_company(table_id));

create policy reservations_admin_company_write on public.reservations
  for all to authenticated
  using (
    public.is_admin()
    and public.table_belongs_to_current_company(table_id)
  )
  with check (
    public.is_admin()
    and public.table_belongs_to_current_company(table_id)
  );

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------
drop policy if exists orders_auth_select on public.orders;
drop policy if exists orders_auth_insert on public.orders;
drop policy if exists orders_manager_update on public.orders;
drop policy if exists orders_manager_delete on public.orders;
drop policy if exists orders_admin_insert on public.orders;
drop policy if exists orders_admin_update on public.orders;
drop policy if exists orders_admin_delete on public.orders;

create policy orders_company_select on public.orders
  for select to authenticated
  using (public.table_belongs_to_current_company(table_id));

create policy orders_admin_company_insert on public.orders
  for insert to authenticated
  with check (
    public.is_admin()
    and created_by = auth.uid()
    and public.table_belongs_to_current_company(table_id)
  );

create policy orders_admin_company_update on public.orders
  for update to authenticated
  using (
    public.is_admin()
    and public.table_belongs_to_current_company(table_id)
  )
  with check (
    public.is_admin()
    and public.table_belongs_to_current_company(table_id)
  );

create policy orders_admin_company_delete on public.orders
  for delete to authenticated
  using (
    public.is_admin()
    and public.table_belongs_to_current_company(table_id)
  );

-- -----------------------------------------------------------------------------
-- order_items
-- -----------------------------------------------------------------------------
drop policy if exists items_auth_select on public.order_items;
drop policy if exists items_auth_insert on public.order_items;
drop policy if exists items_update_own_or_manager on public.order_items;
drop policy if exists items_manager_delete on public.order_items;
drop policy if exists items_admin_insert on public.order_items;
drop policy if exists items_admin_update on public.order_items;
drop policy if exists items_admin_delete on public.order_items;

create policy items_company_select on public.order_items
  for select to authenticated
  using (
    exists (
      select 1
        from public.orders o
       where o.id = order_items.order_id
         and public.table_belongs_to_current_company(o.table_id)
    )
  );

create policy items_admin_company_insert on public.order_items
  for insert to authenticated
  with check (
    public.is_admin()
    and created_by = auth.uid()
    and exists (
      select 1
        from public.orders o
       where o.id = order_id
         and public.table_belongs_to_current_company(o.table_id)
    )
  );

create policy items_admin_company_update on public.order_items
  for update to authenticated
  using (
    public.is_admin()
    and exists (
      select 1
        from public.orders o
       where o.id = order_items.order_id
         and public.table_belongs_to_current_company(o.table_id)
    )
  )
  with check (
    public.is_admin()
    and exists (
      select 1
        from public.orders o
       where o.id = order_id
         and public.table_belongs_to_current_company(o.table_id)
    )
  );

create policy items_admin_company_delete on public.order_items
  for delete to authenticated
  using (
    public.is_admin()
    and exists (
      select 1
        from public.orders o
       where o.id = order_items.order_id
         and public.table_belongs_to_current_company(o.table_id)
    )
  );
