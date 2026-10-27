# Dependency Map

## Allowed direction (target)

```text
features/*  →  core/* , shared/*
shared/*    →  core/models , core/infrastructure (avoid feature imports)
core/*      →  other core only (no features)
data-access →  infrastructure + models
```

## Forbidden (to prevent cycles)

- `core` importing `features`
- `features/orders` importing `features/floor-editor` UI
- `shared` importing any `features/*`

## Current reality (debt)

| From | To | Status |
|------|----|--------|
| `PlanEditorComponent` | `OrderService` / `ProductService` public APIs | **OK (B2/B3)** |
| `WorkspaceComponent` | Feature modules + `core/auth` + infrastructure | **OK (B7)** — shell coordinator; no private Supabase peek |
| `TableProductPanel` | FloorPlan / Product / Order / Auth | OK |
| Catalog consumers | `features/products` | **OK (B3)** |
| Workspace user admin | `features/users` | **OK (B4)** — separate from `core/auth` |
| Workspace alerts | `features/notifications` | **OK (B5)** — distinct from `OrderService.subscribe` |
| Workspace / editor | `features/floor-plans` services | **OK (B6)** — editor UI still co-located |
| `PlanDuplicationService` | `FloorPlanService` | OK |
| Domain services / auth / workspace | `core/infrastructure` (`SupabaseService`, `ErrorMessageService`) | OK (B1) |

## External packages (feature touchpoints)

| Package | Consumers |
|---------|-----------|
| `@supabase/supabase-js` | infrastructure + services |
| `konva` | floor-editor only |
| `@ionic/angular/standalone` | feature templates |
| `@capacitor/*` | native shell / config (not deep in features today) |
