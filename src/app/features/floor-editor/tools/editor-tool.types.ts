export type EditorTool = 'select' | 'draw' | 'pan' | 'text' | 'rect' | 'ellipse';
export type EditorMode = 'editor' | 'operativo';

/** Min distance (plan units) before appending another freehand point — PlanEditor pointerMove. */
export const DRAW_POINT_MIN_DISTANCE = 4;

/** Minimum bbox size when committing a zone shape (rect/ellipse). */
export const SHAPE_MIN_SIZE = 16;

/** Stored on `floor_plan_elements.label` for kind=zone decorative shapes. */
export type ZoneShapeKind = 'rect' | 'ellipse';
export const ZONE_SHAPE_RECT: ZoneShapeKind = 'rect';
export const ZONE_SHAPE_ELLIPSE: ZoneShapeKind = 'ellipse';
