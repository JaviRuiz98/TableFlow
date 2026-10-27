import type { FloorPlan } from '../../../core/models/models';

export type WorkspaceTab = 'planos' | 'operativo' | 'productos';
export type EditorMode = 'editor' | 'operativo';

export interface WorkspacePresentationInit {
  activeTab: WorkspaceTab;
  editorMode: EditorMode;
  showMap: boolean;
  selectedPlan: FloorPlan | null;
  subscribeUserOrderAlerts: boolean;
}

/**
 * Presentación inicial tras cargar planos: ADMIN entra en listado;
 * USER en operativa del primer plano (si existe) con alertas de pedidos.
 */
export function initialWorkspacePresentation(
  isAdmin: boolean,
  plans: FloorPlan[],
): WorkspacePresentationInit {
  if (isAdmin) {
    return {
      activeTab: 'planos',
      editorMode: 'operativo',
      showMap: true,
      selectedPlan: null,
      subscribeUserOrderAlerts: false,
    };
  }
  return {
    activeTab: 'operativo',
    editorMode: 'operativo',
    showMap: false,
    selectedPlan: plans.length ? plans[0] : null,
    subscribeUserOrderAlerts: true,
  };
}
