import type { ClubTable, FloorPlanElement, FloorSnapshot } from '../../../core/models/models';

/** Max snapshots retained (PlanEditor production behaviour). */
export const EDITOR_HISTORY_MAX = 30;

export interface EditorHistoryState {
  entries: FloorSnapshot[];
  index: number;
}

export interface EditorHistoryContent {
  elements: FloorPlanElement[];
  tables: ClubTable[];
  reserved: ClubTable[];
}

export function createEmptyEditorHistory(): EditorHistoryState {
  return { entries: [], index: -1 };
}

/** Deep-clone current editor geometry into a snapshot (structuredClone). */
export function cloneEditorSnapshot(content: EditorHistoryContent): FloorSnapshot {
  return {
    elements: structuredClone(content.elements),
    tables: structuredClone(content.tables),
    reserved: structuredClone(content.reserved),
  };
}

/**
 * Truncate redo branch, append snapshot, enforce max length (shift oldest).
 * Returns a new state object; caller owns assignment onto PlanEditor fields.
 */
export function pushEditorHistory(
  state: EditorHistoryState,
  content: EditorHistoryContent,
  maxEntries: number = EDITOR_HISTORY_MAX,
): EditorHistoryState {
  const snapshot = cloneEditorSnapshot(content);
  const entries = state.entries.slice(0, state.index + 1);
  entries.push(snapshot);
  if (entries.length > maxEntries) {
    entries.shift();
  }
  return {
    entries,
    index: entries.length - 1,
  };
}

export function canUndoEditorHistory(index: number): boolean {
  return index > 0;
}

export function canRedoEditorHistory(index: number, length: number): boolean {
  return index < length - 1;
}

/** Next index after undo, or null if undo is a no-op. */
export function undoEditorHistoryIndex(index: number): number | null {
  if (!canUndoEditorHistory(index)) return null;
  return index - 1;
}

/** Next index after redo, or null if redo is a no-op. */
export function redoEditorHistoryIndex(index: number, length: number): number | null {
  if (!canRedoEditorHistory(index, length)) return null;
  return index + 1;
}

/**
 * Clone snapshot content and migrate legacy RESERVED rows that still live in `tables`
 * into `reserved` (same rules as PlanEditor.restore).
 */
export function materializeRestoredSnapshot(snapshot: FloorSnapshot): EditorHistoryContent {
  const elements = structuredClone(snapshot.elements);
  let tables = structuredClone(snapshot.tables);
  const reserved = structuredClone(snapshot.reserved ?? []);
  const legacyReserved = tables.filter((t) => t.type === 'RESERVED');
  if (legacyReserved.length) {
    tables = tables.filter((t) => t.type !== 'RESERVED');
    for (const legacy of legacyReserved) {
      if (!reserved.some((r) => r.id === legacy.id)) {
        reserved.push(legacy);
      }
    }
  }
  return { elements, tables, reserved };
}
