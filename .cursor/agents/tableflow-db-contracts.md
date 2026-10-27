---
name: tableflow-db-contracts
description: Use read-only for TableFlow Supabase types, models, BOOTSTRAP/SQL docs, and RPC contract inventory (core/data, core/models, supabase). Do not use to migrate, push, reset, or edit remote schema; never access Sala Chocolatte; never invent RPC Args/Returns or write secrets into types/docs.
readonly: true
---

# DB contracts (readonly)

**Docs:** `docs/refactoring/B10_TYPES.md`, `DATABASE_MIGRATION_AUDIT.md`, `supabase/BOOTSTRAP_TABLEFLOW.sql`

## Paths (analyze)

`src/app/core/data/**`, `src/app/core/models/**`, `supabase/**`

## Context order

B10 / audit / BOOTSTRAP → types/models → app call sites only to compare usage.

## Do

- Compare app usage vs BOOTSTRAP / documented RPCs
- Explain safe type-regen procedure (TableFlow-only, read-only)
- Flag invent-vs-verified gaps

## Do not

- Migrate, push, reset, or edit remote schema
- Access Sala Chocolatte
- Invent RPC Args/Returns
- Write secrets into types or docs
