# B12 — Cleanup & branding (docs/tech)

**Status:** DONE (no UI / Capacitor id / SQL / DB changes; no commit/push)  
**Branch:** `main`

## Classification of findings

### 1. Safe removal / fix (applied)

| Item | Action |
|------|--------|
| README obsolete (Discoteca, WAITER/MANAGER, creadorSala deploy, wrong migration steps) | Rewritten for TableFlow |
| `package.json` / lock `name: discoteca` | → `tableflow` (+ description) |
| Playwright `/discoteca/` + e2e `ion-title Discoteca` | Aligned to `/` + real login copy |
| `.gitignore` gaps (coverage, playwright-report, android/.gradle, keystores, tsbuildinfo) | Extended |
| `docs/native/NATIVE_APP.md` titled as Sala Chocolatte product | Retitled TableFlow; native IDs documented as preserved |
| Module index “Remaining: B10…” | Updated |

### 2. Documentary / naming (applied)

- Architecture maps + SYSTEM_OVERVIEW branding note
- Explicit legacy build path `dist/discoteca` / Angular project key `discoteca`
- SQL consolidation strategy documented below (no file deletes)

### 3. Potentially functional — **not done** (needs auth)

| Item | Why deferred |
|------|----------------|
| Rename Angular project / `outputPath` / `ngsw` `/discoteca/` / Capacitor `webDir` | Breaks native sync & PWA asset paths |
| Change `appId` / `appName` / Android-iOS strings / `index.html` title / login brand | Visual / store identity |
| Delete `supabase/SQL_*.sql` complements or rename dual `0007_*` | Migration history / ops risk |
| Remove `@angular/animations` (unused in `src`) | Peer/tooling uncertainty |
| Git history purge of any leaked secrets | Requires explicit auth |

### 4. Historical — **keep**

| Item | Reason |
|------|--------|
| UI «Sala Chocolatte» / toolbar brand | Visual identity until rebrand auth |
| `com.salachocolatte.app` | External/store id |
| `docs/architecture/DATABASE_MIGRATION_AUDIT.md`, ops notes under `docs/product/` | Audit / ops history |
| `supabase/SQL_*.sql` duplicates of migrations | Manual apply copies; do not delete in B12 |
| Dual migration prefix `0007_*` | Do not rename mid-history without consolidation plan |
| Warnings about Sala Chocolatte in agent/security docs | Safety rails |

## SQL / migrations (document only)

- **Truth sources:** remote TableFlow schema (when authorized) ≫ applied migration chain ≫ `BOOTSTRAP_TABLEFLOW.sql` ≫ complementary `SQL_*.sql`.
- **Known issues:** duplicate `0007_` prefixes; complement SQL overlaps migrations (see `docs/architecture/DATABASE_MIGRATION_AUDIT.md`); bootstrap may lag or lead remote.
- **Future consolidation (B13+ / dedicated DB auth):** inventory remote with read-only CLI → diff vs BOOTSTRAP → single forward migration or regenerate bootstrap; **never** push to Sala Chocolatte; do not rewrite applied history casually.

## Git / secrets

- `.env` and generated `environment*.ts` are gitignored; not listed as tracked.
- `dist/` / `.angular/` / `node_modules/` ignored.
- No secret values printed in this phase.
- If a secret ever appears as tracked: stop, report, request auth before history rewrite.

## npm deps review

- All listed deps have clear consumers or scripts (`vitest`, `playwright`, Capacitor, eslint, prettier).
- Candidate later: `@angular/animations` (no imports under `src/`) — leave for now.

## Agent notes

- Prefer TableFlow in docs; treat Sala Chocolatte strings in UI as intentional until B-visual.
- Do not “fix” build folder names without Capacitor + ngsw + CI update in the same authorized change.
