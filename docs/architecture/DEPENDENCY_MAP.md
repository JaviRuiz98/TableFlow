# Dependency Map

**Plan:** [../refactoring/REFACTOR_PLAN.md](../refactoring/REFACTOR_PLAN.md) · **Modules:** [MODULE_MAP.md](./MODULE_MAP.md) · **Cleanup:** [../refactoring/B12_CLEANUP.md](../refactoring/B12_CLEANUP.md)

## Allowed direction (target)

```text
features/floor-editor  →  features/floor-plans , features/tables (after B9) , features/orders ,
                          features/products , core/*
features/workspace     →  features/* (coordination) , core/*
features/tables        →  core/infrastructure , core/models  (not floor-editor)
features/floor-plans   →  core/infrastructure , core/models , core/data  (NOT floor-editor)
features/orders|products|users|notifications → core/* ; avoid editor UI
shared/*               →  core/models , core/infrastructure
core/models            →  core/data (enums / Database aliases only; B10)
core/* (rest)          →  other core only (no features)
```

## Forbidden (cycles / layering)

| Edge | Why |
|------|-----|
| `core` → `features` | Breaks layering |
| `floor-plans` → `floor-editor` | Persistence must not depend on UI |
| `orders` / `products` / `notifications` → `floor-editor` | Domain I/O ≠ canvas |
| `tables` → `floor-editor` | Tables helpers used by editor, not the reverse owner |
| `shared` → `features/*` | Shared stays feature-agnostic |
| UI components → raw `SupabaseClient` | Use infrastructure + feature services |

## Current reality (post B7.5)

| From | To | Status |
|------|----|--------|
| `features/floor-editor` (`PlanEditor`, panel) | `floor-plans`, `orders`, `products`, `core/auth`, `./geometry|canvas|tools|history`, `features/tables` | **OK (B9)** |
| `features/tables` | `core/infrastructure`, `core/models` only | **OK (B9)** — no UI / no floor-editor |
| `floor-editor/geometry` | `core/models` only (no Konva) | **OK** |
| `floor-editor/canvas` | models + geometry `Point`; Konva types only in lifecycle util | **OK** — no Stage ownership |
| `floor-editor/tools` | models + geometry types | **OK** — no Konva |
| `floor-editor/history` | `core/models` only | **OK** — PlanEditor owns arrays |
| `floor-plans` → `floor-editor` | — | **Forbidden (verified absent)** |
| `WorkspaceComponent` | `floor-editor` barrel + other feature modules + auth + infrastructure | **OK** |
| `WorkspaceUserAdminComponent` | `users`, `core/infrastructure` (errors), workspace form utils | **OK (B11)** — no floor-editor |
| `PlanDuplicationService` | `FloorPlanService` | OK |
| Attended / observation RPCs | Still on `FloorPlanService` | **Documented debt** — optional later move into `tables` |
| Domain services / auth / workspace | `core/infrastructure` | OK (B1) |
| `core/models` → `core/data` | Enum re-exports | **OK (B10)** — models stay above features |
| Feature services → `database.types` (`Json`, `Tables`) | Boundary casts for jsonb / nested selects | **OK (B10)** — see B10_TYPES.md |
| `floor-plans` → `floor-editor` | — | **Must remain absent** |

## External packages

| Package | Consumers (target) |
|---------|-------------------|
| `@supabase/supabase-js` | `core/infrastructure` + feature services only |
| `konva` | `features/floor-editor` only |
| `@ionic/angular/standalone` | feature templates |
| `@capacitor/*` | native shell / config |

## Agent rule of thumb

Before adding an import: check this file → prefer public barrel of the **owning** module → never invent a shared global store for editor/workspace state.
