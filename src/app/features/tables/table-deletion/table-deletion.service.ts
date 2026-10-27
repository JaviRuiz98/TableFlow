import { Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/infrastructure';

export type DeleteTableResult =
  | { ok: true; reason: 'DELETED' | 'NOT_PERSISTED' }
  | { ok: false; reason: 'BAD_PASSWORD' | 'SERVED_PRODUCTS' | string };

/**
 * Password-gated table/reserved deletion via RPC `delete_table_with_orders`.
 * Server enforces ADMIN + app_secrets key `table_deletion`. Do not call remotely in tests.
 */
@Injectable({ providedIn: 'root' })
export class TableDeletionService {
  constructor(private readonly db: SupabaseService) {}

  async delete(tableId: string, password: string, force = false): Promise<DeleteTableResult> {
    const { data, error } = await this.db.client.rpc('delete_table_with_orders', {
      p_table_id: tableId,
      p_secret: password,
      p_force: force,
    });
    if (error) throw error;
    return data as DeleteTableResult;
  }
}
