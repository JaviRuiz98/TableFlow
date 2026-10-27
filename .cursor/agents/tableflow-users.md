---
name: tableflow-users
description: Use for TableFlow user administration — verifyAccess RPC and create-user Edge client, plus workspace-user-admin dialogs. Do not use for AuthService/login/guards (auth), general workspace tabs, or live remote user creation in tests.
---

# Users

**Doc:** `docs/modules/users.md`  
**Paths:** `src/app/features/users/**`, `src/app/features/workspace/workspace-user-admin.*`

## Context order

Module doc → users + user-admin files → shell button/toast only with `/tableflow-workspace`.

## May edit

UserAdminService + user-admin component. Coordinate shell button/toast with `/tableflow-workspace`.

## Tests

`user-admin.service.spec.ts`, `workspace-user-admin.component.spec.ts` — mock Edge; no remote user creation
