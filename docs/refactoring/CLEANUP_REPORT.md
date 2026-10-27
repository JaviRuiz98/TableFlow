# Cleanup Inventory (Etapa A — no deletions yet)

Classification: **A** safe · **B** probable (needs authorization) · **C** keep

| Item | Class | Evidence / notes |
|------|-------|------------------|
| `OrderStateService` (+ spec) | **B** | No production imports; only self-spec. May be intentional pure helper unused after inline logic. |
| `TableValidationService` (+ spec) | **B** | Same — unused outside specs; editor may duplicate clamp/unique logic. |
| SQL duplicates (`SQL_*.sql` mirrors of migrations) | **C** | Historical / operational recovery; do not delete without auth. |
| `SQL_CATALOG_DELETE_REFRESH.sql` | **B** | Obsolete/regressive vs 0010; keep until authorized archive. |
| `supabase/validation/migrations_renumbered_copy/` | **C** | Audit artifact for 0007 naming. |
| `scripts/readonly_inventory/` | **C** | Safe read-only prod inventory tooling. |
| Legacy brand strings / `discoteca` paths | **C** | Functional/PWA coupling; branding pass separate. |
| `database.types` `reservations` | **C** | Matches bootstrap; unused UI. |
| Unused Ion imports in PlanEditor | **A** (later) | Build warns NG8113; removing imports only is behaviour-neutral. |
| Generated `src/environments/*` | **C** | gitignored; generated from `.env`. |
| `dist/` | **C** | Build output; ensure gitignored. |

**Etapa A action:** none deleted.  
**Etapa D:** process A items only after re-grep + tests green.
