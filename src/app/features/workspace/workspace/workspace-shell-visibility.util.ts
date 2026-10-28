/**
 * What the shell exposes by role.
 * ADMIN — full management + Usuarios (enterprise home is /admin).
 * USER — management (Planos / Operativa / Productos).
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
  showAdminDashboardLink: boolean;
}

export function workspaceShellVisibility(input: {
  isAdmin: boolean;
  isManager: boolean;
  isReceptor: boolean;
}): WorkspaceShellVisibility {
  const { isAdmin, isManager, isReceptor } = input;
  const canManage = isManager || isAdmin;
  return {
    showPlanosTab: canManage,
    showProductosTab: canManage,
    showOperativaTab: canManage || isReceptor,
    showUsersButton: isAdmin,
    showPlanAdminActions: canManage,
    showEditorToggle: canManage,
    showMapToggle: canManage,
    showAdminDashboardLink: isAdmin,
  };
}
