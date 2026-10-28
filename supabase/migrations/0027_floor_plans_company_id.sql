-- =============================================================================
-- 0027_floor_plans_company_id.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- STATUS: READY FOR OPERATOR REVIEW — DO NOT APPLY UNTIL EXPLICITLY AUTHORIZED.
-- Prerequisites: public.companies + public.profiles.company_id (0017+).
--
-- Goal:
--   • Add floor_plans.company_id → companies(id)
--   • Backfill only when created_by maps to a profile with company_id
--   • Never assign orphan plans to an arbitrary company
--   • Drop floor_plans.created_by (ownership = company only)
--   • BEFORE INSERT/UPDATE trigger forces company_id = caller's company
--   • Interim RLS without created_by (full tenant RLS in 0028)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Column + FK + index (nullable until orphans are resolved)
-- -----------------------------------------------------------------------------
alter table public.floor_plans
  add column if not exists company_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'floor_plans_company_id_fkey'
      and conrelid = 'public.floor_plans'::regclass
  ) then
    alter table public.floor_plans
      add constraint floor_plans_company_id_fkey
      foreign key (company_id) references public.companies (id);
  end if;
end $$;

create index if not exists floor_plans_company_id_idx
  on public.floor_plans (company_id);

comment on column public.floor_plans.company_id is
  'Tenant owner. Sole ownership key for plans (created_by removed in 0027).';

-- -----------------------------------------------------------------------------
-- 2) Backfill from creator profile — only when company_id is known
-- -----------------------------------------------------------------------------
update public.floor_plans fp
   set company_id = p.company_id
  from public.profiles p
 where fp.created_by = p.id
   and fp.company_id is null
   and p.company_id is not null;

do $$
declare
  v_orphans integer;
  v_sample text;
begin
  select count(*) into v_orphans
    from public.floor_plans
   where company_id is null;

  if v_orphans > 0 then
    select string_agg(id::text || ' (' || name || ')', ', ')
      into v_sample
      from (
        select id, name
          from public.floor_plans
         where company_id is null
         order by created_at
         limit 10
      ) s;

    raise notice
      '0027: % floor_plans without company_id (orphans). Sample: %. Resolve manually before relying on NOT NULL / 0028.',
      v_orphans,
      coalesce(v_sample, '(none)');
  else
    raise notice '0027: all floor_plans backfilled with company_id.';
  end if;
end $$;

-- Optional harden once orphans are zero (commented — enable after manual cleanup):
-- alter table public.floor_plans alter column company_id set not null;

-- -----------------------------------------------------------------------------
-- 3) current_company_id() helper (used by trigger + 0028/0029)
-- -----------------------------------------------------------------------------
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.company_id
    from public.profiles p
   where p.id = auth.uid()
$$;

revoke all on function public.current_company_id() from public;
grant execute on function public.current_company_id() to authenticated;

comment on function public.current_company_id() is
  'Authenticated caller profiles.company_id (null if missing). SECURITY DEFINER for stable RLS/RPC checks.';

-- -----------------------------------------------------------------------------
-- 4) Force company_id on insert/update (never trust client UUID blindly)
-- -----------------------------------------------------------------------------
create or replace function public.floor_plans_enforce_company_id()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company uuid := public.current_company_id();
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;

  if v_company is null then
    raise exception 'Sin empresa asociada al perfil';
  end if;

  if tg_op = 'INSERT' then
    if new.company_id is null then
      new.company_id := v_company;
    elsif new.company_id <> v_company then
      raise exception 'No se puede crear un plano para otra empresa';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id then
      raise exception 'No se puede reasignar el plano a otra empresa';
    end if;
    new.company_id := old.company_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_floor_plans_enforce_company_id on public.floor_plans;
create trigger trg_floor_plans_enforce_company_id
  before insert or update on public.floor_plans
  for each row execute function public.floor_plans_enforce_company_id();

-- -----------------------------------------------------------------------------
-- 5) Drop created_by — rewrite policies that referenced it first
-- -----------------------------------------------------------------------------
drop policy if exists plans_auth_select on public.floor_plans;
drop policy if exists plans_admin_insert on public.floor_plans;
drop policy if exists plans_admin_update on public.floor_plans;
drop policy if exists plans_admin_delete on public.floor_plans;
drop policy if exists plans_manager_insert on public.floor_plans;
drop policy if exists plans_manager_update on public.floor_plans;
drop policy if exists plans_manager_delete on public.floor_plans;

-- Interim policies (tenant-strict SELECT/WRITE arrive in 0028).
-- Insert requires is_admin() + company_id matching caller (trigger also enforces).
create policy plans_auth_select on public.floor_plans
  for select to authenticated
  using (
    company_id is not null
    and company_id = public.current_company_id()
  );

create policy plans_admin_insert on public.floor_plans
  for insert to authenticated
  with check (
    public.is_admin()
    and company_id is not null
    and company_id = public.current_company_id()
  );

create policy plans_admin_update on public.floor_plans
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

create policy plans_admin_delete on public.floor_plans
  for delete to authenticated
  using (
    public.is_admin()
    and company_id is not null
    and company_id = public.current_company_id()
  );

alter table public.floor_plans
  drop column if exists created_by;

comment on table public.floor_plans is
  'Floor plans owned solely by companies via company_id (no created_by).';
