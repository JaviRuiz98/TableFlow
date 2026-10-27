# Test strategy (TableFlow)

## Layers

| Layer | Tool | Location | Remote Supabase writes |
|-------|------|----------|------------------------|
| Unit / util | Vitest + jsdom | `src/**/*.spec.ts` | Never (pure or mocked) |
| Service / integration (mocked) | Vitest | feature + `src/testing/` | Never |
| E2E smoke | Playwright | `e2e/` | Mutations **blocked** via `blockSupabaseMutations` |

## Commands

```bash
npm test                 # all Vitest (Angular unit-test builder)
npm run lint
npm run build
npm run e2e              # Playwright (starts ng serve if needed)
```

Filter by path (Vitest via Angular builder may still compile all; prefer descriptive `describe` names for agents):

- Auth: `src/app/core/auth/`, `src/app/core/guards/`
- Orders: `src/app/features/orders/`
- Floor plans: `src/app/features/floor-plans/`
- Workspace: `src/app/features/workspace/`
- Editor utils: `src/app/features/floor-editor/**/*.spec.ts`
- Shared fixtures: `src/testing/`

## Fixtures & mocks

- `src/testing/fixtures.ts` — domain samples
- `src/testing/supabase-query-mock.ts` — thenable PostgREST builder
- `e2e/helpers/network-safety.ts` — abort POST/PATCH/PUT/DELETE to Supabase

## Konva / editor

- **Covered as math/utils:** viewport zoom/coords, geometry, tools policy, history stacks, stage lifecycle teardown.
- **Not covered as real canvas interaction in jsdom:** drag, draw gestures, Konva Stage hit-testing.
- Do not claim graphic interaction coverage from util specs alone.

## Safety rules

- No production/remote TableFlow mutations in tests.
- No Sala Chocolatte access.
- No secrets in fixtures.
- Deterministic: fake timers where debounce matters (notifications).

## Manual checklist

See [TEST_MATRIX.md](./TEST_MATRIX.md) and [../refactoring/B13_TESTING.md](../refactoring/B13_TESTING.md).
