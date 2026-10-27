# Test Report — Baseline (ETAPA A)

**Date:** 2026-10-27

## Commands executed

| Command | Result | Notes |
|---------|--------|-------|
| `npm run build` | **PASS** (B0 recheck) | Warnings: unused `IonLabel`/`IonSelect`/`IonSelectOption` in PlanEditor; initial bundle >1MB budget |
| `npm test` | **PASS** (B0) | **7/7** after adding `jsdom` |
| `npm run lint` | **PASS** (B0) | Ignores expanded to native/build trees; source rules unchanged |
| `npm run e2e` | **NOT RUN** | Deferred; no destructive remote tests |

## Existing automated tests

| File | Intent |
|------|--------|
| `geometry.service.spec.ts` | Geometry helpers |
| `table-validation.service.spec.ts` | Unique numbers / clamp |
| `order-state.service.spec.ts` | Transitions / pending qty |
| `e2e/app.spec.ts` | Login page title contains `Discoteca` |

## Gaps vs refactor needs

- No characterization tests for PlanEditor / Workspace / Realtime filters / RPC wrappers.
- E2E does not cover auth success, orders, or admin flows.
- Cannot claim “tests still pass” until `jsdom` is added (Etapa B step 0).

## Safe testing policy

- Unit/integration: mock Supabase; no remote writes.
- E2E against TableFlow remote: **authorization required**.
- Never target Sala Chocolatte.
