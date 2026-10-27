import { buildOpenOrderQuantityMaps } from './open-order-quantity-maps';

describe('buildOpenOrderQuantityMaps', () => {
  it('matches previous PlanEditor pending/total aggregation', () => {
    const { pendingByTableId, totalByTableId } = buildOpenOrderQuantityMaps([
      {
        table_id: 't1',
        order_items: [
          { quantity: 2, status: 'PENDING' },
          { quantity: 3, status: 'PLACED' },
          { quantity: 9, status: 'CANCELLED' },
        ],
      },
      {
        table_id: 't2',
        order_items: [{ quantity: 1, status: 'PLACED' }],
      },
      {
        table_id: 't3',
        order_items: [],
      },
    ]);

    expect(pendingByTableId.get('t1')).toBe(2);
    expect(totalByTableId.get('t1')).toBe(5);
    expect(pendingByTableId.has('t2')).toBe(false);
    expect(totalByTableId.get('t2')).toBe(1);
    expect(pendingByTableId.has('t3')).toBe(false);
    expect(totalByTableId.has('t3')).toBe(false);
  });
});
