import type { ClubTable, FloorPlanElement, FloorSnapshot } from '../../../core/models/models';

/** Split unified `tables` rows the same way FloorPlanService.load does. */
export function splitTablesByType(allTables: ClubTable[]): Pick<FloorSnapshot, 'tables' | 'reserved'> {
  return {
    tables: allTables.filter((table) => table.type !== 'RESERVED'),
    reserved: allTables.filter((table) => table.type === 'RESERVED'),
  };
}

/** Payload shapes sent to replace_floor_plan_snapshot (behaviour-identical mapping). */
export function buildReplaceSnapshotPayload(planId: string, snapshot: FloorSnapshot) {
  const allTables: ClubTable[] = [...(snapshot.tables ?? []), ...(snapshot.reserved ?? [])];

  return {
    p_floor_plan_id: planId,
    p_elements: snapshot.elements.map((element: FloorPlanElement) => ({
      kind: element.kind,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      rotation: element.rotation,
      points: element.points,
      label: element.label,
      font_size: element.font_size ?? 22,
      z_index: element.z_index,
    })),
    p_tables: allTables.map((table) => ({
      id: table.id,
      type: table.type,
      number: table.number,
      x: table.x,
      y: table.y,
      width: table.width,
      height: table.height,
      rotation: table.rotation,
      shape: table.shape,
      attended: table.attended ?? false,
    })),
  };
}

/**
 * Clone snapshot for plan duplication: new ids, reset attended/observation.
 * Does not copy orders; geometry + table layout only.
 */
export function buildDuplicatedSnapshot(
  source: FloorSnapshot,
  copyPlanId: string,
  newId: () => string = () => crypto.randomUUID(),
): FloorSnapshot {
  return {
    elements: source.elements.map((element) => ({
      ...structuredClone(element),
      id: newId(),
      floor_plan_id: copyPlanId,
    })),
    tables: source.tables.map((table) => ({
      ...structuredClone(table),
      id: newId(),
      floor_plan_id: copyPlanId,
      attended: false,
      observation: null,
    })),
    reserved: (source.reserved ?? []).map((table) => ({
      ...structuredClone(table),
      id: newId(),
      floor_plan_id: copyPlanId,
      attended: false,
      observation: null,
    })),
  };
}
