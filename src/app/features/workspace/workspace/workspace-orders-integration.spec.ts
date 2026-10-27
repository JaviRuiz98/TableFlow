import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { OrderService } from '../orders';
import { OrderNotificationService } from '../notifications';
import { SupabaseService } from '../../core/infrastructure';
import { buildOpenOrderQuantityMaps } from '../orders/open-order-quantity-maps';
import { fixtureTable } from '../../../testing/fixtures';

/**
 * Cross-module wiring: workspace-style order badges + USER alert subscription.
 * All Supabase I/O mocked — no remote mutations.
 */
describe('Workspace ↔ orders ↔ notifications (integration, mocked)', () => {
  it('badge maps and notification subscribe can run side by side without shared channel collision', () => {
    const maps = buildOpenOrderQuantityMaps([
      {
        table_id: fixtureTable.id,
        order_items: [
          { quantity: 1, status: 'PENDING' },
          { quantity: 2, status: 'PLACED' },
        ],
      },
    ]);
    expect(maps.pendingByTableId.get(fixtureTable.id)).toBe(1);
    expect(maps.totalByTableId.get(fixtureTable.id)).toBe(3);

    const orderChannel = {
      on: vi.fn(function (this: unknown) {
        return this;
      }),
      subscribe: vi.fn(function (this: unknown) {
        return this;
      }),
      unsubscribe: vi.fn(),
    };
    const notifyChannel = {
      on: vi.fn(function (this: unknown) {
        return this;
      }),
      subscribe: vi.fn(function (this: unknown) {
        return this;
      }),
      unsubscribe: vi.fn(),
    };
    const channel = vi
      .fn()
      .mockReturnValueOnce(orderChannel)
      .mockReturnValueOnce(notifyChannel);

    TestBed.configureTestingModule({
      providers: [
        OrderService,
        OrderNotificationService,
        { provide: SupabaseService, useValue: { client: { channel, from: vi.fn(), rpc: vi.fn() } } },
      ],
    });

    const orders = TestBed.inject(OrderService);
    const notifications = TestBed.inject(OrderNotificationService);
    orders.subscribe(() => undefined, 'workspace-orders');
    notifications.subscribeToNewOrderItems(() => undefined);

    expect(channel).toHaveBeenNthCalledWith(1, 'workspace-orders');
    expect(String(channel.mock.calls[1]?.[0] ?? '')).toMatch(/^user-new-orders-/);
    expect(orderChannel.on).toHaveBeenCalled();
    expect(notifyChannel.on).toHaveBeenCalled();
  });
});
