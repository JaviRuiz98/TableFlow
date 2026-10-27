export type EditorTool = 'select' | 'draw' | 'pan' | 'text';
export type EditorMode = 'editor' | 'operativo';

/** Min distance (plan units) before appending another freehand point — PlanEditor pointerMove. */
export const DRAW_POINT_MIN_DISTANCE = 4;
