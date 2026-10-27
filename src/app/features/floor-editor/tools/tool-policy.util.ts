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
  return tool === 'draw' || tool === 'text';
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
    clearDrawing: requested !== 'draw',
  };
}

export function toolLabel(tool: EditorTool): string {
  if (tool === 'draw') return 'Dibujar paredes';
  if (tool === 'text') return 'Añadir texto';
  if (tool === 'pan') return 'Mover plano';
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
): 'text' | 'draw' | 'ignore' {
  if (mode === 'editor' && tool === 'text') return 'text';
  if (mode === 'editor' && tool === 'draw') return 'draw';
  return 'ignore';
}
