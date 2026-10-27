import { workspaceShellVisibility } from './workspace-shell-visibility.util';

describe('workspaceShellVisibility', () => {
  it('ADMIN sees planos, productos, usuarios and plan admin controls', () => {
    expect(workspaceShellVisibility(true)).toEqual({
      showPlanosTab: true,
      showProductosTab: true,
      showUsersButton: true,
      showPlanAdminActions: true,
      showEditorToggle: true,
      showMapToggle: true,
    });
  });

  it('USER only keeps operativa shell (no admin tabs/controls)', () => {
    expect(workspaceShellVisibility(false)).toEqual({
      showPlanosTab: false,
      showProductosTab: false,
      showUsersButton: false,
      showPlanAdminActions: false,
      showEditorToggle: false,
      showMapToggle: false,
    });
  });
});
