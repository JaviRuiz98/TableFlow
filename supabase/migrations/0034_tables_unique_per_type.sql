-- Separate number spaces for TABLE vs RESERVED on the same floor plan.
-- Was: UNIQUE (floor_plan_id, number) — blocked Mesa 1 + Reservado 1.
-- Now: UNIQUE (floor_plan_id, type, number).

alter table public.tables
  drop constraint if exists tables_floor_plan_id_number_key;

do $$
declare
  cname text;
begin
  select con.conname into cname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
   where nsp.nspname = 'public'
     and rel.relname = 'tables'
     and con.contype = 'u'
     and pg_get_constraintdef(con.oid) ilike '%floor_plan_id%number%'
     and pg_get_constraintdef(con.oid) not ilike '%type%';
  if cname is not null then
    execute format('alter table public.tables drop constraint %I', cname);
  end if;
end $$;

alter table public.tables
  drop constraint if exists tables_floor_plan_id_type_number_key;

alter table public.tables
  add constraint tables_floor_plan_id_type_number_key
  unique (floor_plan_id, type, number);

comment on constraint tables_floor_plan_id_type_number_key on public.tables is
  'Mesa N and Reservado N may coexist; uniqueness is per type within a plan.';
