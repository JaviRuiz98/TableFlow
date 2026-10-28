---
name: tableflow-notifications
description: Use for TableFlow Realtime order/observation alert logic (debounce, channels) under features/notifications for RECEPTOR role. Do not use for OrderService mutations, workspace alert modal layout without auth, or remote Realtime policy changes.
---

# Notifications

**Doc:** `docs/modules/notifications.md`  
**Paths:** `src/app/features/notifications/**`

## Context order

Module doc → notifications paths → workspace owns alert modal presentation.

## May edit

OrderNotificationService + specs. Workspace owns alert modal presentation.

## Tests

`order-notification.service.spec.ts` (fake timers / debounce)
