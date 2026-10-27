# TableFlow — Refactor Plan (ETAPA A → authorization gate)

**Principle:** structural quality only. Behaviour, UX, styles, routes, RLS/RPC/Realtime contracts unchanged.

**Gate:** ETAPA B authorized 2026-10-27 — work exclusively on **`main`** (no new branches). No commits/pushes without further authorization.

**Recovery:** [RECOVERY_POINT.md](./RECOVERY_POINT.md) (`e546e97` + WIP preserved on `main` working tree).

---

## Git policy (authorized)

- Branch: **`main` only**
- Preserve all prior WIP (TableFlow env, bootstrap SQL, docs, auth domain)
- No commits / pushes / deploys without explicit authorization

---

## Target modular layout (adapted to reality)

Do **not** invent empty `reservations/` UI or `administration/` packages without code to put there.

```text
src/app/
  core/
    auth/                 # keep
    guards/               # keep
    config/               # optional: env helpers only if needed
    models/               # shared domain types (stable public surface)
    infrastructure/
      supabase.service.ts
      error-message.service.ts
  shared/                 # ONLY proven reusable UI bits extracted later
  features/
    authentication/       # login + thin wrappers
    workspace-shell/      # current WorkspaceComponent orchestration (reduce over time)
    floor-plans/          # plan list/CRUD coordination
    floor-editor/         # PlanEditor split: canvas / orders-ui / observations
    tables/               # table/reserved domain services used by editor
    products/             # catalog
    orders/               # OrderService + order-state helpers
    notifications/        # OrderNotificationService
    users/                # UserAdminService + dialogs if extracted
  data-access/            # optional alias layer OR keep as features/*/data-access
```

**Reservations:** document as **schema-only domain** until UI exists; no fake feature folder required in Etapa B.

---

## Module-by-module Etapa B sequence

| Order | Module | Risk | Exit criteria |
|------:|--------|------|---------------|
| 0 | Tooling baseline | Low | `jsdom` installed; lint ignores `dist/node_modules`; `npm test` green for existing specs |
| 1 | `core/infrastructure` | Low | Move supabase + error services; update imports; build+test |
| 2 | `orders` data-access | Medium | All RPC/table access for orders via OrderService (remove UI leaks); characterization tests |
| 3 | `products` | Low | Relocate ProductService; no API change |
| 4 | `users` | Low | Relocate UserAdminService |
| 5 | `notifications` | Medium | Relocate; preserve channel semantics |
| 6 | `floor-plans` service | Medium | Split attended/observation RPCs vs plan CRUD **only if** tests cover both |
| 7 | `workspace-shell` | High | Extract subcomponents **without** HTML/CSS visual change (move files; same templates/styles) |
| 8 | `floor-editor` | Highest | Extract pure helpers + child components with identical templates/bindings |
| 9 | Types hardening | Medium | Tighten `database.types` / OrderItem typing without runtime change |
| 10 | Etapa C docs/rules | — | Module docs + Cursor rules + agent map |
| 11 | Etapa D cleanup | — | Delete only class **A** after re-scan |

Each step: analyse → characterization tests if missing → refactor → `npm test` → `npm run build` → update `REFACTOR_PROGRESS.md`.

---

## Characterization tests to add before touching PlanEditor / Workspace

Minimum (local, mocked Supabase — **no remote writes**):

1. Order item grouping pending vs attended (pure functions extracted first if needed).
2. `OrderNotificationService` payload filters (PENDING + observation change).
3. `auth-identity` normalize/validate username (already pure).
4. `GeometryService` (exists).
5. Floor snapshot mapping (ids preserved) if extracted from editor.

---

## Documentation deliverables (Etapa C — planned)

| Path | Purpose |
|------|---------|
| `docs/architecture/SYSTEM_OVERVIEW.md` | Global context for any agent |
| `docs/architecture/MODULE_MAP.md` | Domains ↔ folders |
| `docs/architecture/DEPENDENCY_MAP.md` | Allowed imports |
| `docs/architecture/DATA_FLOW.md` | Auth → UI → RPC → Realtime |
| `docs/architecture/SUPABASE_INTEGRATION.md` | Tables/RPC/channels |
| `docs/architecture/ARCHITECTURAL_DECISIONS.md` | ADRs |
| `docs/modules/*.md` | Per-domain agent briefing |
| `docs/agents/AGENT_ARCHITECTURE.md` | Future specialized agents |
| `.cursor/rules/*.mdc` | Global short + scoped domain rules |

Etapa A seeds drafts of overview + module/dependency maps (see sibling files).

---

## Cursor rules strategy (design only)

- **Global** (`alwaysApply: true`): zero functional change; TableFlow Supabase only; no Sala Chocolatte writes; no secret keys in frontend; run tests after module changes.
- **Scoped globs** per domain (`features/floor-editor/**`, `features/orders/**`, …) — load only that module’s doc.
- Avoid one mega-rule that dumps entire repo context.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Visual regressions while “moving” components | Keep template/scss byte-stable; move TS first |
| Realtime double-subscribe | Document channel lifecycle; test unsubscribe |
| Import cycles after splits | DEPENDENCY_MAP forbidden edges |
| Broken lint flooding noise | Fix eslint ignores before trusting lint gate |
| Accidental remote writes in E2E | Keep E2E read-only / local mocks until authorized |
| Over-modularization | Prefer few clear folders; no empty abstractions |

---

## Authorization checklist for Etapa B

User must confirm:

- [ ] Branch strategy (`refactor/modular-architecture` from which tip)
- [ ] Allow installing `jsdom` (devDependency) as tooling baseline
- [ ] Allow eslint config ignore fixes (no behaviour change)
- [ ] Start with module order 0 → 1 → …
- [ ] Confirm no remote Supabase schema/RPC changes
