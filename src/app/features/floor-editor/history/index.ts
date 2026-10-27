export {
  EDITOR_HISTORY_MAX,
  createEmptyEditorHistory,
  cloneEditorSnapshot,
  pushEditorHistory,
  canUndoEditorHistory,
  canRedoEditorHistory,
  undoEditorHistoryIndex,
  redoEditorHistoryIndex,
  materializeRestoredSnapshot,
} from './editor-history.util';
export type { EditorHistoryState, EditorHistoryContent } from './editor-history.util';
