---
name: tableflow-onboarding
description: Use for TableFlow ADMIN first-run checklist — onboarding flags, OnboardingService, setup intents (tf_setup), onboarding/workspace-entry guards, and /onboarding UI under features/onboarding. Do not use for Konva editor, ProductService/catalog data, Edge create-user internals, admin-dashboard KPIs, or remote schema/RLS/flag migrations without explicit authorization. Guided shell chrome inside workspace requires /tableflow-workspace.
---

# Onboarding

**Doc:** `docs/modules/onboarding.md`  
**Paths:** `src/app/features/onboarding/**`

## Context order

Module doc → onboarding paths → workspace guided-shell hooks only when coordinating with `/tableflow-workspace`.

## May edit

`OnboardingService`, progress helpers, setup-intent utils, onboarding UI, `onboardingAdminGuard`, `onboardingPreviewGuard`, `workspaceEntryGuard` (+ specs under this folder).

Guided shell presentation (logo, step label, «Volver a la configuración», hiding tabs) lives in `features/workspace` — edit those hooks only with **explicit coordination** with `/tableflow-workspace` (prefer orchestrator for cross-cuts).

## Tests

`onboarding.progress.spec.ts`, `onboarding.service.spec.ts`, `workspace-entry.guard.spec.ts` → then workspace characterization specs if guided-shell wiring changed

## Forbidden

- Konva / snapshot persistence → `/tableflow-floor-editor` / `/tableflow-floor-plans`
- Catalog **data** APIs → `/tableflow-products`; catalog panel chrome → `/tableflow-workspace`
- Staff Edge `create-user` implementation → `/tableflow-users` (onboarding may lock role to RECEPTOR in the shared dialog via coordination)
- Admin dashboard KPIs / `/admin` shell → `/tableflow-admin-dashboard`
- Applying or inventing company onboarding flag / RLS migrations without authorization
- Visual redesign of the premium onboarding screen without authorization
