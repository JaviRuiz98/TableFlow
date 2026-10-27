/**
 * What the shell exposes by role. Mirrors template `@if (isAdmin)` gates —
 * ADMIN must see Planos + Productos + Usuarios; USER only Operativa.
 */
export interface WorkspaceShellVisibility {
  showPlanosTab: boolean;
  showProductosTab: boolean;
  showUsersButton: boolean;
  showPlanAdminActions: boolean;
  showEditorToggle: boolean;
  showMapToggle: boolean;
}

export function workspaceShellVisibility(isAdmin: boolean): WorkspaceShellVisibility {
  return {
    showPlanosTab: isAdmin,
    showProductosTab: isAdmin,
    showUsersButton: isAdmin,
    showPlanAdminActions: isAdmin,
    showEditorToggle: isAdmin,
    showMapToggle: isAdmin,
  };
}
