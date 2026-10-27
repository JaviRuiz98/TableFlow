# C0 — Component architecture audit

**Status:** DONE (audit/docs only — no component extractions)  
**Branch:** `main`  
**Date:** 2026-10-27  
**Rule target:** ≤500 lines TypeScript per Angular component (ideal 100–300), unless an approved exception is documented.

Related: [COMPONENT_REFACTOR_PLAN.md](./COMPONENT_REFACTOR_PLAN.md) · agents `/tableflow-orchestrator`, `/tableflow-floor-editor`, `/tableflow-workspace`

---

## 1. Scope and method

- Inventory: every `*.component.ts` under `src/app/` (excluding `*.spec.ts`).
- Line counts: physical lines per file (TS / HTML / SCSS measured separately). Inline templates count as TS only.
- Specialists: orchestrator + floor-editor + workspace (analysis only).
- **Not in scope of this audit as “components”:** feature services (`orders`, `products`, `tables`, `floor-plans`, `notifications`, `users`) — they have **no** Angular components today.

---

## 2. Complete component inventory (by TS size)

| # | Component | Path | TS | HTML | SCSS | Total | In | Out | Soft-cap |
|---|-----------|------|----|------|------|-------|----|-----|----------|
| 1 | `PlanEditorComponent` | `features/floor-editor/plan-editor.component.*` | **1643** | 412 | **1314** | 3369 | 3 | 1 | **FAIL** (>500) |
| 2 | `WorkspaceComponent` | `features/workspace/workspace.component.*` | **615** | 357 | 27 | 999 | 0 | 0 | **FAIL** (>500) |
| 3 | `TableProductPanelComponent` | `features/floor-editor/table-product-panel.component.*` | 223 | 142 | 97 | 462 | 1 | 1 | OK (ideal) |
| 4 | `WorkspaceUserAdminComponent` | `features/workspace/workspace-user-admin.component.*` | 165 | 77 | 3 | 245 | 0 | 1 | OK (ideal) |
| 5 | `LoginComponent` | `features/auth/login.component.ts` (inline tpl) | 122 | 0 | 0 | 122 | 0 | 0 | OK |
| 6 | `AppComponent` | `app.component.ts` | 9 | 0 | 0 | 9 | 0 | 0 | OK |

**Totals:** 6 components · **2** over 500 TS · **0** in the 300–500 band · 4 within ideal/OK.

### Modules without Angular components

| Module | UI? | Notes |
|--------|-----|--------|
| `orders` | No | Services + specs only |
| `products` | No | `ProductService` consumed by Workspace / PlanEditor |
| `tables` | No | Validation / deletion services |
| `floor-plans` | No | Persistence RPCs |
| `notifications` | No | Realtime service; alert **presentation** in Workspace |
| `users` | Partial | `UserAdminService`; UI is `WorkspaceUserAdminComponent` |
| Shared/`core` | No components beyond `AppComponent` | |

**C3 implication:** no artificial `components/` trees for service-only modules.

---

## 3. Components over 500 lines — detail

### 3.1 `PlanEditorComponent` (1643 TS)

**Role today:** sole Konva Stage owner + editor/operativo chrome + order attention UI + lock/delete dialogs + history wiring.

| Cluster | Approx TS | Coupling |
|---------|-----------|----------|
| Workspace I/O + permission getters | ~100 | Stable public API |
| Model arrays (elements/tables/reserved/drawing/tool/history) | fields | SSoT |
| Stage lifecycle (`load`/`initStage`/RO/teardown) | ~90 | **Must stay** |
| `render` + table/reserved nodes + drag/endpoints | **~390** | **Must stay with Stage** |
| Pointer drawing / text place | ~120 | Must stay with Stage host |
| Viewport (zoom/fit/pinch) | ~100 | Stage mutations here; math in `canvas/` |
| History wiring | ~40 | Arrays here; ops in `history/` |
| Toolbar actions (setTool/add/delete/save) | ~80 | UI extractable; mutations stay |
| Lock / unlock dialog | ~40 | Presentational extract |
| Password + served delete dialogs | ~90 | Presentational extract |
| Order attention modal + catalog/qty/realtime helpers | **~260** | Strong extract candidate (no Stage) |
| Template chrome | HTML 412 | Toolbar + canvas host + dialogs |

**Dependencies (inject / services):** `FloorPlanService`, `OrderService`, `ProductService`, `AuthService`, `TableDeletionService`, Geometry/canvas/tools/history utils, Konva.

**Children today:** none (dialogs inline). Sibling: `TableProductPanelComponent` (composed by Workspace).

**Public API (preserve):** `@Input plan|mode|hideSurface`, `@Output pendingChanged`, `saveDesign()`, `openOperationalTarget()`.

### 3.2 `WorkspaceComponent` (615 TS)

**Role today:** shell — tabs, presentation, plan list, catalog CRUD dialogs, USER alert modal, Realtime wiring, ViewChild PlanEditor + user-admin.

