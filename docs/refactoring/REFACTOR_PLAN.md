# TableFlow — Refactor Plan

**Principle:** structural quality only. Behaviour, UX, styles, routes, RLS/RPC/Realtime contracts unchanged.

**Branch:** work exclusively on **`main`**. No commits/pushes without explicit authorization.  
**Recovery:** [RECOVERY_POINT.md](./RECOVERY_POINT.md) (`e546e97` + WIP preserved).

**Related maps:** [SYSTEM_OVERVIEW](../architecture/SYSTEM_OVERVIEW.md) · [MODULE_MAP](../architecture/MODULE_MAP.md) · [DEPENDENCY_MAP](../architecture/DEPENDENCY_MAP.md)

---

## Status snapshot (post external review)

| Item | Reality |
|------|---------|
| Done | B0 tooling → B7 workspace shell (services modularized; shell relocated) |
| Hotspots | `PlanEditorComponent` ~1687 LOC (mixed domains); `WorkspaceComponent` ~700 LOC |
| Co-location debt | Editor + panel still under `features/floor-plans/` |
| Misplaced services | `geometry`, `table-validation`, `table-deletion` still in `core/services/` |
| Types debt | `database.types.ts` uses `any` on table rows |
| Branding debt | Docs/npm TableFlow (B12); UI/Capacitor still Sala Chocolatte |
| Docs debt | Module docs incomplete for final agent-scoped loading |

---

## Hard constraints (every step)

- `main` only; no remote DB writes; no RPC/RLS/Realtime contract changes
- No functional, business-rule, design, or navigation changes
- Do not delete files without proving zero dependents
- Keep existing tests; extend when extracting behaviour
- After each intervention: `npm test` · `npm run lint` · `npm run build`
- Docs: short, per-module, agent-friendly (minimize context)

---

## Remaining sequence (authorized order)

| Step | Name | Intent | Risk |
|------|------|--------|------|
| **B7.5** | Physical folder reorg | Move files into target folders; **zero logic change** (imports/paths only) | Low–Med |
| **B8** | PlanEditor modularization | Progressive split: geometry, canvas, tools, history, state — same UX | Highest |
| **B9** | `tables` module | Delimit validation/deletion (+ related table helpers) out of `core/services` | Medium |
| **B10** | Types hardening | Replace `any` in generated/schema types from real TableFlow schema | Medium |
| **B11** | Workspace further modularization | Extract clear domain UI/coordination without visual change | High |
| **B12** | Dead code & legacy cleanup | Verified removals; branding/doc obsolescence | Medium |
| **B13** | Integration / E2E / regression | Expand tests; no destructive remote Supabase | Medium |
| **B14** | Final docs + Cursor rules + agents | Module briefs + scoped rules + agent map | Low |

**Stop after each Bn** until explicit approval. Do not auto-advance.

Each step: analyse → characterization tests if needed → change → test/lint/build → brief `B*_*.md` + progress update.

---

## Target layout (final)

```text
src/app/
  core/
    auth/
    guards/
    models/                 # shared domain types (stable)
    infrastructure/         # SupabaseService, ErrorMessageService
    # core/services/ emptied as B8–B9 relocate geometry/tables helpers
  shared/                   # only proven reusable UI (extract later if needed)
  features/
    auth/                   # login (rename to authentication/ only if authorized)
    workspace/              # shell coordinator (further split in B11)
    floor-plans/            # plan CRUD / snapshot / duplication ONLY
    floor-editor/           # Konva editor + panel + editor-local helpers
    tables/                 # table/reserved validation, deletion, related helpers (B9)
    products/
    orders/
    notifications/
    users/
```

**Reservations:** schema-only until UI exists — no empty feature folder required.

---

## Proposed final structure: `floor-plans` vs `floor-editor`

> **Do not move files until B7.5 is authorized.** This is the agreed target before any relocation.

### `features/floor-plans/` — plan persistence domain

Owns floor-plan data access and pure snapshot helpers. **No Konva. No editor UI.**

```text
features/floor-plans/
  index.ts                      # public barrel (services + utils only)
  floor-plan.service.ts
  floor-plan.service.spec.ts
  plan-duplication.service.ts
  plan-duplication.service.spec.ts
  floor-plan-snapshot.util.ts
  floor-plan-snapshot.util.spec.ts
```

**Public API (unchanged semantics):** plan list/create/update/remove, load/save snapshot, lock, attended/observation RPCs used by shell/editor, operational target create, duplication.

**Does not own:** canvas, tools, undo/history UI, geometry math, table-product panel markup.

### `features/floor-editor/` — graphic editor domain

Owns presentation of the plan canvas and operational panel. Starts as **physical move** (B7.5), then **internal modularization** (B8).

```text
features/floor-editor/
  index.ts                      # export PlanEditorComponent (+ panel if public)
  plan-editor.component.ts      # thin coordinator after B8
  plan-editor.component.html    # keep visual contract
  plan-editor.component.scss
  table-product-panel.component.ts
  table-product-panel.component.html
  table-product-panel.component.scss

  # Introduced progressively in B8 (names may refine; responsibilities fixed):
  geometry/                     # GeometryService (+ specs) from core/services
  canvas/                       # Konva stage/layer/node helpers
  tools/                        # editor tools / modes
  history/                      # undo-redo / design history helpers
  state/                        # editor presentation state (not global app store)
```

**Allowed deps:** `floor-plans` (persistence), `orders`, `products`, `tables` (after B9), `core/auth`, `core/models`, `core/infrastructure`.  
**Forbidden:** `floor-plans` importing `floor-editor`; `orders` importing editor UI.

