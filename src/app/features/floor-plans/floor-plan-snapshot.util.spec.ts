import type { ClubTable, FloorPlanElement, FloorSnapshot } from '../../core/models/models';
import {
  buildDuplicatedSnapshot,
  buildReplaceSnapshotPayload,
  splitTablesByType,
} from './floor-plan-snapshot.util';

describe('floor-plan-snapshot.util', () => {
  const table = (partial: Partial<ClubTable> & Pick<ClubTable, 'id' | 'type' | 'number'>): ClubTable =>
    ({
      floor_plan_id: 'plan-1',
      x: 1,
      y: 2,
      width: 100,
      height: 100,
      rotation: 0,
      shape: 'circle',
      attended: true,
      observation: 'note',
      created_at: '',
      updated_at: '',
      ...partial,
    }) as ClubTable;

  it('splits TABLE vs RESERVED like load()', () => {
    const split = splitTablesByType([
      table({ id: 'a', type: 'TABLE', number: 1 }),
      table({ id: 'b', type: 'RESERVED', number: 2, shape: 'rectangle' }),
    ]);
    expect(split.tables.map((t) => t.id)).toEqual(['a']);
    expect(split.reserved?.map((t) => t.id)).toEqual(['b']);
  });

  it('builds RPC payload preserving table ids and merging reserved', () => {
    const elements = [
      {
        id: 'e1',
        floor_plan_id: 'plan-1',
        kind: 'text',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        rotation: 0,
        points: null,
        label: 'Hi',
        font_size: null,
        z_index: 1,
        created_at: '',
        updated_at: '',
      } as FloorPlanElement,
    ];
    const snapshot: FloorSnapshot = {
      elements,
      tables: [table({ id: 'keep-me', type: 'TABLE', number: 1, attended: true })],
      reserved: [table({ id: 'res-1', type: 'RESERVED', number: 9, shape: 'rectangle' })],
    };

    const payload = buildReplaceSnapshotPayload('plan-1', snapshot);
    expect(payload.p_floor_plan_id).toBe('plan-1');
    expect(payload.p_elements[0].font_size).toBe(22);
    expect(payload.p_tables.map((t) => t.id)).toEqual(['keep-me', 'res-1']);
    expect(payload.p_tables[0].attended).toBe(true);
  });

  it('duplicates geometry with new ids and cleared operational fields', () => {
    let n = 0;
    const source: FloorSnapshot = {
      elements: [
        {
          id: 'e1',
          floor_plan_id: 'old',
          kind: 'wall',
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          rotation: 0,
          points: null,
          label: null,
          font_size: null,
          z_index: 0,
          created_at: '',
          updated_at: '',
        } as FloorPlanElement,
      ],
      tables: [table({ id: 't1', type: 'TABLE', number: 1, attended: true, observation: 'x' })],
      reserved: [table({ id: 'r1', type: 'RESERVED', number: 2, attended: true, observation: 'y' })],
    };

    const clone = buildDuplicatedSnapshot(source, 'copy-id', () => `new-${++n}`);
    expect(clone.elements[0].id).toBe('new-1');
    expect(clone.elements[0].floor_plan_id).toBe('copy-id');
    expect(clone.tables[0].id).toBe('new-2');
    expect(clone.tables[0].attended).toBe(false);
    expect(clone.tables[0].observation).toBeNull();
    expect(clone.reserved?.[0].id).toBe('new-3');
    expect(clone.reserved?.[0].attended).toBe(false);
    expect(clone.reserved?.[0].observation).toBeNull();
  });
});
