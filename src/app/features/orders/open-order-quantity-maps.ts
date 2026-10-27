/**
 * Pure helper used by OrderService / PlanEditor pending badges.
 * Kept behaviour-identical to the previous inline PlanEditor reduce.
 */
export type OpenOrderQuantityRow = {
  table_id: string;
  order_items?: Array<{ quantity?: number; status?: string }> | null;
};

export function buildOpenOrderQuantityMaps(
  orders: OpenOrderQuantityRow[],
): {
  pendingByTableId: Map<string, number>;
  totalByTableId: Map<string, number>;
} {
  const pendingByTableId = new Map<string, number>();
  const totalByTableId = new Map<string, number>();

  for (const o of orders) {
    const items = (o.order_items ?? []).filter((i) => i.status !== 'CANCELLED');
    const total = items.reduce((a, i) => a + Number(i.quantity || 0), 0);
    const pending = items
      .filter((i) => i.status === 'PENDING')
      .reduce((a, i) => a + Number(i.quantity || 0), 0);
    if (total) totalByTableId.set(o.table_id, total);
    if (pending) pendingByTableId.set(o.table_id, pending);
  }

  return { pendingByTableId, totalByTableId };
}
