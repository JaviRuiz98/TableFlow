# Component refactor plan (C0–C4)

**Status:** **C0–C4 COMPLETE** (awaiting commit authorization)  
**Branch:** `main`  
**Audit:** [COMPONENT_ARCHITECTURE_AUDIT.md](./COMPONENT_ARCHITECTURE_AUDIT.md)

Hard rules: no Sala Chocolatte; no remote schema/RPC/RLS/Edge; no unrequested UI/business changes; no commit/push without auth; sole Konva Stage owner = PlanEditor.

---

## Outcome summary

| Phase | Result |
|-------|--------|
| C0 | Inventory + trees + contracts documented |
| C1 | Floor-editor UI children + non-Angular helpers; PlanEditor **648 TS** |
| C2 | Workspace children; shell **316 TS** |
| C3 | No further splits (service-only modules / small components) |
| C4 | LOC gate, docs/agents, **185** Vitest / **4** Playwright / lint / build |

### Soft-cap table (as-built)

| Component | TS | Status |
|-----------|---:|--------|
| `PlanEditorComponent` | **648** | **Approved exception** (Stage coordinator) |
| All other components | ≤406 | ≤500 |

---

## Authorization log

| Phase | Authorized? | Date |
|-------|-------------|------|
| C0 | Yes | 2026-10-27 |
| C1–C4 | Yes (“termina todas las tareas”) | 2026-10-27 |

---

## C1 — FloorEditor (done)

Extracted Angular children:

- `components/editor-toolbar/`
- `components/plan-editor-dialogs/`
- `components/order-attention-dialog/`

Extracted non-Angular helpers (Stage still owned by PlanEditor):

- `plan-editor-renderer.ts`
- `plan-editor-viewport.ts`
- `plan-editor-drawing.ts`
- `plan-editor-delete.facade.ts`
- `plan-editor-host.ts`

Public API unchanged: `plan`, `mode`, `hideSurface`, `pendingChanged`, `saveDesign`, `openOperationalTarget`.

---

## C2 — Workspace (done)

- `components/workspace-plan-admin-dialogs/`
- `components/workspace-catalog-panel/`
- `components/workspace-user-alert-modal/`
- `WorkspaceUserAdminComponent` preserved

Shell keeps tabs, Realtime, ViewChild PlanEditor, toast aggregation, role gates.

---

## C3 — Other (done / no-op)

No splits for Login, App, TableProductPanel, UserAdmin, or service-only features.

---

## C4 — Closeout (done)

- Re-measured LOC; single exception documented  
- Module docs + agents/rules + MODULE_MAP updated  
- `npm test` 185 · `lint` · `build` · `e2e` 4  

### Manual QA still recommended

ADMIN/USER shell, Konva zoom/draw/endpoints, order modal, plan/catalog dialogs, password delete — automated suite does not replace gesture feel.

---

## Testing baseline

| Suite | C4 count |
|-------|----------|
| Vitest | **185** |
| Playwright | **4** |
