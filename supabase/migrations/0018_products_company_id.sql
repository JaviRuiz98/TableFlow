-- =============================================================================
-- 0018_products_company_id.sql
-- TableFlow ONLY — never apply to Sala Chocolatte / CreadorSala.
--
-- Adds tenant ownership on public.products via company_id, backfills when a
-- single company exists, tightens unique name scope, and scopes RLS by company.
--
-- Prerequisites: public.companies + public.profiles.company_id (see 0017).
-- Does NOT push itself — apply only with explicit authorization on TableFlow.
-- =============================================================================

-- 1) Column + FK
alter table public.products
  add column if not exists company_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_company_id_fkey'
  ) then
    alter table public.products
      add constraint products_company_id_fkey
      foreign key (company_id) references public.companies (id);
  end if;
end
$$;

create index if not exists products_company_id_idx
  on public.products (company_id);

comment on column public.products.company_id is
  'Owning company (tenant). Required for new inserts from the Angular catalog.';

-- 2) Best-effort backfill when the project still has a single company
do $$
declare
  v_company_count integer;
  v_company_id uuid;
begin
  select count(*) into v_company_count from public.companies;
  if v_company_count = 1 then
    select id into v_company_id from public.companies limit 1;
    update public.products
       set company_id = v_company_id
     where company_id is null;
  end if;
end
$$;

-- 3) Unique product name per company + category (replaces global category+name)
alter table public.products
  drop constraint if exists products_category_id_name_key;

drop index if exists products_category_id_name_key;

create unique index if not exists products_company_category_name_uidx
  on public.products (company_id, category_id, name)
  where company_id is not null;

-- 4) RLS: replace open authenticated policies with company-scoped ones
drop policy if exists products_auth_select on public.products;
drop policy if exists products_admin_write on public.products;
drop policy if exists products_company_select on public.products;
drop policy if exists products_admin_company_write on public.products;

create policy products_company_select on public.products
  for select to authenticated
  using (
    company_id is not null
    and company_id = (
      select p.company_id
      from public.profiles p
      where p.id = auth.uid()
    )
  );

create policy products_admin_company_write on public.products
  for all to authenticated
  using (
    public.is_admin()
    and company_id is not null
    and company_id = (
      select p.company_id
      from public.profiles p
      where p.id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    and company_id is not null
    and company_id = (
      select p.company_id
      from public.profiles p
      where p.id = auth.uid()
    )
  );
