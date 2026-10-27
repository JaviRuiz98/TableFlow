# Future Specialized Agents (design only — not executable yet)

Each agent should load: `SYSTEM_OVERVIEW.md` + its module doc + scoped Cursor rule. **Not** the whole repo.

| Agent id | Responsibility | May modify | Min docs | Tests | Needs auth for |
|----------|----------------|------------|----------|-------|----------------|
| `tableflow-architect` | Cross-cutting structure, ADRs | `docs/**`, `.cursor/rules/**`, import boundaries | SYSTEM_OVERVIEW, MODULE_MAP, DEPENDENCY_MAP | build | Changing public routes / adding libs |
| `tableflow-auth` | Login, session, guard, identity domain | `features/authentication/**`, `core/auth/**`, `guards/**` | modules/auth.md | unit auth-identity; build | Changing 12h policy, Auth providers |
| `tableflow-floor-editor` | Konva editor internals | `features/floor-editor/**` | modules/floor-editor.md | geometry + characterization | Visual/UX changes |
| `tableflow-floor-plans` | Plan CRUD/lock/duplicate | `features/floor-plans/**` | modules/floor-plans.md | build | Schema/RPC |
| `tableflow-tables` | Table/reserved domain helpers | `features/tables/**` | modules/tables.md | validation helpers | Deletion password UX |
| `tableflow-reservations` | Future reservations UI | reserved until UI exists | schema notes in SUPABASE_INTEGRATION | — | Creating UI |
| `tableflow-products` | Catalog | `features/products/**` | modules/products.md | build | Delete-safe RPC semantics |
| `tableflow-orders` | Orders / assign / item updates | `features/orders/**` | modules/orders.md | order-state; mocks | RPC contract |
| `tableflow-realtime` | Notification channels | `features/notifications/**` | modules/notifications.md | filter unit tests | Changing alert UX |
| `tableflow-test-runner` | Tooling & CI tests | `*.spec.ts`, e2e, eslint/vitest config | TEST_REPORT | npm test/lint/build | Installing major deps; remote E2E |

## Completion conditions (per agent task)

1. Behaviour unchanged unless task explicitly allows otherwise.  
2. `npm run build` succeeds.  
3. Relevant unit tests run (once jsdom fixed).  
4. `REFACTOR_PROGRESS.md` / module doc updated if structure changed.  
5. No secrets committed; no Sala Chocolatte writes.

## Coordination note

Prefer **one domain agent per PR/session**. Architect agent reviews dependency direction after multi-file moves.
