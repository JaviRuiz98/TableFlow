/**
 * What the shell exposes by role.
 * ADMIN — Usuarios only (placeholder until enterprise view).
 * USER — former ADMIN management (Planos / Operativa / Productos).
 * RECEPTOR — Operativa receive only.
 */
export interface WorkspaceShellVisibility {
  showPlanosTab: boolean;
  showProductosTab: boolean;
  showOperativaTab: boolean;
  showUsersButton: boolean;
  showPlanAdminActions: boolean;
  showEditorToggle: boolean;
  showMapToggle: boolean;
  showAdminPlaceholder: boolean;
}

export function workspaceShellVisibility(input: {
  isAdmin: boolean;
  isManager: boolean;
  isReceptor: boolean;
}): WorkspaceShellVisibility {
  const { isAdmin, isManager, isReceptor } = input;
  return {
    showPlanosTab: isManager,
    showProductosTab: isManager,
    showOperativaTab: isManager || isReceptor,
    showUsersButton: isAdmin,
    showPlanAdminActions: isManager,
    showEditorToggle: isManager,
    showMapToggle: isManager,
    showAdminPlaceholder: isAdmin && !isManager,
  };
}
