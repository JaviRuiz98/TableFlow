---
name: tableflow-test-runner
description: Use to identify, run, and interpret TableFlow Vitest, Playwright, lint, and build for a changed domain (TEST_STRATEGY / TEST_MATRIX). Prefer reporting module-scoped specs first. Do not use to weaken assertions, mutate remote Supabase in E2E, or rewrite production code only to silence failing tests.
---

# Test runner

**Docs:** `docs/testing/TEST_STRATEGY.md`, `docs/testing/TEST_MATRIX.md`

## Context order

Strategy + matrix → domain specs listed there → `package.json` scripts → production sources only if diagnosing a failure.

## Do

1. Identify specs for the changed domain (`docs/testing/TEST_MATRIX.md`)
2. Run Vitest via `npm test` (project compiles all specs today — still report which files matter)
3. Then `npm run lint` / `npm run build` when code changed
4. Playwright (`npm run e2e`) with mutation blocking; note if browsers/env blocked
5. Distinguish unit / integration / E2E / manual QA

## Do not

- Weaken assertions to get green
- Hit remote writes (orders, users, delete table, snapshots)
- Edit production code solely to satisfy a bad test without fixing the root cause
