# Architectural Decisions (ADR)

## ADR-001 — Feature-based modularization without Nx/NgRx

**Status:** Accepted (plan)  
**Context:** Small/medium Angular app with two oversized components.  
**Decision:** Reorganize by feature folders; keep signals + services; no Nx/NgRx.  
**Consequence:** Lower tooling churn; agents scoped by folder globs.

## ADR-002 — Behaviour freeze during refactor

**Status:** Accepted  
**Decision:** No UX/style/RPC/RLS/Realtime contract changes in Etapa B–D unless separately authorized.  
**Consequence:** Prefer move/extract over rewrite; characterization tests first on hotspots.

## ADR-003 — Supabase access only via services (target)

**Status:** Proposed  
**Context:** PlanEditor calls `orders.db.client` directly.  
**Decision:** Route all PostgREST/RPC through domain services.  
**Consequence:** Clearer agent boundaries; easier mocking.

## ADR-004 — Schema-only reservations domain

**Status:** Accepted  
**Decision:** Keep `reservations` table/types; no UI module until product asks.  
**Consequence:** Avoid empty feature scaffolding.

## ADR-005 — TableFlow-only data plane

**Status:** Accepted  
**Decision:** Frontend env + ops target TableFlow project; Sala Chocolatte is read-inventory-only when authorized.  
**Consequence:** Hard rule in Cursor global guidance.
