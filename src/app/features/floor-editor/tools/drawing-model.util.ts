import type { FloorPlanElement } from '../../../core/models/models';
import type { Point, Segment } from '../geometry';

export function buildWallElementsFromSegments(input: {
  segments: Segment[];
  planId: string;
  zIndexStart: number;
  now: string;
  newId?: () => string;
}): FloorPlanElement[] {
  const newId = input.newId ?? (() => crypto.randomUUID());
  return input.segments.map((s, index) => ({
    id: newId(),
    floor_plan_id: input.planId,
    kind: 'wall' as const,
    x: s.x,
    y: s.y,
    width: s.width,
    height: s.height,
    rotation: s.rotation,
    points: s.points,
    label: null,
    font_size: null,
    z_index: input.zIndexStart + index,
    created_at: input.now,
    updated_at: input.now,
  }));
}

export function buildTextElement(input: {
  planId: string;
  position: Point;
  label: string;
  zIndex: number;
  now: string;
  fontSize?: number;
  newId?: () => string;
}): FloorPlanElement {
  const newId = input.newId ?? (() => crypto.randomUUID());
  return {
    id: newId(),
    floor_plan_id: input.planId,
    kind: 'text',
    x: input.position.x,
    y: input.position.y,
    width: 0,
    height: 0,
    rotation: 0,
    points: null,
    label: input.label,
    font_size: input.fontSize ?? 22,
    z_index: input.zIndex,
    created_at: input.now,
    updated_at: input.now,
  };
}

/** Returns null if value is not a finite number; otherwise clamped 8..120 rounded. */
export function normalizeTextFontSize(value: string | number | null | undefined): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(8, Math.min(120, Math.round(parsed)));
}

export function shouldUpdateTextFontSize(
  current: number | null | undefined,
  next: number,
): boolean {
  return (current ?? 22) !== next;
}
