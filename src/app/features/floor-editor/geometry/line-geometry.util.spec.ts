import type { FloorPlanElement } from '../../../core/models/models';
import { getLineEndpoints, moveLine, updateLineEndpoint } from './line-geometry.util';

function line(partial: Partial<FloorPlanElement> & { points: number[] }): FloorPlanElement {
  const points = partial.points;
  return {
    id: 'e1',
    floor_plan_id: 'p1',
    kind: 'wall',
    x: points[0] ?? 0,
    y: points[1] ?? 0,
    width: 0,
    height: 0,
    rotation: 0,
    label: null,
    font_size: null,
    z_index: 0,
    created_at: '',
    updated_at: '',
    ...partial,
    points,
  } as FloorPlanElement;
}

describe('line-geometry.util (PlanEditor characterization)', () => {
  it('getLineEndpoints returns null when points missing or too short', () => {
    expect(getLineEndpoints(line({ points: [0, 0] }))).toBeNull();
    expect(getLineEndpoints(line({ points: [0, 0, 1] }))).toBeNull();
    expect(getLineEndpoints({ ...line({ points: [0, 0, 10, 0] }), points: null })).toBeNull();
  });

  it('getLineEndpoints reads first and last pairs (multi-segment)', () => {
    const endpoints = getLineEndpoints(line({ points: [0, 0, 10, 0, 10, 20] }));
    expect(endpoints).toEqual({
      start: { x: 0, y: 0 },
      end: { x: 10, y: 20 },
    });
  });

  it('getLineEndpoints supports zero-length and negative coords', () => {
    expect(getLineEndpoints(line({ points: [5, 5, 5, 5] }))).toEqual({
      start: { x: 5, y: 5 },
      end: { x: 5, y: 5 },
    });
    expect(getLineEndpoints(line({ points: [-10.5, -2, 3.25, 0] }))).toEqual({
      start: { x: -10.5, y: -2 },
      end: { x: 3.25, y: 0 },
    });
  });

  it('updateLineEndpoint no-ops when too few points', () => {
    const e = line({ points: [1, 2] });
    updateLineEndpoint(e, 'start', { x: 9, y: 9 });
    expect(e.points).toEqual([1, 2]);
  });

  it('updateLineEndpoint start updates origin and width/height deltas', () => {
    const e = line({ points: [0, 0, 100, 50] });
    updateLineEndpoint(e, 'start', { x: 10, y: 20 });
    expect(e.points![0]).toBe(10);
    expect(e.points![1]).toBe(20);
    expect(e.x).toBe(10);
    expect(e.y).toBe(20);
    expect(e.width).toBe(90);
    expect(e.height).toBe(30);
    expect(e.updated_at).toMatch(/^\d{4}-/);
  });

  it('updateLineEndpoint end on vertical/horizontal segments', () => {
    const vertical = line({ points: [0, 0, 0, 100] });
    updateLineEndpoint(vertical, 'end', { x: 0, y: 40 });
    expect(vertical.points).toEqual([0, 0, 0, 40]);
    expect(vertical.width).toBe(0);
    expect(vertical.height).toBe(40);

    const horizontal = line({ points: [0, 5, 80, 5] });
    updateLineEndpoint(horizontal, 'end', { x: 40, y: 5 });
    expect(horizontal.width).toBe(40);
    expect(horizontal.height).toBe(0);
  });

  it('moveLine translates all points and origin; skips point map when < 2 values', () => {
    const e = line({ points: [1, 2, 3, 4], x: 1, y: 2 });
    moveLine(e, 10, -5);
    expect(e.points).toEqual([11, -3, 13, -1]);
    expect(e.x).toBe(11);
    expect(e.y).toBe(-3);

    const short = line({ points: [7], x: 0, y: 0 });
    moveLine(short, 1, 1);
    expect(short.points).toEqual([7]);
    expect(short.x).toBe(1);
    expect(short.y).toBe(1);
  });

  it('moveLine with dx=0 dy=0 still refreshes updated_at', () => {
    const e = line({ points: [0, 0, 1, 1], updated_at: 'old' });
    moveLine(e, 0, 0);
    expect(e.points).toEqual([0, 0, 1, 1]);
    expect(e.updated_at).not.toBe('old');
  });
});
