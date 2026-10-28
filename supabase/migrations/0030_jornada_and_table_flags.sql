-- =============================================================================
-- 0030_jornada_and_table_flags.sql
-- TableFlow ONLY — NEVER run against Sala Chocolatte / CreadorSala.
--
-- Additive / safe:
--   • jornada fields on floor_plans (each plan = one opening session)
--   • tables.reserved + tables.occupied (current operational state, not history)
--   • preserve reserved/occupied on replace_floor_plan_snapshot upserts
--   • at most one OPEN jornada per company
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Enum: jornada status
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.jornada_status as enum ('scheduled', 'open', 'closed');
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 2) floor_plans — jornada metadata (plan = jornada)
-- -----------------------------------------------------------------------------
alter table public.floor_plans
  add column if not exists opening_date date,
  add column if not exists opens_at time without time zone,
  add column if not exists closes_at time without time zone,
  add column if not exists closes_next_day boolean not null default false,
  add column if not exists status public.jornada_status;

comment on column public.floor_plans.opening_date is
  'Calendar date of the opening (local venue day). Not created_at.';
comment on column public.floor_plans.opens_at is
  'Local opening time on opening_date.';
comment on column public.floor_plans.closes_at is
  'Local closing time; may fall on the next calendar day when closes_next_day.';
comment on column public.floor_plans.closes_next_day is
  'When true, closes_at belongs to opening_date + 1 day (crosses midnight).';
comment on column public.floor_plans.status is
  'scheduled | open | closed. At most one open plan per company.';

-- Backfill without session auth (MCP/migration role has no auth.uid()).
alter table public.floor_plans disable trigger trg_floor_plans_enforce_company_id;

update public.floor_plans
   set opening_date = coalesce(opening_date, (created_at at time zone 'UTC')::date),
       opens_at = coalesce(opens_at, time '22:00'),
       closes_at = coalesce(closes_at, time '06:00'),
       closes_next_day = case
         when opens_at is not null and closes_at is not null and closes_at < opens_at then true
         else coalesce(closes_next_day, true)
       end,
       status = coalesce(
         status,
         case when is_active then 'open'::public.jornada_status
              -- Existing plans stay editable until explicitly closed.
              else 'scheduled'::public.jornada_status
         end
       )
 where opening_date is null
    or opens_at is null
    or closes_at is null
    or status is null;

alter table public.floor_plans
  alter column opening_date set not null,
  alter column opens_at set not null,
  alter column closes_at set not null,
  alter column status set not null,
  alter column status set default 'scheduled'::public.jornada_status;

-- Keep is_active aligned with status for legacy readers.
update public.floor_plans
   set is_active = (status = 'open')
 where is_active is distinct from (status = 'open');

alter table public.floor_plans enable trigger trg_floor_plans_enforce_company_id;

create unique index if not exists floor_plans_one_open_per_company_idx
  on public.floor_plans (company_id)
  where status = 'open' and company_id is not null;

-- Soft idempotency: same company + same opening day + same trimmed name.
create unique index if not exists floor_plans_company_opening_name_uidx
  on public.floor_plans (company_id, opening_date, lower(btrim(name)))
  where company_id is not null;

create index if not exists floor_plans_company_opening_date_idx
  on public.floor_plans (company_id, opening_date desc);

create index if not exists floor_plans_company_status_idx
  on public.floor_plans (company_id, status);

-- -----------------------------------------------------------------------------
-- 3) tables — reserved / occupied (current state only)
-- -----------------------------------------------------------------------------
alter table public.tables
  add column if not exists reserved boolean not null default false,
  add column if not exists occupied boolean not null default false;

comment on column public.tables.reserved is
  'Current reservation flag for this jornada table. Not a reservation history.';
comment on column public.tables.occupied is
  'Current occupancy flag (guests present). Independent of reserved; not history.';

-- -----------------------------------------------------------------------------
-- 4) Snapshot: never clobber reserved/occupied from geometry saves
-- -----------------------------------------------------------------------------
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
  v_status public.jornada_status;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if not public.floor_plan_belongs_to_current_company(p_floor_plan_id) then
    raise exception 'Plano no encontrado o de otra empresa';
  end if;

  select status into v_status
    from public.floor_plans
   where id = p_floor_plan_id;

  if v_status = 'closed' then
    raise exception 'No se puede editar el plano de una jornada cerrada';
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
    id, floor_plan_id, type, number, x, y, width, height, rotation, shape, attended,
    reserved, occupied
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
    coalesce((t->>'attended')::boolean, false),
    false,
    false
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
    -- reserved / occupied intentionally NOT updated (operational flags via dedicated RPCs)
    updated_at = now();
end;
$$;

comment on function public.replace_floor_plan_snapshot(uuid, jsonb, jsonb) is
  'Replace plan elements + upsert tables geometry. Preserves reserved/occupied. Blocks closed jornadas.';
