# TableFlow agents (Cursor)

## How to use

1. Keep tasks **module-scoped** when possible.
2. Start with `/tableflow-orchestrator` for multi-domain work.
3. Or invoke `/tableflow-<domain>` directly (e.g. `/tableflow-products`).
4. For QA: `/tableflow-test-runner`. For schema/types analysis: `/tableflow-db-contracts` (readonly).

## Routing hints

Each `.cursor/agents/*.md` `description` states **when to use**, **what it owns**, and **when not to use** it. Prefer the specialist whose description matches the task; do not stretch a domain agent into another module’s UI or RPCs.

Notable boundaries:

- `/tableflow-products` owns catalog **data** (`ProductService`). Catalog **UI** is `/tableflow-workspace` — products must not edit `features/workspace` without explicit authorization and that agent.
- `/tableflow-onboarding` owns ADMIN checklist / flags / entry guards; guided shell chrome in workspace needs `/tableflow-workspace`.
- `/tableflow-admin-dashboard` owns `/admin/*` KPIs/shell; operative `/sala` stays `/tableflow-workspace`.
- Company registration UI (`registro-empresa`) is `/tableflow-auth`, not onboarding.


## What loads automatically

- Root `AGENTS.md` (hard constraints — keep in sync with intent of global rule)
- Rule `tableflow-global.mdc` (`alwaysApply: true`) — do not replace this with links alone
- Domain `.mdc` rules when matching `globs` are in context

## What to read (progressive)

Global → `docs/modules/<domain>.md` → domain source → deps only if needed (`DEPENDENCY_MAP.md`).

## Do not

- Expect custom agents as the main Desktop “Agent session” picker entries — they are **subagents** (`/name`).
- Duplicate long global safety essays into every specialist (kept in `AGENTS.md` + `tableflow-global`).
- Remove hard constraints from `AGENTS.md` or the always-apply rule in favor of soft references.
- Invent unsupported Cursor config files.

See [AGENT_MAP.md](./AGENT_MAP.md) · [AGENT_ARCHITECTURE.md](./AGENT_ARCHITECTURE.md) · [B14_AGENTS.md](../refactoring/B14_AGENTS.md).
