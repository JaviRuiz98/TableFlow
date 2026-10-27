# Refactor Progress

| Stage | Status |
|-------|--------|
| ETAPA A — Audit & design | **DONE** (2026-10-27) |
| ETAPA B — Modular refactor | **IN PROGRESS** on `main` (no feature branch, per authorization) |
| ETAPA C — Docs & agents | Partial drafts exist under `docs/architecture/`; full module docs + Cursor rules pending |
| ETAPA D — Cleanup & final validation | Not started |

## Modules

| Module | Status |
|--------|--------|
| Tooling baseline (B0) | **DONE** — see [B0_TOOLING.md](./B0_TOOLING.md) |
| infrastructure (B1) | **DONE** — see [B1_INFRASTRUCTURE.md](./B1_INFRASTRUCTURE.md) |
| orders (B2) | **DONE** — see [B2_ORDERS.md](./B2_ORDERS.md) · [../modules/orders.md](../modules/orders.md) |
| products (B3) | **DONE** — see [B3_PRODUCTS.md](./B3_PRODUCTS.md) · [../modules/products.md](../modules/products.md) |
| users (B4) | **DONE** — see [B4_USERS.md](./B4_USERS.md) · [../modules/users.md](../modules/users.md) |
| notifications (B5) | **DONE** — see [B5_NOTIFICATIONS.md](./B5_NOTIFICATIONS.md) · [../modules/notifications.md](../modules/notifications.md) |
| floor-plans (B6) | **DONE** — see [B6_FLOOR_PLANS.md](./B6_FLOOR_PLANS.md) · [../modules/floor-plans.md](../modules/floor-plans.md) |
| workspace-shell (B7) | **DONE** — see [B7_WORKSPACE.md](./B7_WORKSPACE.md) · [../modules/workspace.md](../modules/workspace.md) |
| folder reorg (B7.5) | **DONE** — `floor-editor/` split from `floor-plans/` (physical move only) |
| floor-editor B8.1 audit | **DONE** — see [B8_FLOOR_EDITOR.md](./B8_FLOOR_EDITOR.md) |
| floor-editor B8.2 geometry | **DONE** — `floor-editor/geometry/` |
| floor-editor B8.3 canvas | **DONE** — `floor-editor/canvas/` |
| floor-editor B8.4 tools | **DONE** — `floor-editor/tools/` |
| floor-editor B8.5 history | **DONE** — `floor-editor/history/` |
| floor-editor B8.6 integration | **DONE** — B8 closed · [B8_FLOOR_EDITOR.md](./B8_FLOOR_EDITOR.md) · [../modules/floor-editor.md](../modules/floor-editor.md) |
| tables (B9) | **DONE** — [B9_TABLES.md](./B9_TABLES.md) · [../modules/tables.md](../modules/tables.md) |
| types hardening (B10) | **DONE** — [B10_TYPES.md](./B10_TYPES.md) (BOOTSTRAP-aligned `database.types`; no live gen) |
| workspace further (B11) | **DONE** — [B11_WORKSPACE.md](./B11_WORKSPACE.md) · [../modules/workspace.md](../modules/workspace.md) |
| cleanup (B12) | **DONE** — [B12_CLEANUP.md](./B12_CLEANUP.md) |
| integration/E2E (B13) | **DONE** — [B13_TESTING.md](./B13_TESTING.md) · [../testing/TEST_MATRIX.md](../testing/TEST_MATRIX.md) |
| docs/rules/agents (B14) | **DONE** — [B14_AGENTS.md](./B14_AGENTS.md) · [../agents/AGENT_MAP.md](../agents/AGENT_MAP.md) |
| agents polish (B14.1) | **DONE** — descriptions + products/workspace boundary · [B14_AGENTS.md](./B14_AGENTS.md#b141--agent-description--boundary-polish) |
| components audit (C0) | **DONE** — [COMPONENT_ARCHITECTURE_AUDIT.md](./COMPONENT_ARCHITECTURE_AUDIT.md) |
| floor-editor UI split (C1) | **DONE** — children + helpers; PlanEditor 648 TS exception · [COMPONENT_REFACTOR_PLAN.md](./COMPONENT_REFACTOR_PLAN.md) |
| workspace UI split (C2) | **DONE** — plan/catalog/alert children; shell 316 TS |
| other components (C3) | **DONE** — no-op (already within caps) |
| component closeout (C4) | **DONE** — LOC gate, docs/agents, 185 Vitest / 4 e2e |
