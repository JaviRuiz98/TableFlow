import type { FloorPlan } from '../../../core/models/models';

export type WorkspaceTab = 'planos' | 'operativo' | 'productos';
export type EditorMode = 'editor' | 'operativo';

export interface WorkspacePresentationInit {
  activeTab: WorkspaceTab;
  editorMode: EditorMode;
  showMap: boolean;
  selectedPlan: FloorPlan | null;
  /** Realtime order/observation alerts — RECEPTOR only. */
  subscribeReceptorOrderAlerts: boolean;
}

/**
 * Presentación inicial:
 * ADMIN / USER (manager) → listado de planos.
 * RECEPTOR → operativa del primer plano + alertas.
 */
export function initialWorkspacePresentation(
  input: { isAdmin: boolean; isManager: boolean; isReceptor: boolean },
  plans: FloorPlan[],
): WorkspacePresentationInit {
  if (input.isManager || input.isAdmin) {
    return {
      activeTab: 'planos',
      editorMode: 'operativo',
      showMap: true,
      selectedPlan: null,
      subscribeReceptorOrderAlerts: false,
    };
  }
  if (input.isReceptor) {
    return {
      activeTab: 'operativo',
      editorMode: 'operativo',
      showMap: false,
      selectedPlan: plans.length ? plans[0] : null,
      subscribeReceptorOrderAlerts: true,
    };
  }
  return {
    activeTab: 'planos',
    editorMode: 'operativo',
    showMap: false,
    selectedPlan: null,
    subscribeReceptorOrderAlerts: false,
  };
}
