import { Injectable } from '@angular/core';
import type { Json } from '../../../core/data/database.types';
import { SupabaseService } from '../../../core/infrastructure';
import type { ClubTable, FloorPlan, FloorSnapshot } from '../../../core/models/models';
import { mapFloorPlanElementRow } from '../floor-plan-element/floor-plan-element.mapper';
import { buildReplaceSnapshotPayload, splitTablesByType } from '../floor-plan-snapshot/floor-plan-snapshot.util';

@Injectable({
  providedIn: 'root',
})
export class FloorPlanService {
  constructor(private readonly db: SupabaseService) {}

  async list(): Promise<FloorPlan[]> {
    const { data, error } = await this.db.client
      .from('floor_plans')
      .select('*')
      .order('opening_date', { ascending: false })
      .order('opens_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  /**
   * Legacy create used by onboarding / PlanDuplicationService.
   * Prefer `createOpeningJornada` for dated sessions.
   */
  async create(
    name: string,
    width = 2000,
    height = 1200,
    companyId: string,
    jornada?: {
      openingDate: string;
      opensAt: string;
      closesAt: string;
      closesNextDay?: boolean;
    },
  ): Promise<FloorPlan> {
    const openingDate = jornada?.openingDate ?? new Date().toISOString().slice(0, 10);
    const opensAt = jornada?.opensAt ?? '22:00:00';
    const closesAt = jornada?.closesAt ?? '06:00:00';
    const closesNextDay = jornada?.closesNextDay ?? true;

    const { data, error } = await this.db.client
      .from('floor_plans')
      .insert({
        name,
        width,
        height,
        company_id: companyId,
        opening_date: openingDate,
        opens_at: opensAt,
        closes_at: closesAt,
        closes_next_day: closesNextDay,
        status: 'scheduled',
        is_active: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Supabase no devolvió el plano creado');
    }

    return data;
  }

  /** ADMIN: create scheduled jornada (empty or copy layout via RPC). */
  async createOpeningJornada(input: {
    name: string;
    openingDate: string;
    opensAt: string;
    closesAt: string;
    closesNextDay?: boolean;
    sourceFloorPlanId?: string | null;
    width?: number;
    height?: number;
  }): Promise<FloorPlan> {
    const { data, error } = await this.db.client.rpc('create_opening_jornada', {
      p_name: input.name,
      p_opening_date: input.openingDate,
      p_opens_at: input.opensAt,
      p_closes_at: input.closesAt,
      p_closes_next_day: input.closesNextDay ?? false,
      p_source_floor_plan_id: input.sourceFloorPlanId ?? null,
      p_width: input.width ?? 2000,
      p_height: input.height ?? 1200,
    });
    if (error) throw error;
    if (!data) throw new Error('Supabase no devolvió la jornada creada');
    return data as FloorPlan;
  }

  async openJornada(planId: string): Promise<FloorPlan> {
    const { data, error } = await this.db.client.rpc('open_jornada', { p_floor_plan_id: planId });
    if (error) throw error;
    if (!data) throw new Error('Supabase no devolvió la jornada abierta');
    return data as FloorPlan;
  }

  async closeJornada(planId: string): Promise<FloorPlan> {
    const { data, error } = await this.db.client.rpc('close_jornada', { p_floor_plan_id: planId });
    if (error) throw error;
    if (!data) throw new Error('Supabase no devolvió la jornada cerrada');
    return data as FloorPlan;
  }

  async setTableReserved(tableId: string, reserved: boolean): Promise<ClubTable> {
    const { data, error } = await this.db.client.rpc('set_table_reserved', {
      p_table_id: tableId,
      p_reserved: reserved,
    });
    if (error) throw error;
    if (!data) throw new Error('Supabase no devolvió la mesa actualizada');
    return data as ClubTable;
  }

  async transferTableContent(sourceTableId: string, targetTableId: string): Promise<{
    ok: boolean;
    moved_orders: number;
    source_table_id: string;
    target_table_id: string;
  }> {
    const { data, error } = await this.db.client.rpc('transfer_table_content', {
      p_source_table_id: sourceTableId,
      p_target_table_id: targetTableId,
    });
    if (error) throw error;
    return data as {
      ok: boolean;
      moved_orders: number;
      source_table_id: string;
      target_table_id: string;
    };
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

    const allTables = tablesResult.data ?? [];
    const split = splitTablesByType(allTables);

    return {
      elements: (elementsResult.data ?? []).map(mapFloorPlanElementRow),
      tables: split.tables,
      reserved: split.reserved,
    };
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
  async loadTableAttentionStates(
    planId: string,
  ): Promise<Array<Pick<ClubTable, 'id' | 'attended' | 'observation' | 'reserved' | 'updated_at'>>> {
    const { data, error } = await this.db.client
      .from('tables')
      .select('id,attended,observation,reserved,updated_at')
      .eq('floor_plan_id', planId);

    if (error) throw error;
    return data ?? [];
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
      .eq('type', type)
      .order('number', { ascending: false })
      .limit(1);

    if (existingError) throw existingError;

    const nextNumber = (existing?.[0]?.number ?? 0) + 1;
    const row = {
      floor_plan_id: planId,
      type,
      number: nextNumber,
      x: 100,
      y: 100 + nextNumber * 10,
      width: 100,
      height: 100,
      rotation: 0,
      shape: type === 'RESERVED' ? ('rectangle' as const) : ('circle' as const),
      attended: false,
      reserved: false,
    };

    const { data, error } = await this.db.client.from('tables').insert(row).select('*').single();
    if (error) throw error;
    if (!data) {
      throw new Error('Supabase no devolvió la mesa creada');
    }
    return data;
  }

  async setLocked(planId: string, locked: boolean): Promise<void> {
    const { error } = await this.db.client.from('floor_plans').update({ is_locked: locked }).eq('id', planId);
    if (error) throw error;
  }
}
