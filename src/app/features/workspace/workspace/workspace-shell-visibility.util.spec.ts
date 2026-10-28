import { workspaceShellVisibility } from './workspace-shell-visibility.util';

describe('workspaceShellVisibility', () => {
  it('USER (manager) sees Planos + Operativa + Productos, not Usuarios', () => {
    expect(
      workspaceShellVisibility({ isAdmin: false, isManager: true, isReceptor: false }),
    ).toEqual({
      showPlanosTab: true,
      showProductosTab: true,
      showOperativaTab: true,
      showUsersButton: false,
      showPlanAdminActions: true,
      showEditorToggle: true,
      showMapToggle: true,
      showAdminDashboardLink: false,
    });
  });

  it('ADMIN sees management tabs + Usuarios + link to dashboard', () => {
    expect(
      workspaceShellVisibility({ isAdmin: true, isManager: false, isReceptor: false }),
    ).toEqual({
      showPlanosTab: true,
      showProductosTab: true,
      showOperativaTab: true,
      showUsersButton: true,
      showPlanAdminActions: true,
      showEditorToggle: true,
      showMapToggle: true,
      showAdminDashboardLink: true,
    });
  });

  it('RECEPTOR only keeps operativa shell', () => {
    expect(
      workspaceShellVisibility({ isAdmin: false, isManager: false, isReceptor: true }),
    ).toEqual({
      showPlanosTab: false,
      showProductosTab: false,
      showOperativaTab: true,
      showUsersButton: false,
      showPlanAdminActions: false,
      showEditorToggle: false,
      showMapToggle: false,
      showAdminDashboardLink: false,
    });
  });
});
