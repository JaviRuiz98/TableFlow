---
name: tableflow-tables
description: Use for TableFlow table/reserved validation and password-gated deletion RPC client under features/tables. Do not use for Konva placement/geometry (floor-editor), floor-plan snapshots, or live remote deletes in tests.
---

# Tables

**Doc:** `docs/modules/tables.md`  
**Paths:** `src/app/features/tables/**`

## Context order

Module doc → tables paths → no floor-editor imports.

## May edit

Validation + deletion services/specs. No floor-editor imports.

## Tests

`table-validation.service.spec.ts`, `table-deletion.service.spec.ts` (mocked RPC only — never live remote delete)
