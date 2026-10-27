import { mapFloorPlanElementPoints, mapFloorPlanElementRow } from './floor-plan-element.mapper';
import type { Tables } from '../../core/data/database.types';

describe('mapFloorPlanElementPoints', () => {
  it('keeps null and maps numeric arrays', () => {
    expect(mapFloorPlanElementPoints(null)).toBeNull();
    expect(mapFloorPlanElementPoints([0, 10, 20, 30])).toEqual([0, 10, 20, 30]);
  });

  it('rejects non-array jsonb without inventing coordinates', () => {
    expect(mapFloorPlanElementPoints({ x: 1 })).toBeNull();
    expect(mapFloorPlanElementPoints('nope')).toBeNull();
  });
});

describe('mapFloorPlanElementRow', () => {
  it('preserves row fields and normalizes points', () => {
    const row: Tables<'floor_plan_elements'> = {
      id: 'e1',
      floor_plan_id: 'p1',
      kind: 'wall',
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      rotation: 0,
      points: [1, 2, 3, 4],
      label: null,
      font_size: null,
      z_index: 5,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    expect(mapFloorPlanElementRow(row)).toEqual({
      ...row,
      points: [1, 2, 3, 4],
    });
  });
});
