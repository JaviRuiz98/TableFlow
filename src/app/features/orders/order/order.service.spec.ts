import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SupabaseService } from '../../../core/infrastructure';
import { OrderService } from './order.service';
import {
  fixtureOrder,
  fixtureOrderItem,
  fixtureProduct,
  fixtureTable,
} from '../../../../testing/fixtures';
import { createQueryBuilder } from '../../../../testing/supabase-query-mock';

describe('OrderService (mocked Supabase)', () => {
  let service: OrderService;
  let fromMock: ReturnType<typeof vi.fn>;
  let rpcMock: ReturnType<typeof vi.fn>;
  let channelMock: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    fromMock = vi.fn();
    rpcMock = vi.fn();
    channelMock = {
      on: vi.fn(function (this: unknown) {
        return this;
      }),
      subscribe: vi.fn(function (this: unknown) {
        return this;
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        OrderService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: fromMock,
              rpc: rpcMock,
              channel: vi.fn(() => channelMock),
            },
          },
        },
      ],
    });
    service = TestBed.inject(OrderService);
  });

  it('forTable returns empty items when no OPEN or CLOSED order', async () => {
    fromMock
      .mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(createQueryBuilder({ data: [], error: null }));
    await expect(service.forTable(fixtureTable.id)).resolves.toEqual({ order: null, items: [] });
  });

  it('forTable loads nested product join for open order', async () => {
    const ordersBuilder = createQueryBuilder({ data: [fixtureOrder], error: null });
    const itemsBuilder = createQueryBuilder({
      data: [{ ...fixtureOrderItem, product: fixtureProduct }],
      error: null,
    });
    fromMock
      .mockReturnValueOnce(ordersBuilder)
      .mockReturnValueOnce(itemsBuilder);

    const result = await service.forTable(fixtureTable.id);
    expect(result.order?.id).toBe(fixtureOrder.id);
    expect(result.items[0]?.product.name).toBe('Agua');
    expect(result.items[0]?.status).toBe('PENDING');
  });

  it('forTable falls back to latest CLOSED order when none is OPEN', async () => {
    const closed = { ...fixtureOrder, id: 'order-closed', status: 'CLOSED' as const };
    fromMock
      .mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(createQueryBuilder({ data: [closed], error: null }))
      .mockReturnValueOnce(
        createQueryBuilder({
          data: [{ ...fixtureOrderItem, status: 'PLACED', attended: true, product: fixtureProduct }],
          error: null,
        }),
      );

    const result = await service.forTable(fixtureTable.id);
    expect(result.order?.id).toBe('order-closed');
    expect(result.items[0]?.status).toBe('PLACED');
  });

  it('assignProducts sends RPC payload and returns order id', async () => {
    rpcMock.mockResolvedValue({ data: 'order-new', error: null });
    await expect(
      service.assignProducts(fixtureTable.id, [{ product_id: fixtureProduct.id, quantity: 2 }]),
    ).resolves.toBe('order-new');
    expect(rpcMock).toHaveBeenCalledWith(
      'assign_products_to_table',
      expect.objectContaining({
        p_table_id: fixtureTable.id,
        p_items: [{ product_id: fixtureProduct.id, quantity: 2 }],
      }),
    );
  });

  it('assignProducts rejects empty selection without calling RPC', async () => {
    await expect(service.assignProducts(fixtureTable.id, [])).rejects.toThrow('al menos un producto');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('getOpenOrderQuantityMaps aggregates PENDING vs total', async () => {
    fromMock.mockReturnValue(
      createQueryBuilder({
        data: [
          {
            id: 'o1',
            table_id: fixtureTable.id,
            order_items: [
              { quantity: 2, status: 'PENDING' },
              { quantity: 1, status: 'PLACED' },
              { quantity: 9, status: 'CANCELLED' },
            ],
          },
        ],
        error: null,
      }),
    );
    const maps = await service.getOpenOrderQuantityMaps();
    expect(maps.pendingByTableId.get(fixtureTable.id)).toBe(2);
    expect(maps.totalByTableId.get(fixtureTable.id)).toBe(3);
  });

  it('subscribe registers orders, order_items and tables channels', () => {
    const onChange = vi.fn();
    service.subscribe(onChange, 'test-orders');
    expect(channelMock.on).toHaveBeenCalledTimes(3);
    expect(channelMock.subscribe).toHaveBeenCalled();
  });

  it('cancelPendingItem updates status CANCELLED', async () => {
    const builder = createQueryBuilder({ data: null, error: null });
    fromMock.mockReturnValue(builder);
    await service.cancelPendingItem('item-1');
    expect(builder['update']).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CANCELLED' }),
    );
  });
});
