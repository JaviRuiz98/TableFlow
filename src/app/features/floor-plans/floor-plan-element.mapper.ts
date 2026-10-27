import type { Json, Tables } from '../../core/data/database.types';
import type { FloorPlanElement } from '../../core/models/models';

type ElementRow = Tables<'floor_plan_elements'>;

/** Convert jsonb `points` from DB into domain `number[] | null` without inventing values. */
export function mapFloorPlanElementPoints(points: Json | null): number[] | null {
  if (points == null) return null;
  if (!Array.isArray(points)) return null;
  return points.map((value) => Number(value));
}

/** Map a typed Supabase row to the domain FloorPlanElement (points boundary). */
export function mapFloorPlanElementRow(row: ElementRow): FloorPlanElement {
  return {
    id: row.id,
    floor_plan_id: row.floor_plan_id,
    kind: row.kind,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    rotation: row.rotation,
    points: mapFloorPlanElementPoints(row.points),
    label: row.label,
    font_size: row.font_size,
    z_index: row.z_index,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
