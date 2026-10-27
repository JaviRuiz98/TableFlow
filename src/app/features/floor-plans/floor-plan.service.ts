import { Injectable } from '@angular/core';
import type { Json } from '../../core/data/database.types';
import { SupabaseService } from '../../core/infrastructure';
import type { ClubTable, FloorPlan, FloorPlanElement, FloorSnapshot } from '../../core/models/models';
import { buildReplaceSnapshotPayload, splitTablesByType } from './floor-plan-snapshot.util';

@Injectable({
  providedIn: 'root',
})
export class FloorPlanService {
  constructor(private readonly db: SupabaseService) {}

  async list(): Promise<FloorPlan[]> {
    const { data, error } = await this.db.client.from('floor_plans').select('*').order('name');

    if (error) {
      throw error;
    }

    return data as FloorPlan[];
  }

  async create(name: string, width = 2000, height = 1200, userId: string): Promise<FloorPlan> {
    const { data, error } = await this.db.client
      .from('floor_plans')
      .insert({
        name,
        width,
        height,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as FloorPlan;
  }

  async update(planId: string, patch: Partial<FloorPlan>): Promise<void> {
    const { error } = await this.db.client.from('floor_plans').update(patch).eq('id', planId);

    if (error) {
      throw error;
    }
  }

  async remove(planId: string): Promise<void> {
    const { error } = await this.db.client.from('floor_plans').delete().eq('id', planId);

    if (error) {
      throw error;
    }
  }

  async load(planId: string): Promise<FloorSnapshot> {
    const [elementsResult, tablesResult] = await Promise.all([
      this.db.client.from('floor_plan_elements').select('*').eq('floor_plan_id', planId).order('z_index'),

      this.db.client.from('tables').select('*').eq('floor_plan_id', planId).order('number'),
    ]);

    if (elementsResult.error) {
      throw elementsResult.error;
    }

    if (tablesResult.error) {
      throw tablesResult.error;
    }

    const allTables = (tablesResult.data ?? []) as ClubTable[];
    const split = splitTablesByType(allTables);

    return {
      elements: elementsResult.data as FloorPlanElement[],
      tables: split.tables,
      reserved: split.reserved,
    } as FloorSnapshot;
  }

  async saveSnapshot(planId: string, snapshot: FloorSnapshot): Promise<void> {
    const payload = buildReplaceSnapshotPayload(planId, snapshot);

    const { error: rpcError } = await this.db.client.rpc('replace_floor_plan_snapshot', {
      p_floor_plan_id: payload.p_floor_plan_id,
      p_elements: payload.p_elements as unknown as Json,
      p_tables: payload.p_tables as unknown as Json,
    });

    if (rpcError) {
      throw rpcError;
    }
  }

  /*
   * Actualiza el estado de "atendida" directamente en BBDD, sin tener
   * que reenviar todo el plano (evita reconstrucciones innecesarias y
   * que un guardado a medias del plano se lleve por delante el estado
   * de atención de la mesa).
   */
  async setTableAttended(tableId: string, attended: boolean): Promise<void> {
    const { error } = await this.db.client.rpc('set_table_attended', {
      p_table_id: tableId,
      p_attended: attended,
    });
    if (error) throw error;
  }

  /**
   * Devuelve únicamente el estado mutable de las mesas/reservados de un plano.
   * Se usa por Realtime para mantener sincronizado el color del canvas entre
   * dispositivos sin recargar toda la geometría del plano.
   */
  async loadTableAttentionStates(planId: string): Promise<Array<Pick<ClubTable, 'id' | 'attended' | 'observation' | 'updated_at'>>> {
    const { data, error } = await this.db.client
      .from('tables')
      .select('id,attended,observation,updated_at')
      .eq('floor_plan_id', planId);

    if (error) throw error;
    return (data ?? []) as Array<Pick<ClubTable, 'id' | 'attended' | 'observation' | 'updated_at'>>;
  }

  /** Guarda una observación operativa de una mesa/reservado. Solo ADMIN puede ejecutar la RPC. */
  async setTableObservation(tableId: string, observation: string | null): Promise<void> {
    const { error } = await this.db.client.rpc('set_table_observation', {
      p_table_id: tableId,
      p_observation: observation,
    });
    if (error) throw error;
  }

  async createOperationalTarget(planId: string, type: 'TABLE' | 'RESERVED'): Promise<ClubTable> {
    const { data: existing, error: existingError } = await this.db.client
      .from('tables')
      .select('number')
      .eq('floor_plan_id', planId)
      .order('number', { ascending: false })
      .limit(1);

    if (existingError) throw existingError;

    const nextNumber = ((existing?.[0]?.number as number | undefined) ?? 0) + 1;
    const row = {
      floor_plan_id: planId,
      type,
      number: nextNumber,
      x: 100,
      y: 100 + nextNumber * 10,
      width: 100,
      height: 100,
      rotation: 0,
      shape: type === 'RESERVED' ? 'rectangle' : 'circle',
      attended: true,
    };

    const { data, error } = await this.db.client.from('tables').insert(row).select('*').single();
    if (error) throw error;
    return data as ClubTable;
  }

  async setLocked(planId: string, locked: boolean): Promise<void> {
    const { error } = await this.db.client.from('floor_plans').update({ is_locked: locked }).eq('id', planId);
    if (error) throw error;
  }
}
