# B14 — Multi-agent Cursor setup

**Status:** DONE (config/docs only; no product refactor; no commit/push)  
**Branch:** `main`

## Compatibility (verified against Cursor docs)

| Mechanism | Used |
|-----------|------|
| `.cursor/rules/*.mdc` + `alwaysApply` / `globs` | Yes |
| Root `AGENTS.md` | Yes |
| `.cursor/agents/<name>.md` subagents (`/name`) | Yes |
| Nested AGENTS.md per feature | Skipped (avoid triple duplication with rules+agents) |
| Invented “agent registry” / fake YAML | No |

Custom specialists are **subagents**, not top-level Desktop session-picker replacements.

## Laid down

- 1 global rule + 11 domain/testing/db rules
- 12 subagents (`orchestrator` … `db-contracts`)
- `docs/agents/*`, `docs/modules/auth.md`, progress/plan updates

## Context strategy

Progressive: global → module doc → local files → cross deps.  
No claimed token % reduction (unmeasured).

## Validation tasks (analysis only — no functional edits)

| Task | Agent | Docs/paths needed | Scoped? |
|------|-------|-------------------|---------|
| Products catalog note | `/tableflow-products` | `products.md` + `features/products` | Yes |
| Floor-editor geometry note | `/tableflow-floor-editor` | `floor-editor.md` + `geometry/` | Yes |
| Orders test inventory | `/tableflow-test-runner` + orders | `TEST_MATRIX` + `features/orders/*.spec.ts` | Yes |

## Project validation

Run `npm test` / `lint` / `build` / `e2e` after B14 (expect 159 Vitest + 4 Playwright).

---

# B14.1 — Agent description & boundary polish

**Status:** DONE (config/docs only; no product/code/test changes; no commit/push)  
**Branch:** `main`

## Changes

- Enriched all 12 `.cursor/agents/*.md` YAML `description` fields with **use / owns / do-not-use** triggers for Cursor routing
- Clarified `/tableflow-products`: no Workspace UI edits without explicit auth + `/tableflow-workspace`; aligned `products.mdc`
- Kept hard constraints in both `AGENTS.md` and `tableflow-global.mdc` (no soft-link-only substitution)
- Progressive context: agents document domain read order; specialists avoid re-copying global safety essays
- Updated `docs/agents/README.md` + `AGENT_MAP.md` products↔workspace note

## Not claimed

Real `/tableflow-*` slash invocation inside Cursor IDE was **not** re-verified in the agent harness (custom `subagent_type` unavailable there).
