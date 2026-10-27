import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SupabaseService } from '../../../core/infrastructure';
import { OrderNotificationService } from './order-notification.service';

type Handler = (payload: {
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}) => void;

describe('OrderNotificationService', () => {
  let service: OrderNotificationService;
  let orderItemsHandler: Handler | undefined;
  let tablesHandler: Handler | undefined;
  let channelName = '';
  let unsubscribe: ReturnType<typeof vi.fn>;
  let subscribe: ReturnType<typeof vi.fn>;
  let channelMock: {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
    orderItemsHandler = undefined;
    tablesHandler = undefined;
    unsubscribe = vi.fn();
    subscribe = vi.fn(function (this: unknown) {
      return this;
    });

    channelMock = {
      on: vi.fn((_event: string, filter: { table: string }, handler: Handler) => {
        if (filter.table === 'order_items') orderItemsHandler = handler;
        if (filter.table === 'tables') tablesHandler = handler;
        return channelMock;
      }),
      subscribe,
      unsubscribe,
    };

    TestBed.configureTestingModule({
      providers: [
        OrderNotificationService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              channel: (name: string) => {
                channelName = name;
                return channelMock;
              },
            },
          },
        },
      ],
    });

    service = TestBed.inject(OrderNotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes a unique channel and registers order_items + tables listeners', () => {
    const onNewOrder = vi.fn();
    const channel = service.subscribeToNewOrderItems(onNewOrder, vi.fn());

    expect(channelName.startsWith('user-new-orders-')).toBe(true);
    expect(channelMock.on).toHaveBeenCalledTimes(2);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(channel).toBe(channelMock);
    expect(orderItemsHandler).toBeTypeOf('function');
    expect(tablesHandler).toBeTypeOf('function');
  });

  it('notifies on PENDING order_items that are not attended', () => {
    const onNewOrder = vi.fn();
    service.subscribeToNewOrderItems(onNewOrder);

    orderItemsHandler?.({ new: { status: 'PENDING', attended: false } });
    expect(onNewOrder).toHaveBeenCalledTimes(1);
  });

  it('ignores attended or non-pending order_items', () => {
    const onNewOrder = vi.fn();
    service.subscribeToNewOrderItems(onNewOrder);

    orderItemsHandler?.({ new: { status: 'PENDING', attended: true } });
    orderItemsHandler?.({ new: { status: 'PLACED', attended: true } });
    expect(onNewOrder).not.toHaveBeenCalled();
  });

  it('notifies observation changes without also emitting order alert', () => {
    const onNewOrder = vi.fn();
    const onObservation = vi.fn();
    service.subscribeToNewOrderItems(onNewOrder, onObservation);

    tablesHandler?.({
      old: { observation: null, attended: true },
      new: { observation: 'VIP', attended: false },
    });

    expect(onObservation).toHaveBeenCalledTimes(1);
    expect(onNewOrder).not.toHaveBeenCalled();
  });

  it('notifies when a table becomes unattended without observation change', () => {
    const onNewOrder = vi.fn();
    service.subscribeToNewOrderItems(onNewOrder, vi.fn());

    tablesHandler?.({
      old: { observation: 'same', attended: true },
      new: { observation: 'same', attended: false },
    });

    expect(onNewOrder).toHaveBeenCalledTimes(1);
  });

  it('debounces duplicate order alerts within 700ms', () => {
    const onNewOrder = vi.fn();
    service.subscribeToNewOrderItems(onNewOrder);

    orderItemsHandler?.({ new: { status: 'PENDING', attended: false } });
    orderItemsHandler?.({ new: { status: 'PENDING', attended: false } });
    expect(onNewOrder).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(700);
    orderItemsHandler?.({ new: { status: 'PENDING', attended: false } });
    expect(onNewOrder).toHaveBeenCalledTimes(2);
  });

  it('returns a channel that can unsubscribe', () => {
    const channel = service.subscribeToNewOrderItems(vi.fn());
    channel.unsubscribe();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
