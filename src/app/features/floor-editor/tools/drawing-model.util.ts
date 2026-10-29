import type { FloorPlanElement } from '../../../core/models/models';
import type { Point, Segment } from '../geometry';
import {
  SHAPE_MIN_SIZE,
  ZONE_SHAPE_ELLIPSE,
  ZONE_SHAPE_RECT,
  type ZoneShapeKind,
} from './editor-tool.types';

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

export function bboxFromCorners(a: Point, b: Point): { x: number; y: number; width: number; height: number } {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

export function isZoneShapeKind(value: string | null | undefined): value is ZoneShapeKind {
  return value === ZONE_SHAPE_RECT || value === ZONE_SHAPE_ELLIPSE;
}

export function buildZoneShapeElement(input: {
  planId: string;
  shape: ZoneShapeKind;
  origin: Point;
  corner: Point;
  zIndex: number;
  now: string;
  minSize?: number;
  newId?: () => string;
}): FloorPlanElement | null {
  const box = bboxFromCorners(input.origin, input.corner);
  const minSize = input.minSize ?? SHAPE_MIN_SIZE;
  if (box.width < minSize || box.height < minSize) {
    return null;
  }
  const newId = input.newId ?? (() => crypto.randomUUID());
  return {
    id: newId(),
    floor_plan_id: input.planId,
    kind: 'zone',
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    rotation: 0,
    points: null,
    label: input.shape,
    font_size: null,
    z_index: input.zIndex,
    created_at: input.now,
    updated_at: input.now,
  };
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