| Cluster | Approx TS | Action |
|---------|-----------|--------|
| Init / teardown / tabs / toast / logout | ~110 | Stay (shell) |
| Editor coordination (ViewChild, modes) | ~30 | Stay |
| Plan list open/select | ~20 | Stay (thin) |
| Plan admin dialogs (create/copy/rename/delete) | ~120 | **Extract** |
| Catalog UI + edit/delete dialogs | ~180 | **Extract** |
| USER alert show/ack | ~15 | Optional extract |
| User admin | 0 | Already `WorkspaceUserAdminComponent` (B11) |

**Dependencies:** `FloorPlanService`, `PlanDuplicationService`, `ProductService`, `OrderService`, `OrderNotificationService`, `AuthService`, router; ViewChild `PlanEditorComponent`, `WorkspaceUserAdminComponent`.

---

## 4. Smaller components — mixed responsibilities?

| Component | Verdict |
|-----------|---------|
| `TableProductPanelComponent` (223) | Coherent: list/assign products for tables. **No split.** |
| `WorkspaceUserAdminComponent` (165) | Coherent (B11). **Freeze contract** (`openAccess` / `reset` / `toastMessage`). |
| `LoginComponent` (122) | Single form submit. **No split.** |
| `AppComponent` (9) | Router host. **No split.** |

---

## 5. Responsibilities that should be extracted

### Floor-editor (C1)

| Extract | Kind | Why |
|---------|------|-----|
| Editor toolbar (editor + operativo chrome) | Subcomponent | Presentation + events; no Stage |
| Text size control | Part of toolbar or small child | Controlled input → parent mutates model |
| Add-text / unlock / delete-password / served-warning / save-success dialogs | Subcomponents | Overlay UI only |
| Order attention dialog (`ion-modal` body) | Subcomponent | ~260 TS + large HTML; services stay in parent or thin façade |
| Product grouping helpers | Pure utils (optional) | Dedupe vs panel — not a component |

**Do not extract as Angular Stage owners:** `render*`, pointer handlers, viewport Stage mutations, `initStage`, history arrays.

### Workspace (C2)

| Extract | Kind | Why |
|---------|------|-----|
| Plan admin dialogs | Subcomponent | ~120 TS; clear boundary |
| Catalog panel + dialogs | Subcomponent | ~180 TS; ADMIN catalog UI |
| USER alert modal | Optional subcomponent | Thin presentation |

**Do not extract:** tab gate logic ownership, Realtime subscribe/unsubscribe, ViewChild PlanEditor, logout orchestration.

### C3

No mandatory extractions. Revisit only if new UI components appear in other features.

---

## 6. Target folder structures (proposed)

### Floor-editor

```text
features/floor-editor/
  index.ts                         # public: PlanEditor + TableProductPanel
  plan-editor.component.*          # Stage coordinator (may remain at root for stable imports)
  table-product-panel.component.*
  geometry/  canvas/  tools/  history/   # keep (B8)
  components/
    editor-toolbar/
    dialogs/
      add-text-dialog/
      unlock-plan-dialog/
      delete-password-dialog/
      served-delete-warning-dialog/
      save-success-dialog/
    order-attention-dialog/
```

Optional later: move `plan-editor` under `components/plan-editor/` **only** if barrel/`Workspace` imports stay stable.

### Workspace

```text
features/workspace/
  workspace.component.*            # shell coordinator
  workspace-user-admin.component.* # B11 — preserve API (path move optional)
  workspace-*.util.ts
  workspace-dialog.styles.scss
  index.ts
  components/
    workspace-plan-admin-dialogs/
    workspace-catalog-panel/
    workspace-user-alert-modal/    # optional
```

---

## 7. Parent ↔ child contracts (draft)

### PlanEditor → children

**`EditorToolbar`**
- In: `mode`, `tool`, `toolLabel`, edit/admin flags, lock, zoom/undo/redo enables, selection summary, `selectedTextFontSize?`
- Out: `setTool`, `save`, `toggleLock`, `delete`, `clearDrawing`, `addTable`, `addReserved`, `undo`, `redo`, `zoom`, `textFontSizeChange`

**Dialogs (common)**
- In: `open` + field payloads  
- Out: `cancel` / `confirm` (+ payload)

**`OrderAttentionDialog`**
- In: open, target, permission flags, observation + order ViewModel (groups, product groups, maps)
- Out: dismiss, saveObservation, markAttended, qty/remove/add, draft changes  
- Parent retains: `OrderService` / attended-observation RPCs / `pendingChanged` / `render` color refresh

**Workspace-facing API** — unchanged after C1.

### Workspace → children

**`WorkspaceUserAdminComponent`** — freeze: `openAccess()`, `reset()`, `toastMessage`.

**`WorkspacePlanAdminDialogs`**
- Imperative open* / `reset()`  
- Out: `toastMessage`, `plansUpdated`, `planCreated` (parent navigates)

**`WorkspaceCatalogPanel`**
- Owns catalog UI state; injects `ProductService`  
- Out: `toastMessage`; `reset()` from shell

**`WorkspaceUserAlertModal`**
- In: `open`, copy; Out: `acknowledged`  
- Realtime subscription stays in shell

---

## 8. State ownership

