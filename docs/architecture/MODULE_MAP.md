# Module Map

**Plan:** [../refactoring/REFACTOR_PLAN.md](../refactoring/REFACTOR_PLAN.md) (sequence B7.5→B14)  
**Deps:** [DEPENDENCY_MAP.md](./DEPENDENCY_MAP.md)

## Domains ↔ folders

| Logical domain | Current primary location | Target / status |
|----------------|--------------------------|-----------------|
| Authentication | `core/auth/*`, `features/auth/login.component.ts`, `core/guards/` | Keep; optional rename later |
| Workspace shell | `features/workspace/` (~316 TS + components/ + user-admin) | **B11 + C2** — [../modules/workspace.md](../modules/workspace.md) |
| Floor plans (data) | `features/floor-plans/` services + utils | **B6 done**; editor removed in **B7.5** |
| Floor editor (UI) | `features/floor-editor/` (components/ + helpers + geometry/…) | **B8 + C1** — [../modules/floor-editor.md](../modules/floor-editor.md) |
| Geometry | `features/floor-editor/geometry/` | **Done (B8.2)** — see [../modules/floor-editor.md](../modules/floor-editor.md) |
| Tables / reserved | `features/tables/` (deletion + validation); attended/observation still on `FloorPlanService` | **B9 done** — [../modules/tables.md](../modules/tables.md) |
| Reservations (SQL) | Bootstrap / types only | Docs only until UI |
| Products | `features/products/*` | **Done (B3)** — [../modules/products.md](../modules/products.md) |
| Orders | `features/orders/*` | **Done (B2)** — [../modules/orders.md](../modules/orders.md) |
| Notifications | `features/notifications/*` | **Done (B5)** — [../modules/notifications.md](../modules/notifications.md) |
| Users admin | `features/users/*` | **Done (B4)** — [../modules/users.md](../modules/users.md) |
| Infrastructure | `core/infrastructure/*` | **Done (B1)** |
| Shared models | `core/models/models.ts` (enums from `database.types`) | **B10 done** |
| DB / Supabase types | `core/data/database.types.ts` (BOOTSTRAP-aligned) | **B10 done** — [../refactoring/B10_TYPES.md](../refactoring/B10_TYPES.md) |
| Branding / docs cleanup | README, npm name, ignore, e2e paths | **B12 done** — [../refactoring/B12_CLEANUP.md](../refactoring/B12_CLEANUP.md) |
| Integration / E2E | Vitest 185 + Playwright smoke/auth-shell | **B13 + C1/C2 specs** — [../testing/TEST_MATRIX.md](../testing/TEST_MATRIX.md) |
| Agent docs / Cursor rules | `AGENTS.md`, `.cursor/rules`, `.cursor/agents` | **B14 + C4 path updates** — [../agents/AGENT_MAP.md](../agents/AGENT_MAP.md) |
| Component architecture | UI children under workspace/floor-editor `components/` | **C0–C4** — [../refactoring/COMPONENT_REFACTOR_PLAN.md](../refactoring/COMPONENT_REFACTOR_PLAN.md) |

## Actual trees (post B7.5)

### `features/floor-plans/` (persistence only)

```text
floor-plans/
  index.ts
  floor-plan.service.ts (+ spec)
  plan-duplication.service.ts (+ spec)
  floor-plan-snapshot.util.ts (+ spec)
  floor-plan-element.mapper.ts (+ spec)   # B10 jsonb points → domain
```

### `features/floor-editor/` (graphic + panel)

```text
floor-editor/
  index.ts
  plan-editor.component.{ts,html,scss}   # Stage owner (~648 TS, approved exception)
  plan-editor-{renderer,viewport,drawing,delete.facade,host}.ts
  table-product-panel.component.{ts,html,scss}
  components/{editor-toolbar,plan-editor-dialogs,order-attention-dialog}/
  geometry/ canvas/ tools/ history/   # B8.2–B8.5
```

### `features/tables/` (B9)

```text
tables/
  index.ts
  table-deletion.service.ts (+ spec)
  table-validation.service.ts (+ spec)
```

### Pending

- Relocate attended/observation wrappers only if authorized (see tables.md)
- Optional: plan/catalog dialog children (deferred in B11 — coupled to shell lists)
- Optional later: rename `dist/discoteca` + Capacitor `webDir` + UI brand (needs auth)
- Optional future: UI rebrand, `dist/discoteca` rename, SQL consolidation (need auth)

## Public surfaces agents should prefer

- Domain types: `core/models/models.ts`
- DB contracts: `core/data/database.types.ts` (`Tables<>`, RPC Args) — see [B10_TYPES.md](../refactoring/B10_TYPES.md)
- Auth: `AuthService`
- Data: feature `*Service` public APIs — never raw `SupabaseClient` from UI
- Module brief: `docs/modules/<domain>.md` for the domain in scope

## Out of scope

No payments, multi-tenant orgs, or map geolocation beyond Konva canvas.
