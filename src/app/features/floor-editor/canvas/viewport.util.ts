import type { ClubTable, FloorPlanElement } from '../../../core/models/models';
import type { Point } from '../geometry';

/** Viewport constants used by PlanEditor (do not change without product auth). */
export const VIEWPORT = {
  absoluteMinZoom: 0.08,
  defaultMinZoom: 0.35,
  maxZoom: 2.5,
  fitPadding: 24,
  stageMinHeight: 500,
  wheelZoomStep: 0.1,
  scaleEpsilon: 0.0001,
} as const;

export function clampZoom(value: number, minZoom: number, maxZoom: number): number {
  return Math.min(maxZoom, Math.max(minZoom, value));
}

export function measureStageSize(clientWidth: number, clientHeight: number): { width: number; height: number } {
  return {
    width: Math.max(clientWidth, 1),
    height: Math.max(clientHeight, VIEWPORT.stageMinHeight),
  };
}

/** Screen/container point → plan/model coordinates given stage translation + uniform scale. */
export function screenToModelPoint(
  screen: Point,
  stageX: number,
  stageY: number,
  scale: number,
): Point {
  const s = scale || 1;
  return {
    x: (screen.x - stageX) / s,
    y: (screen.y - stageY) / s,
  };
}

/** Stage position so `model` stays under `screenFocus` after scaling to `newScale`. */
export function stagePositionForModelPoint(
  screenFocus: Point,
  model: Point,
  newScale: number,
): Point {
  return {
    x: screenFocus.x - model.x * newScale,
    y: screenFocus.y - model.y * newScale,
  };
}

/**
 * Zoom keeping the model point under `anchorScreen` fixed on screen
 * (wheel / button zoom behaviour).
 */
export function computeZoomAroundPoint(
  anchorScreen: Point,
  stageX: number,
  stageY: number,
  oldScale: number,
  newScale: number,
): { scale: number; position: Point } {
  const model = screenToModelPoint(anchorScreen, stageX, stageY, oldScale || 1);
  return {
    scale: newScale,
    position: stagePositionForModelPoint(anchorScreen, model, newScale),
  };
}

/**
 * Pinch step: model anchor from previous center; position from current center
 * (matches PlanEditor installTouchNavigation).
 */
export function computePinchViewport(
  previousCenter: Point,
  currentCenter: Point,
  stageX: number,
  stageY: number,
  oldScale: number,
  newScale: number,
): { scale: number; position: Point } {
  const model = screenToModelPoint(previousCenter, stageX, stageY, oldScale || 1);
  return {
    scale: newScale,
    position: stagePositionForModelPoint(currentCenter, model, newScale),
  };
}

export function contentExtent(
  axis: 'x' | 'y',
  tables: ClubTable[],
  reserved: ClubTable[],
  elements: FloorPlanElement[],
): number {
  let max = 0;
  const update = (value: number) => {
    if (Number.isFinite(value)) max = Math.max(max, value);
  };

  for (const item of [...tables, ...reserved]) {
    update(axis === 'x' ? item.x + item.width : item.y + item.height);
  }
  for (const element of elements) {
    update(axis === 'x' ? element.x + (element.width || 0) : element.y + (element.height || 0));
    if (element.points?.length) {
      for (let i = axis === 'x' ? 0 : 1; i < element.points.length; i += 2) {
        update(element.points[i]);
      }
    }
  }
  return max;
}

export interface FitInitialViewInput {
  planWidth: number;
  planHeight: number;
  extentX: number;
  extentY: number;
  stageWidth: number;
  stageHeight: number;
  absoluteMinZoom: number;
  defaultMinZoom: number;
  padding?: number;
}

export interface FitInitialViewResult {
  planWidth: number;
  planHeight: number;
  minZoom: number;
  scale: number;
  position: Point;
}

export function computeFitInitialView(input: FitInitialViewInput): FitInitialViewResult {
  const padding = input.padding ?? VIEWPORT.fitPadding;
  const planWidth = Math.max(Number(input.planWidth) || 0, input.extentX, 1);
  const planHeight = Math.max(Number(input.planHeight) || 0, input.extentY, 1);
  const availableWidth = Math.max(1, input.stageWidth - padding * 2);
  const availableHeight = Math.max(1, input.stageHeight - padding * 2);
  const fitScale = Math.min(availableWidth / planWidth, availableHeight / planHeight);
  const minZoom = Math.max(input.absoluteMinZoom, Math.min(input.defaultMinZoom, fitScale));
  return {
    planWidth,
    planHeight,
    minZoom,
    scale: minZoom,
    position: {
      x: (input.stageWidth - planWidth * minZoom) / 2,
      y: (input.stageHeight - planHeight * minZoom) / 2,
    },
  };
}

export function clientPointsRelativeToRect(
  clientA: Point,
  clientB: Point,
  rect: { left: number; top: number },
): { p1: Point; p2: Point; center: Point; distance: number } {
  const p1 = { x: clientA.x - rect.left, y: clientA.y - rect.top };
  const p2 = { x: clientB.x - rect.left, y: clientB.y - rect.top };
  return {
    p1,
    p2,
    center: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
    distance: Math.hypot(p2.x - p1.x, p2.y - p1.y),
  };
}
