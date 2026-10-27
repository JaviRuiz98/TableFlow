import { emptyWorkspaceTransientUi, defaultCopyPlanName } from './workspace-transient.util';
import { NEW_ORDER_ALERT } from './workspace-alerts.util';

describe('workspace-transient.util', () => {
  it('emptyWorkspaceTransientUi closes all overlays and clears forms', () => {
    const ui = emptyWorkspaceTransientUi();
    expect(ui.createPlanDialog).toBe(false);
    expect(ui.userAccessDialog).toBe(false);
    expect(ui.createUserDialog).toBe(false);
    expect(ui.copyPlanDialog).toBe(false);
    expect(ui.renamePlanDialog).toBe(false);
    expect(ui.deletePlanDialog).toBe(false);
    expect(ui.newOrderAlert).toBe(false);
    expect(ui.editCategoryDialog).toBe(false);
    expect(ui.editProductDialog).toBe(false);
    expect(ui.catalogDeleteDialog).toBe(false);
    expect(ui.catalogDeleteBlocked).toBe(false);
    expect(ui.verifiedAdminPassword).toBe('');
    expect(ui.newUserRole).toBe('USER');
    expect(ui.userAlertTitle).toBe(NEW_ORDER_ALERT.title);
    expect(ui.planToCopy).toBeNull();
    expect(ui.categoryToDelete).toBeNull();
  });

  it('defaultCopyPlanName matches previous askDuplicate naming', () => {
    expect(defaultCopyPlanName('Sala')).toBe('Sala copia');
  });
});
