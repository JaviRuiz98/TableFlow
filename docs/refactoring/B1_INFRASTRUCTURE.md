# B1 — `core/infrastructure`

**Date:** 2026-10-27  
**Branch:** `main`

## Goal

Place cross-cutting Supabase client and error humanization under `core/infrastructure` without behaviour change.

## Moves

| From | To |
|------|----|
| `src/app/core/services/supabase.service.ts` | `src/app/core/infrastructure/supabase.service.ts` |
| `src/app/core/services/error-message.service.ts` | `src/app/core/infrastructure/error-message.service.ts` |

Added barrel: `src/app/core/infrastructure/index.ts`  
Added specs: `*.service.spec.ts` for singleton / humanize smoke.

## Public API unchanged

- `@Injectable({ providedIn: 'root' })` retained
- Same constructors, fields, methods
- Single `createClient` in `SupabaseService` constructor only

## Documented follow-ups (not in B1)

- Deep `orders.db.client` access from PlanEditor (B2+ / orders module)
