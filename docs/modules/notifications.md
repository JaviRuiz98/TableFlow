# Module: notifications

**Agent:** `tableflow-notifications`  
**Path:** `src/app/features/notifications/`

## Purpose

RECEPTOR-facing realtime alerts for new pending order activity and observation changes (debounced). Workspace only subscribes when `hasRole('RECEPTOR')`.

## Responsibilities

- Subscribe to Supabase Realtime on `order_items` and `tables`
- Decide when to call `onNewOrder` vs `onObservationChange`
- Debounce duplicate alerts (700ms windows)
- Return `RealtimeChannel` for consumer cleanup

## Main files

| File | Role |
|------|------|
| `order-notification.service.ts` | Subscription + rules |
| `index.ts` | Barrel |
| `order-notification.service.spec.ts` | Mocked channel/handler tests |

## Public API

```ts
subscribeToNewOrderItems(
  onNewOrder: () => void,
  onObservationChange?: () => void,
): RealtimeChannel
```

Consumers own UI dialogs; this module only invokes callbacks.

## Realtime contracts

| Table | Events | Condition |
|-------|--------|-----------|
| `order_items` | `*` | `new.status === 'PENDING'` && `new.attended !== true` |
| `tables` | `UPDATE` | observation changed → observation callback only; else `attended` becomes `false` → order callback |

Requires DB `REPLICA IDENTITY FULL` on those tables (ops concern; do not change in this module).

## Dependencies

- `core/infrastructure` (`SupabaseService`)
- Consumer: `WorkspaceComponent`
- Related (separate): `features/orders` uses its own `OrderService.subscribe` for canvas refresh — different purpose

## Lifecycle

Workspace stores the channel and must `unsubscribe()` on destroy (existing behaviour).

## Tests vs multi-device

Unit mocks verify rules/debounce/cleanup. Cross-device sync needs a later manual/integration check on TableFlow (authorized, non-destructive).

## Restrictions

- Do not change alert conditions or debounce timings without product approval
- Do not alter Realtime publication / RLS / RPC
- Do not expose raw channel builders beyond returned `RealtimeChannel`
