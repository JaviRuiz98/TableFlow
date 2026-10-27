# TableFlow — agent instructions (repo root)

Prefer **scoped** work. Do not load the entire repository for a single-module task.

## Progressive context

1. This file + always-applied Cursor rule `tableflow-global` (both carry hard constraints — keep them effective; do not drop either)
2. `docs/modules/<domain>.md` for the assigned domain
3. Files under that domain’s paths (see `.cursor/agents/` or MODULE_MAP)
4. Cross-module deps only when the task requires them (`docs/architecture/DEPENDENCY_MAP.md`)

Domain globs load `.cursor/rules/<domain>.mdc` when matching files are in context. Specialist briefs live in `.cursor/agents/` — they add **domain** may-edit / forbidden / tests, not a second copy of global safety.

## Hard constraints

- Branch: **`main` only**. No commits/pushes unless the user authorizes.
- Preserve WIP. Do not revert unrelated changes.
- **TableFlow** Supabase only — never write to Sala Chocolatte / CreadorSala.
- No remote DB / RPC / RLS / Edge / migration changes without explicit authorization.
- No UI/visual/navigation/business-rule changes unless requested.
- Prefer small, testable diffs. Keep public APIs stable or warn first.
- Run relevant tests for touched modules; never weaken assertions to force green.
- No secrets in the repo or chat dumps of `.env` values.

## Maps

- Modules: `docs/modules/README.md`
- Agents: `docs/agents/AGENT_MAP.md`
- Tests: `docs/testing/TEST_STRATEGY.md`
- Deps: `docs/architecture/DEPENDENCY_MAP.md`

## Invoke specialists

Custom subagents: `.cursor/agents/*.md` via `/tableflow-<domain>` (e.g. `/tableflow-orders`).  
Orchestration: `/tableflow-orchestrator`. Testing: `/tableflow-test-runner`.  
They are **subagents**, not Desktop session-picker top-level entries.
