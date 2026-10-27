# B0 — Tooling baseline

**Date:** 2026-10-27  
**Branch:** `main` (as authorized)  
**Recovery tip:** see [RECOVERY_POINT.md](./RECOVERY_POINT.md) (`e546e97`)

## Changes

| File | Change |
|------|--------|
| `package.json` / `package-lock.json` | Added `jsdom@^30.1.3` (devDependency) for Vitest DOM |
| `eslint.config.mjs` | Replaced `eslint.config.js`; expanded **ignores** only (`android/`, `ios/`, `.angular/`, etc.); scoped TS rules to `src/**/*.ts`; kept recommended rules for source |
| `docs/refactoring/RECOVERY_POINT.md` | Pre-B0 restore instructions |

## Not changed

- Angular / Ionic / Capacitor / Supabase major versions
- Application source behaviour
- ESLint rule severity for real `src/` issues (no mass rule disable)
- Remote databases / RPC / RLS

## Verification

| Command | Result |
|---------|--------|
| `npm test` | **7/7 passed** (3 files) |
| `npm run lint` | **PASS** (exit 0) |
| `npm run build` | **PASS** (pre-existing NG8113 unused Ion imports + bundle budget warnings) |
