import type { ClubTable, FloorPlanElement, FloorSnapshot } from '../../../core/models/models';
import {
  EDITOR_HISTORY_MAX,
  canRedoEditorHistory,
  canUndoEditorHistory,
  cloneEditorSnapshot,
  createEmptyEditorHistory,
  materializeRestoredSnapshot,
  pushEditorHistory,
  redoEditorHistoryIndex,
  undoEditorHistoryIndex,
} from './editor-history.util';

const table = (partial: Partial<ClubTable> & Pick<ClubTable, 'id' | 'number' | 'type'>): ClubTable =>
  ({
    floor_plan_id: 'p',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    rotation: 0,
    shape: 'circle',
    attended: false,
    observation: null,
    created_at: '',
    updated_at: '',
    ...partial,
  }) as ClubTable;

describe('editor-history.util (characterization)', () => {
  it('starts empty then first push lands at index 0', () => {
    let state = createEmptyEditorHistory();
    expect(state.index).toBe(-1);
    state = pushEditorHistory(state, { elements: [], tables: [table({ id: 'a', number: 1, type: 'TABLE' })], reserved: [] });
    expect(state.index).toBe(0);
    expect(state.entries).toHaveLength(1);
  });

  it('clones snapshots independently of later mutations', () => {
    const tables = [table({ id: 'a', number: 1, type: 'TABLE' })];
    const snap = cloneEditorSnapshot({ elements: [], tables, reserved: [] });
    tables[0].number = 99;
    expect(snap.tables[0].number).toBe(1);
  });

  it('truncates redo branch after undo + new edit', () => {
    let state = createEmptyEditorHistory();
    state = pushEditorHistory(state, { elements: [], tables: [table({ id: 'a', number: 1, type: 'TABLE' })], reserved: [] });
    state = pushEditorHistory(state, {
      elements: [],
      tables: [table({ id: 'a', number: 1, type: 'TABLE' }), table({ id: 'b', number: 2, type: 'TABLE' })],
      reserved: [],
    });
    const undoIdx = undoEditorHistoryIndex(state.index);
    expect(undoIdx).toBe(0);
    state = { ...state, index: undoIdx! };
    state = pushEditorHistory(state, { elements: [], tables: [table({ id: 'z', number: 9, type: 'TABLE' })], reserved: [] });
    expect(state.entries).toHaveLength(2);
    expect(state.index).toBe(1);
    expect(state.entries[1].tables.map((t) => t.id)).toEqual(['z']);
  });

  it('caps at EDITOR_HISTORY_MAX', () => {
    let state = createEmptyEditorHistory();
    for (let i = 0; i < EDITOR_HISTORY_MAX + 10; i++) {
      state = pushEditorHistory(state, {
        elements: [],
        tables: [table({ id: `t${i}`, number: i + 1, type: 'TABLE' })],
        reserved: [],
      });
    }
    expect(state.entries.length).toBe(EDITOR_HISTORY_MAX);
    expect(state.index).toBe(EDITOR_HISTORY_MAX - 1);
    expect(state.entries[0].tables[0].id).toBe('t10');
  });

  it('undo/redo index guards', () => {
    expect(canUndoEditorHistory(0)).toBe(false);
    expect(canUndoEditorHistory(1)).toBe(true);
    expect(undoEditorHistoryIndex(0)).toBeNull();
    expect(canRedoEditorHistory(0, 2)).toBe(true);
    expect(redoEditorHistoryIndex(0, 2)).toBe(1);
    expect(canRedoEditorHistory(1, 2)).toBe(false);
    expect(redoEditorHistoryIndex(1, 2)).toBeNull();
  });

  it('materializeRestoredSnapshot migrates legacy RESERVED and preserves ids', () => {
    const snapshot: FloorSnapshot = {
      elements: [{ id: 'e1' } as FloorPlanElement],
      tables: [
        table({ id: 't1', number: 1, type: 'TABLE' }),
        table({ id: 'legacy-r', number: 3, type: 'RESERVED', shape: 'rectangle' }),
      ],
      reserved: [],
    };
    const out = materializeRestoredSnapshot(snapshot);
    expect(out.elements[0].id).toBe('e1');
    expect(out.tables.map((t) => t.id)).toEqual(['t1']);
    expect(out.reserved.map((t) => t.id)).toEqual(['legacy-r']);
    // Independence from source
    snapshot.tables[0].number = 7;
    expect(out.tables[0].number).toBe(1);
  });

  it('materializeRestoredSnapshot does not duplicate reserved already present', () => {
    const reservedRow = table({ id: 'r1', number: 1, type: 'RESERVED', shape: 'rectangle' });
    const out = materializeRestoredSnapshot({
      elements: [],
      tables: [table({ id: 'r1', number: 1, type: 'RESERVED', shape: 'rectangle' })],
      reserved: [reservedRow],
    });
    expect(out.reserved).toHaveLength(1);
    expect(out.tables).toHaveLength(0);
  });
});
