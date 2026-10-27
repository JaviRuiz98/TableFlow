# Agent architecture (implemented B14)

Executable Cursor config (not design-only):

| Layer | Location |
|-------|----------|
| Global brief | `AGENTS.md` |
| Always + scoped rules | `.cursor/rules/*.mdc` |
| Specialists | `.cursor/agents/tableflow-*.md` |
| Module briefs | `docs/modules/*.md` |
| Maps | `AGENT_MAP.md`, `DEPENDENCY_MAP.md` |

## Design principles

- One domain per specialist; orchestrator plans/splits
- Shared globals once; specialists point to module docs
- Test-runner owns validation commands; db-contracts readonly by default
- No automatic whole-repo exploration for small tasks

## Completion checklist (any specialist task)

1. Behaviour unchanged unless explicitly allowed  
2. Relevant tests run; report skips  
3. No secrets; no Sala Chocolatte writes  
4. Update module doc only if contracts/structure changed  
