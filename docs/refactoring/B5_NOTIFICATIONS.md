# B5 — Notifications module

**Date:** 2026-10-27 · **Branch:** `main`

## Changes

- Moved `OrderNotificationService` → `src/app/features/notifications/`
- Workspace import → `./notifications`
- Added mocked Realtime unit tests (handlers, debounce, unsubscribe)
- Docs: `docs/modules/notifications.md`

## Unchanged

- Alert rules, 700ms debounce, channel naming, callback signatures
- OrderService realtime subscriptions (canvas sync) remain separate