### Boundary summary

| Concern | Home |
|---------|------|
| CRUD plan + snapshot RPC | `floor-plans` |
| Duplicate plan | `floor-plans` |
| Konva render / interaction | `floor-editor` |
| Tools / modes | `floor-editor` |
| Geometry helpers | `floor-editor/geometry` (via B7.5/B8) |
| Undo / design history | `floor-editor/history` |
| Table product / orders panel UI | `floor-editor` (panel component) |
| Table validation / password delete | `tables` (B9; may stay in `core/services` until then) |

---

## Step notes (planning only)

### B7.5 — Physical reorg

- Move `plan-editor.*` + `table-product-panel.*` → `features/floor-editor/`
- Optionally co-move `geometry.service.*` next to editor **or** leave until B8 (prefer move in B7.5 if zero logic change)
- Update imports (`workspace`, barrels, specs); **no method body changes**
- Keep `floor-plans/index.ts` free of editor exports

### B8 — PlanEditor modularization (subphases)

Detailed audit: [B8_FLOOR_EDITOR.md](./B8_FLOOR_EDITOR.md)

| Subphase | Focus | Status |
|----------|--------|--------|
| **B8.1** | Audit + characterization tests (no extraction) | **DONE** |
| **B8.2** | Geometry + pure line helpers → `floor-editor/geometry/` | **DONE** |
| **B8.3** | Canvas / viewport / coordinates → `canvas/` | **DONE** |
| **B8.4** | Tools & pointer interactions → `tools/` | **DONE** |
| **B8.5** | History → `history/` (no global store; optional `state/` skipped) | **DONE** |
| **B8.6** | Thin coordinator integration / B8 closeout | **DONE** |

Rules: create folders only with real files; keep HTML/SCSS/UX stable; no RPC changes; stop after each subphase.

### B9 — `tables` ✅

- Relocated `table-validation` + `table-deletion` → `features/tables/`
- Attended/observation remain on `FloorPlanService` (documented; no API churn)
- See [B9_TABLES.md](./B9_TABLES.md) · [../modules/tables.md](../modules/tables.md)

### B10 — Types ✅

- Hand-aligned `database.types.ts` from `BOOTSTRAP_TABLEFLOW.sql` (no live gen this phase)
- Domain models re-export enums; PlanEditor/orders/floor-plans/products consumers hardened
- Nested joins + jsonb RPC Args remain boundary casts — see [B10_TYPES.md](./B10_TYPES.md)

### B11 — Workspace ✅

- User-admin dialogs → `WorkspaceUserAdminComponent`; shell utils for visibility/transient/catalog
- Plan/catalog modals kept in shell (list coupling) — see [B11_WORKSPACE.md](./B11_WORKSPACE.md)

### B12 — Cleanup ✅

- README/NATIVE_APP TableFlow; npm name `tableflow`; e2e/playwright paths fixed; `.gitignore` hardened
- UI/Capacitor/`dist/discoteca` preserved — see [B12_CLEANUP.md](./B12_CLEANUP.md)

### B13 — Testing ✅

- Vitest 159; Playwright smoke + auth-shell with mutation block; fixtures in `src/testing/`
- See [B13_TESTING.md](./B13_TESTING.md) · [../testing/TEST_STRATEGY.md](../testing/TEST_STRATEGY.md)

### B14 — Docs & agents ✅

- `AGENTS.md` + `.cursor/rules/*.mdc` + `.cursor/agents/tableflow-*.md`
- See [B14_AGENTS.md](./B14_AGENTS.md) · [../agents/AGENT_MAP.md](../agents/AGENT_MAP.md)

---

## Characterization before PlanEditor / deep Workspace work

Minimum (mocked Supabase — **no remote writes**):

1. Snapshot id preservation / split helpers (exists under floor-plans)
2. Geometry pure behaviour (exists)
3. Notification filters (exists)
4. Workspace init / role presentation (exists)
5. Before B8 extractions: undo/history and saveDesign orchestration guards if not already covered

---

## Documentation strategy (agent context)

| Path | Load when |
|------|-----------|
| `docs/architecture/SYSTEM_OVERVIEW.md` | Any new agent / onboarding |
| `docs/architecture/MODULE_MAP.md` | Locating folders |
| `docs/architecture/DEPENDENCY_MAP.md` | Before adding imports |
| `docs/modules/<domain>.md` | Working inside that domain only |
| `docs/refactoring/B*_*.md` | Historical step notes (optional) |
| `.cursor/rules/*.mdc` (B14) | Global short + glob-scoped domain |

Avoid mega-docs that force full-repo context.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Visual regression while splitting editor | Keep template/scss stable; move TS first |
| Accidental logic change in B7.5 | Diff review: imports/paths only |
| Import cycles floor-plans ↔ floor-editor | DEPENDENCY_MAP forbidden edges; barrels scoped |
| Realtime double-subscribe | Preserve channel names/lifecycle; existing notification tests |
| Over-extraction of Workspace | Only clear domain boundaries in B11 |
| Types regen breaks casts | Incremental; keep runtime identical |

---

## Authorization checklist (remaining)

User confirms before each step:

- [ ] B7.5 physical reorg (approve folder tree above)
- [ ] B8 PlanEditor modularization
- [ ] B9 tables
- [x] B10 types
- [x] B11 workspace further split
- [x] B12 cleanup / branding refs
- [x] B13 integration/E2E
- [x] B14 docs/rules/agents
- [ ] Still: no remote schema/RPC changes; no commits without ask