| State | Owner |
|-------|--------|
| Konva Stage / layers / RO / pointer / viewport Stage position | `PlanEditorComponent` only |
| Geometry model arrays + `tool` + history stack | `PlanEditorComponent` |
| Pending order map / table colors | `PlanEditorComponent` (emits `pendingChanged`) |
| Shell tabs / `editorMode` / `selectedPlan` / `plans` list | `WorkspaceComponent` |
| User-admin dialogs/forms | `WorkspaceUserAdminComponent` |
| Plan/catalog dialog open flags (today in shell) | Move with C2 children |
| Auth session / role | `AuthService` |

---

## 9. Regression risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Second Konva Stage / split `render` | Critical | Forbidden in C1; sole-owner rule in agents/docs |
| SCSS encapsulation break when moving HTML | High | Move selectors with host; prefer shared dialog partial SCSS; visual QA |
| Ionic modal/`ion-button` event bubbling | Medium | Keep `(didDismiss)` semantics; characterization |
| ADMIN/USER tab gates altered | High | No nav/visual auth; tests on `shellVisibility` |
| ViewChild PlanEditor lost after template move | High | Keep `#editor` on shell host |
| Order realtime double-subscribe (panel + editor) | Medium | Do not unify channels casually |
| Undo/redo / zoom feel regressions | High | Manual QA checklist; util specs ≠ gestures |
| Public barrel / Workspace import path break | Medium | Keep `index.ts` exports stable |

---

## 10. Characterization tests (before extractions)

### Before C1 (floor-editor)

Extend beyond `plan-editor.history.spec.ts`:
- Workspace contracts: `saveDesign`, `openOperationalTarget`, `pendingChanged`
- Permissions: `canEditGeometry` / tool locks
- Dialogs: text add, lock unlock, password/served delete (mocked `TableDeletionService`)
- Order dialog open/close + attended gate
- `ngOnDestroy` teardown
- Manual: wheel/pinch/draw-after-zoom/endpoints (doc B8)

### Before C2 (workspace)

Strengthen `workspace.component.spec.ts`:
- Rename/remove selected plan sync
- `toggleEditorMode` save fail/success
- Alert acknowledge → operativa
- Transient reset closes all dialogs
- Keep user-admin + orders-integration specs green

---

## 11. Exceptions to the 500-line rule (proposed for approval)

| Component | Post-refactor estimate | Exception? | Justification |
|-----------|------------------------|------------|---------------|
| `PlanEditorComponent` | **~700–950 TS** after C1 UI extractions | **Yes — request approval at C1 exit** | Stage + `render` (~390) + pointer/viewport/history wiring cannot be split safely without a Konva harness and explicit auth. Soft cap applies to extractable chrome; coordinator is the documented exception. |
| `WorkspaceComponent` | **~320–400 TS** after C2 A+B | **No** | Reachable under 500 with plan+catalog extractions. |
| `OrderAttentionDialog` (new) | 250–350 TS | No | Must stay under 500. |
| Others | Already <300 | No | — |

**SCSS note:** `plan-editor.component.scss` (1314) is out of the TS soft-cap but is a maintainability hotspot. C0 does **not** authorize restyle; optional later “style partials” only if encapsulation-safe and authorized.

---

## 12. Agent / docs impact (after authorized phases)

| When | Update |
|------|--------|
| C1 done | `docs/modules/floor-editor.md`, `.cursor/agents/tableflow-floor-editor.md`, `floor-editor.mdc`, MODULE_MAP |
| C2 done | `docs/modules/workspace.md`, workspace agent/rule, MODULE_MAP |
| C4 | This audit “as-built”, AGENT_MAP paths, TEST_MATRIX new specs |

---

## 13. Explicit non-actions (C0)

Historical: C0 was audit-only. **C1–C4 completed 2026-10-27** (see plan).

---

## 14. As-built inventory (C4)

| Component | TS | HTML | SCSS | Cap |
|-----------|---:|-----:|-----:|-----|
| `PlanEditorComponent` | **648** | 72 | 71 | **Exception (Stage)** |
| `OrderAttentionDialogComponent` | 406 | 209 | 939 | OK |
| `WorkspaceComponent` | 316 | 166 | 24 | OK |
| `WorkspaceCatalogPanelComponent` | 257 | 102 | 7 | OK |
| `TableProductPanelComponent` | 223 | 142 | 97 | OK |
| `WorkspacePlanAdminDialogsComponent` | 179 | 89 | 3 | OK |
| `WorkspaceUserAdminComponent` | 165 | 77 | 3 | OK |
| `LoginComponent` | 122 | 0 | 0 | OK |
| `PlanEditorDialogsComponent` | 48 | 128 | 176 | OK |
| `EditorToolbarComponent` | 46 | 58 | 162 | OK |
| `WorkspaceUserAlertModalComponent` | 22 | 17 | 3 | OK |
| `AppComponent` | 9 | 0 | 0 | OK |

**12 components · 1 approved exception · 0 unauthorized >500.**

### Approved exception

`PlanEditorComponent` at **648 TS**: sole Konva Stage owner + Angular wiring to children/helpers. Further Angular splits of `render`/Stage lifecycle rejected as unsafe without a dedicated Konva harness and explicit auth.
