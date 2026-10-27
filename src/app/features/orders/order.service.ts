import { Injectable } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Json } from '../../core/data/database.types';
import { SupabaseService } from '../../core/infrastructure';
import type { Order, OrderItemWithProduct } from '../../core/models/models';
import {
  buildOpenOrderQuantityMaps,
  type OpenOrderQuantityRow,
} from './open-order-quantity-maps';

export interface ProductAssignmentItem {
  product_id: string;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private readonly db: SupabaseService) {}

  async forTable(tableId: string): Promise<{
    order: Order | null;
    items: OrderItemWithProduct[];
  }> {
    const { data: orders, error } = await this.db.client
      .from('orders')
      .select('*')
      .eq('table_id', tableId)
      .eq('status', 'OPEN')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const order = orders?.[0] ?? null;

    if (!order) {
      return {
        order: null,
        items: [],
      };
    }

    const { data, error: itemError } = await this.db.client
      .from('order_items')
      .select('*, product:products(*)')
      .eq('order_id', order.id)
      .neq('status', 'CANCELLED')
      .order('created_at');

    if (itemError) throw itemError;

    // Nested join: Relationships declare FKs; alias `product:products(*)` still needs a boundary cast.
    return {
      order,
      items: (data as unknown as OrderItemWithProduct[] | null) ?? [],
    };
  }

  /**
   * Open orders with nested items — drives pending/total badges on the floor canvas.
   */
  async getOpenOrderQuantityMaps(): Promise<{
    pendingByTableId: Map<string, number>;
    totalByTableId: Map<string, number>;
  }> {
    const { data, error } = await this.db.client
      .from('orders')
      .select('id,table_id,order_items(quantity,status)')
      .eq('status', 'OPEN');

    if (error) throw error;

    // Partial nested select (quantity,status only) → domain aggregation row.
    return buildOpenOrderQuantityMaps((data as unknown as OpenOrderQuantityRow[] | null) ?? []);
  }

  async addItem(tableId: string, productId: string, quantity: number, _userId: string): Promise<void> {
    if (!productId || quantity < 1) {
      throw new Error('Producto o cantidad no válidos');
    }

    // Centralizamos el alta en la RPC transaccional. Además de evitar carreras
    // al crear el pedido, la RPC vuelve a poner el producto en PENDING si ya
    // había sido servido anteriormente y marca la mesa como no atendida.
    await this.assignProducts(tableId, [
      { product_id: productId, quantity: Math.floor(quantity) },
    ]);
  }

  async assignProducts(tableId: string, items: ProductAssignmentItem[]): Promise<string> {
    if (!items.length) {
      throw new Error('Selecciona al menos un producto');
    }

    const { data, error } = await this.db.client.rpc('assign_products_to_table', {
      p_table_id: tableId,
      // RPC Args declare jsonb; keep domain array at the Json boundary.
      p_items: items as unknown as Json,
    });

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Supabase no devolvió el ID del pedido');
    }

    return data;
  }

  async markPlaced(itemId: string, userId: string): Promise<void> {
    const { error } = await this.db.client
      .from('order_items')
      .update({
        status: 'PLACED',
        attended: true,
        placed_by: userId,
        placed_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('status', 'PENDING');

    if (error) throw error;
  }

  /** Same filters as previous PlanEditor.changeItemQuantity update. */
  async updatePendingItemQuantity(itemId: string, quantity: number): Promise<void> {
    const { error } = await this.db.client
      .from('order_items')
      .update({
        quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) throw error;
  }

  /** Same payload as previous PlanEditor.removeOrderItem update. */
  async cancelPendingItem(itemId: string): Promise<void> {
    const { error } = await this.db.client
      .from('order_items')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) throw error;
  }

  subscribe(onChange: () => void, channelName = 'orders-realtime'): RealtimeChannel {
    return this.db.client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        onChange,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
        },
        onChange,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
        },
        onChange,
      )
      .subscribe();
  }
}
