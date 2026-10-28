#!/usr/bin/env python3
"""Generate staging-only multiempresa seed SQL from the fixture zip CSVs."""

from __future__ import annotations

import csv
import re
from pathlib import Path

FIXTURE_DIR = Path("/tmp/tableflow-seed")
OUT = Path(__file__).resolve().parents[1] / "supabase/seeds/SEED_MULTIEMPRESA_STAGING.sql"


def read_csv(name: str) -> list[dict[str, str]]:
    with open(FIXTURE_DIR / name, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def map_order_status(s: str) -> str:
    s = s.strip().upper()
    if s == "COMPLETED":
        return "CLOSED"
    if s in ("OPEN", "CLOSED", "CANCELLED"):
        return s
    raise ValueError(s)


def map_item_status(s: str, attended: str) -> tuple[str, bool]:
    s = s.strip().upper()
    att = str(attended).strip().lower() in ("true", "1", "t", "yes")
    if s in ("ATTENDED", "PLACED") or att:
        return "PLACED", True
    if s == "CANCELLED":
        return "CANCELLED", False
    return "PENDING", False


def table_number(name: str, typ: str) -> int:
    m = re.search(r"(\d+)", name)
    n = int(m.group(1)) if m else 1
    return 100 + n if typ == "RESERVED" else n


def geom(n: int, typ: str) -> tuple[int, int, int, int, int, str]:
    idx = n if typ == "TABLE" else (n - 100)
    col = (idx - 1) % 4
    row = (idx - 1) // 4
    x = 120 + col * 160
    y = 120 + row * 140
    if typ == "RESERVED":
        return x, y + 300, 140, 90, 0, "rectangle"
    return x, y, 100, 100, 0, "circle"


def main() -> None:
    companies = read_csv("companies.csv")
    profiles = read_csv("profiles_reference_only.csv")
    plans = read_csv("floor_plans.csv")
    tables = read_csv("tables.csv")
    products = read_csv("products.csv")
    orders = read_csv("orders.csv")
    items = read_csv("order_items.csv")

    cats = sorted({p["category_label"] for p in products})

    company_keys = {
        "2050d9c3-536e-5b1a-9522-cfd71b3daf44": "aurora",
        "f5d060b5-3e95-58fe-a8aa-117017b8e5ec": "eclipse",
        "6014b29a-cd55-54fc-890e-f28944f1b964": "nebula",
    }
    role_suffix = {"ADMIN": "admin", "USER": "user", "RECEPTOR": "receptor"}
    email_map = [
        ("aurora_admin", "admin.aurora@tableflow.test"),
        ("aurora_user", "user.aurora@tableflow.test"),
        ("aurora_receptor", "receptor.aurora@tableflow.test"),
        ("eclipse_admin", "admin.eclipse@tableflow.test"),
        ("eclipse_user", "user.eclipse@tableflow.test"),
        ("eclipse_receptor", "receptor.eclipse@tableflow.test"),
        ("nebula_admin", "admin.nebula@tableflow.test"),
        ("nebula_user", "user.nebula@tableflow.test"),
        ("nebula_receptor", "receptor.nebula@tableflow.test"),
    ]

    lines: list[str] = []
    A = lines.append

    A("-- =============================================================================")
    A("-- SEED STAGING ONLY — TableFlow multiempresa (adaptado del dataset de pruebas)")
    A("-- NEVER run against production / Sala Chocolatte.")
    A("--")
    A("-- Prerequisites:")
    A("--   1) Migrations through 0029 applied on the target DB.")
    A("--   2) Create 9 Auth users (Dashboard / Admin API) with these emails:")
    for key, email in email_map:
        A(f"--        {email}  ({key})")
    A("--      Passwords: store only in a private staging vault — never commit them.")
    A("--   3) Create Auth users WITHOUT company-signup metadata (avoid handle_new_user")
    A("--      creating extra companies). Prefer Admin API: email + password only.")
    A("--      The seed then upserts profiles (role/company_id/username).")
    A("--   4) Staging must not already use commercial names Sala Aurora / Club Eclipse /")
    A("--      Nébula Lounge under other company ids (companies_name_unique).")
    A("--   5) Run this script as postgres/service_role on staging/local only.")
    A("--")
    A("-- Adaptations from fixtures:")
    A("--   - orders.status COMPLETED → CLOSED")
    A("--   - order_items.status ATTENDED → PLACED (+ attended=true)")
    A("--   - products.category_label → product_categories by name (+ products.category_id)")
    A("--   - products.price_reference_eur → products.price")
    A("--   - tables.name → tables.number (RESERVED 1/2 → 101/102; unique per plan)")
    A("--   - floor_plans: width/height/is_active/is_locked; ownership via company_id")
    A("--   - profiles: resolved via auth.users email join (never invent auth rows)")
    A("--   - orders/order_items.created_by → company ADMIN auth id")
    A("--   - _company_reference columns discarded (tenant via floor_plans / products)")
    A("-- =============================================================================")
    A("")
    A("-- Persistent helpers (SQL Editor may auto-commit; TEMP ON COMMIT DROP vanishes).")
    A("create schema if not exists tf_seed;")
    A("drop table if exists tf_seed.auth_map;")
    A("drop table if exists tf_seed.categories;")
    A("")
    A("create table tf_seed.auth_map (")
    A("  seed_key text primary key,")
    A("  email text not null,")
    A("  auth_user_id uuid not null")
    A(");")
    A("")
    A("-- Resolve Auth UUIDs by email (Auth generates ids; profiles must match).")
    A("insert into tf_seed.auth_map (seed_key, email, auth_user_id)")
    A("select x.seed_key, x.email, u.id")
    A("from (values")
    for i, (key, email) in enumerate(email_map):
        comma = "," if i < len(email_map) - 1 else ""
        A(f"  ('{key}', '{email}'){comma}")
    A(") as x(seed_key, email)")
    A("join auth.users u on lower(u.email) = lower(x.email);")
    A("")
    A("do $$")
    A("declare n int;")
    A("begin")
    A("  select count(*) into n from tf_seed.auth_map;")
    A("  if n < 9 then")
    A(
        "    raise exception "
        "'tf_seed: expected 9 auth users by email (got %). Create them first.', n;"
    )
    A("  end if;")
    A("end $$;")
    A("")

    A("-- companies")
    A("insert into public.companies (id, name, created_at, updated_at)")
    A("values")
    for i, c in enumerate(companies):
        comma = "," if i < len(companies) - 1 else ""
        name = c["name"].replace("'", "''")
        A(
            f"  ('{c['id']}'::uuid, '{name}', '{c['created_at']}', "
            f"'{c['updated_at']}'){comma}"
        )
    A(
        "on conflict (id) do update set name = excluded.name, "
        "updated_at = excluded.updated_at;"
    )
    A("")

    A("-- profiles (FK to auth.users only; ADMIN username = Administrador)")
    A(
        "insert into public.profiles "
        "(id, full_name, phone, role, company_id, username, created_at, updated_at)"
    )
    A("select a.auth_user_id,")
    A("       v.full_name,")
    A("       v.phone,")
    A("       v.role::public.app_role,")
    A("       v.company_id,")
    A("       case when v.role = 'ADMIN' then 'Administrador' else null end,")
    A("       v.created_at::timestamptz,")
    A("       v.updated_at::timestamptz")
    A("from (values")
    for i, p in enumerate(profiles):
        sk = f"{company_keys[p['company_id']]}_{role_suffix[p['role']]}"
        comma = "," if i < len(profiles) - 1 else ""
        fn = p["full_name"].replace("'", "''")
        A(
            f"  ('{sk}', '{fn}', '{p['phone']}', '{p['role']}', "
            f"'{p['company_id']}'::uuid, '{p['created_at']}', '{p['updated_at']}'){comma}"
        )
    A(") as v(seed_key, full_name, phone, role, company_id, created_at, updated_at)")
    A("join tf_seed.auth_map a on a.seed_key = v.seed_key")
    A("on conflict (id) do update set")
    A("  full_name = excluded.full_name,")
    A("  phone = excluded.phone,")
    A("  role = excluded.role,")
    A("  company_id = excluded.company_id,")
    A("  username = excluded.username,")
    A("  updated_at = excluded.updated_at;")
    A("")

    A("-- product_categories (unique by name; reuse existing rows if present)")
    A("insert into public.product_categories (name, sort_order, created_at, updated_at)")
    A("values")
    for i, label in enumerate(cats):
        comma = "," if i < len(cats) - 1 else ""
        A(f"  ('{label}', {i}, now(), now()){comma}")
    A("on conflict (name) do update set sort_order = excluded.sort_order;")
    A("")
    A("create table tf_seed.categories (")
    A("  label text primary key,")
    A("  category_id uuid not null")
    A(");")
    A("")
    A("insert into tf_seed.categories (label, category_id)")
    A("select c.name, c.id")
    A("from public.product_categories c")
    A("where c.name in (" + ", ".join(f"'{label}'" for label in cats) + ");")
    A("")

    A("-- products (category_id resolved by label)")
    A(
        "insert into public.products "
        "(id, company_id, category_id, name, price, active, created_at, updated_at)"
    )
    A("select v.id, v.company_id, cat.category_id, v.name, v.price, v.active, now(), now()")
    A("from (values")
    for i, p in enumerate(products):
        comma = "," if i < len(products) - 1 else ""
        active = "true" if str(p["is_active"]).lower() in ("true", "1") else "false"
        name = p["name"].replace("'", "''")
        A(
            f"  ('{p['id']}'::uuid, '{p['company_id']}'::uuid, "
            f"'{p['category_label']}', '{name}', "
            f"{p['price_reference_eur']}::numeric, {active}){comma}"
        )
    A(") as v(id, company_id, category_label, name, price, active)")
    A("join tf_seed.categories cat on cat.label = v.category_label")
    A("on conflict (id) do update set")
    A("  company_id = excluded.company_id,")
    A("  category_id = excluded.category_id,")
    A("  name = excluded.name,")
    A("  price = excluded.price,")
    A("  active = excluded.active,")
    A("  updated_at = now();")
    A("")

    A("-- floor_plans (tenant via company_id)")
    A("-- Bypass trg_floor_plans_enforce_company_id: it requires auth.uid() (app session).")
    A("-- SQL Editor / service role has auth.uid()=null and must seed 3 tenants at once.")
    A("alter table public.floor_plans disable trigger trg_floor_plans_enforce_company_id;")
    A(
        "insert into public.floor_plans "
        "(id, company_id, name, width, height, is_active, is_locked, created_at, updated_at)"
    )
    A("values")
    for i, fp in enumerate(plans):
        comma = "," if i < len(plans) - 1 else ""
        name = fp["name"].replace("'", "''")
        A(
            f"  ('{fp['id']}'::uuid, '{fp['company_id']}'::uuid, '{name}', "
            f"2000, 1200, false, false, '{fp['created_at']}', '{fp['updated_at']}'){comma}"
        )
    A("on conflict (id) do update set")
    A("  company_id = excluded.company_id,")
    A("  name = excluded.name,")
    A("  updated_at = excluded.updated_at;")
    A("alter table public.floor_plans enable trigger trg_floor_plans_enforce_company_id;")
    A("")

    A("-- tables")
    A("insert into public.tables (")
    A(
        "  id, floor_plan_id, type, number, x, y, width, height, rotation, "
        "shape, attended, observation, created_at, updated_at"
    )
    A(")")
    A("values")
    for i, t in enumerate(tables):
        typ = t["type"]
        num = table_number(t["name"], typ)
        x, y, w, h, rot, shape = geom(num, typ)
        comma = "," if i < len(tables) - 1 else ""
        A(
            f"  ('{t['id']}'::uuid, '{t['floor_plan_id']}'::uuid, "
            f"'{typ}'::public.table_type, {num}, {x}, {y}, {w}, {h}, {rot}, "
            f"'{shape}'::public.table_shape, false, null, now(), now()){comma}"
        )
    A("on conflict (id) do update set")
    A("  floor_plan_id = excluded.floor_plan_id,")
    A("  type = excluded.type,")
    A("  number = excluded.number,")
    A("  x = excluded.x, y = excluded.y, width = excluded.width, height = excluded.height,")
    A("  rotation = excluded.rotation, shape = excluded.shape,")
    A("  updated_at = now();")
    A("")

    A("-- orders (COMPLETED → CLOSED; created_by = company ADMIN)")
    A("insert into public.orders (id, table_id, created_by, status, created_at, updated_at)")
    A(
        "select v.id, v.table_id, a.auth_user_id, v.status::public.order_status, "
        "v.created_at, v.created_at"
    )
    A("from (values")
    for i, o in enumerate(orders):
        st = map_order_status(o["status"])
        sk = f"{company_keys[o['_company_reference']]}_admin"
        comma = "," if i < len(orders) - 1 else ""
        A(
            f"  ('{o['id']}'::uuid, '{o['table_id']}'::uuid, '{sk}', '{st}', "
            f"'{o['created_at']}'::timestamptz){comma}"
        )
    A(") as v(id, table_id, seed_key, status, created_at)")
    A("join tf_seed.auth_map a on a.seed_key = v.seed_key")
    A("on conflict (id) do update set")
    A("  table_id = excluded.table_id,")
    A("  created_by = excluded.created_by,")
    A("  status = excluded.status,")
    A("  updated_at = excluded.created_at;")
    A("")

    A("-- order_items (ATTENDED → PLACED)")
    A("insert into public.order_items (")
    A(
        "  id, order_id, product_id, quantity, status, attended, "
        "created_by, placed_by, placed_at, created_at, updated_at"
    )
    A(")")
    A(
        "select v.id, v.order_id, v.product_id, v.quantity, "
        "v.status::public.order_item_status, v.attended,"
    )
    A("       a.auth_user_id,")
    A("       case when v.attended then a.auth_user_id else null end,")
    A("       case when v.attended then now() else null end,")
    A("       now(), now()")
    A("from (values")
    for i, it in enumerate(items):
        st, att = map_item_status(it["status"], it["attended"])
        sk = f"{company_keys[it['_company_reference']]}_admin"
        comma = "," if i < len(items) - 1 else ""
        A(
            f"  ('{it['id']}'::uuid, '{it['order_id']}'::uuid, '{it['product_id']}'::uuid, "
            f"{it['quantity']}, '{st}', {str(att).lower()}, '{sk}'){comma}"
        )
    A(") as v(id, order_id, product_id, quantity, status, attended, seed_key)")
    A("join tf_seed.auth_map a on a.seed_key = v.seed_key")
    A("on conflict (id) do update set")
    A("  order_id = excluded.order_id,")
    A("  product_id = excluded.product_id,")
    A("  quantity = excluded.quantity,")
    A("  status = excluded.status,")
    A("  attended = excluded.attended,")
    A("  created_by = excluded.created_by,")
    A("  updated_at = now();")
    A("")

    A("-- Post-seed sanity (expected per company: 2/12/6/12 orders with 8 OPEN + 4 CLOSED / 24 items)")
    A(
        """select c.name,
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
order by c.name;"""
    )
    A("")
    A("drop table if exists tf_seed.auth_map;")
    A("drop table if exists tf_seed.categories;")
    A("")
    A("-- ROLLBACK helper (staging only; Auth users via Dashboard/Admin API):")
    A("-- delete order_items/orders/tables/floor_plans/products/profiles/companies")
    A("-- scoped by the three fixture company ids above.")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
    print("categories:", cats)
    print(
        "counts:",
        len(companies),
        len(plans),
        len(tables),
        len(products),
        len(orders),
        len(items),
    )


if __name__ == "__main__":
    main()
