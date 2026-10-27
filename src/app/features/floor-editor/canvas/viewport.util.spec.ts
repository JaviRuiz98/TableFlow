import type { ClubTable, FloorPlanElement } from '../../../core/models/models';
import {
  VIEWPORT,
  clampZoom,
  clientPointsRelativeToRect,
  computeFitInitialView,
  computePinchViewport,
  computeZoomAroundPoint,
  contentExtent,
  measureStageSize,
  screenToModelPoint,
  stagePositionForModelPoint,
} from './viewport.util';

describe('viewport.util (PlanEditor characterization)', () => {
  it('clampZoom respects min/max and leaves in-range values', () => {
    expect(clampZoom(0.01, 0.08, 2.5)).toBe(0.08);
    expect(clampZoom(9, 0.08, 2.5)).toBe(2.5);
    expect(clampZoom(1.2, 0.08, 2.5)).toBe(1.2);
  });

  it('measureStageSize enforces min height 500 and width ≥ 1', () => {
    expect(measureStageSize(0, 100)).toEqual({ width: 1, height: 500 });
    expect(measureStageSize(800, 900)).toEqual({ width: 800, height: 900 });
  });

  it('screenToModelPoint / stagePosition keep anchor under pointer after zoom', () => {
    const anchor = { x: 200, y: 100 };
    const stageX = 50;
    const stageY = 20;
    const oldScale = 1;
    const newScale = 2;
    const model = screenToModelPoint(anchor, stageX, stageY, oldScale);
    expect(model).toEqual({ x: 150, y: 80 });

    const { position, scale } = computeZoomAroundPoint(anchor, stageX, stageY, oldScale, newScale);
    expect(scale).toBe(2);
    expect(position).toEqual(stagePositionForModelPoint(anchor, model, newScale));
    // Same screen point maps to same model after transform
    expect(screenToModelPoint(anchor, position.x, position.y, newScale)).toEqual(model);
  });

  it('computeZoomAroundPoint handles oldScale 0 via fallback 1', () => {
    const out = computeZoomAroundPoint({ x: 10, y: 10 }, 0, 0, 0, 0.5);
    expect(out.scale).toBe(0.5);
    expect(screenToModelPoint({ x: 10, y: 10 }, out.position.x, out.position.y, 0.5)).toEqual({
      x: 10,
      y: 10,
    });
  });

  it('computePinchViewport anchors on previous center, positions with current center', () => {
    const prev = { x: 100, y: 100 };
    const curr = { x: 110, y: 100 };
    const out = computePinchViewport(prev, curr, 0, 0, 1, 2);
    expect(out.scale).toBe(2);
    expect(out.position).toEqual({
      x: curr.x - 100 * 2,
      y: curr.y - 100 * 2,
    });
  });

  it('computeFitInitialView matches PlanEditor fit formula and constants', () => {
    const result = computeFitInitialView({
      planWidth: 2000,
      planHeight: 1200,
      extentX: 100,
      extentY: 100,
      stageWidth: 1000,
      stageHeight: 800,
      absoluteMinZoom: VIEWPORT.absoluteMinZoom,
      defaultMinZoom: VIEWPORT.defaultMinZoom,
    });
    // available 1000-48=952, 800-48=752 → fit = min(952/2000, 752/1200) = min(0.476, 0.6267) = 0.476
    // minZoom = max(0.08, min(0.35, 0.476)) = 0.35
    expect(result.minZoom).toBe(VIEWPORT.defaultMinZoom);
    expect(result.scale).toBe(VIEWPORT.defaultMinZoom);
    expect(result.planWidth).toBe(2000);
    expect(result.planHeight).toBe(1200);
    expect(result.position.x).toBe((1000 - 2000 * 0.35) / 2);
    expect(result.position.y).toBe((800 - 1200 * 0.35) / 2);
  });

  it('computeFitInitialView uses content extent when larger than plan size', () => {
    const result = computeFitInitialView({
      planWidth: 100,
      planHeight: 100,
      extentX: 500,
      extentY: 400,
      stageWidth: 500,
      stageHeight: 500,
      absoluteMinZoom: 0.08,
      defaultMinZoom: 0.35,
    });
    expect(result.planWidth).toBe(500);
    expect(result.planHeight).toBe(400);
  });

  it('contentExtent scans tables, reserved, element boxes and polyline points', () => {
    const tables = [{ x: 10, y: 10, width: 100, height: 50 } as ClubTable];
    const reserved = [{ x: 0, y: 200, width: 50, height: 50 } as ClubTable];
    const elements = [
      {
        x: 0,
        y: 0,
        width: 5,
        height: 5,
        points: [0, 0, 300, 10, 300, 250],
      } as FloorPlanElement,
    ];
    expect(contentExtent('x', tables, reserved, elements)).toBe(300);
    expect(contentExtent('y', tables, reserved, elements)).toBe(250);
  });

  it('clientPointsRelativeToRect computes center and distance', () => {
    const out = clientPointsRelativeToRect(
      { x: 110, y: 220 },
      { x: 130, y: 220 },
      { left: 10, top: 20 },
    );
    expect(out.p1).toEqual({ x: 100, y: 200 });
    expect(out.p2).toEqual({ x: 120, y: 200 });
    expect(out.center).toEqual({ x: 110, y: 200 });
    expect(out.distance).toBe(20);
  });
});
