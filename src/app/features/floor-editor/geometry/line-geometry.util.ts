import type { FloorPlanElement } from '../../../core/models/models';
import type { Point } from './geometry.service';

/** Start/end of a polyline element; null if fewer than 2 points (4 numbers). */
export function getLineEndpoints(e: FloorPlanElement): { start: Point; end: Point } | null {
  if (!e.points || e.points.length < 4) {
    return null;
  }
  return {
    start: {
      x: e.points[0],
      y: e.points[1],
    },
    end: {
      x: e.points[e.points.length - 2],
      y: e.points[e.points.length - 1],
    },
  };
}

/**
 * Mutates element points and derived x/y/width/height (same as PlanEditor).
 * Sets updated_at to now — intentional side effect preserved from original.
 */
export function updateLineEndpoint(
  e: FloorPlanElement,
  endpoint: 'start' | 'end',
  point: Point,
): void {
  if (!e.points || e.points.length < 4) {
    return;
  }
  if (endpoint === 'start') {
    e.points[0] = point.x;
    e.points[1] = point.y;
  } else {
    e.points[e.points.length - 2] = point.x;
    e.points[e.points.length - 1] = point.y;
  }
  e.x = e.points[0];
  e.y = e.points[1];
  const endpoints = getLineEndpoints(e);
  if (endpoints) {
    e.width = endpoints.end.x - endpoints.start.x;
    e.height = endpoints.end.y - endpoints.start.y;
  }
  e.updated_at = new Date().toISOString();
}

/** Translate all polyline points and element origin by (dx, dy). */
export function moveLine(e: FloorPlanElement, dx: number, dy: number): void {
  if (e.points && e.points.length >= 2) {
    e.points = e.points.map((value, index) => value + (index % 2 === 0 ? dx : dy));
  }
  e.x += dx;
  e.y += dy;
  e.updated_at = new Date().toISOString();
}
