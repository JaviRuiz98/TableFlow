import type { Point } from '../geometry';
import {
  DRAW_POINT_MIN_DISTANCE,
  type EditorMode,
  type EditorTool,
} from './editor-tool.types';

export function canEditPlanGeometry(input: {
  isAdmin: boolean;
  mode: EditorMode;
  isLocked: boolean;
}): boolean {
  return input.isAdmin && input.mode === 'editor' && !input.isLocked;
}

export function isGeometryEditTool(tool: EditorTool): boolean {
  return tool === 'draw' || tool === 'text' || tool === 'rect' || tool === 'ellipse';
}

export function isShapeTool(tool: EditorTool): tool is 'rect' | 'ellipse' {
  return tool === 'rect' || tool === 'ellipse';
}

export interface ToolTransition {
  applied: boolean;
  tool: EditorTool;
  panMode: boolean;
  clearSelection: boolean;
  clearDrawing: boolean;
}

/**
 * Single source of transition rules for setTool (without Konva side effects).
 * When applied=false, PlanEditor must keep the previous tool unchanged.
 */
export function planToolTransition(
  requested: EditorTool,
  canEditGeometry: boolean,
): ToolTransition {
  if (isGeometryEditTool(requested) && !canEditGeometry) {
    return {
      applied: false,
      tool: requested,
      panMode: false,
      clearSelection: false,
      clearDrawing: false,
    };
  }
  return {
    applied: true,
    tool: requested,
    panMode: requested === 'pan',
    clearSelection: requested !== 'select',
    // Keep freehand draft only while staying on draw; shape drafts clear via clearDrawing().
    clearDrawing: requested !== 'draw',
  };
}

export function toolLabel(tool: EditorTool): string {
  if (tool === 'draw') return 'Dibujar paredes';
  if (tool === 'text') return 'Añadir texto';
  if (tool === 'pan') return 'Mover plano';
  if (tool === 'rect') return 'Rectángulo';
  if (tool === 'ellipse') return 'Óvalo';
  return 'Seleccionar';
}

export function elementsDraggable(canEditGeometry: boolean, tool: EditorTool): boolean {
  return canEditGeometry && tool === 'select';
}

export function shouldAppendDrawingPoint(
  last: Point | undefined,
  next: Point,
  minDistance: number = DRAW_POINT_MIN_DISTANCE,
): boolean {
  if (!last) return true;
  return Math.hypot(next.x - last.x, next.y - last.y) >= minDistance;
}

export function pointerDownAction(
  mode: EditorMode,
  tool: EditorTool,
): 'text' | 'draw' | 'rect' | 'ellipse' | 'ignore' {
  if (mode !== 'editor') return 'ignore';
  if (tool === 'text') return 'text';
  if (tool === 'draw') return 'draw';
  if (tool === 'rect') return 'rect';
  if (tool === 'ellipse') return 'ellipse';
  return 'ignore';
}
