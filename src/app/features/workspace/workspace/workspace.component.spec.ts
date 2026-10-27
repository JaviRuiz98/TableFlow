import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { SupabaseService } from '../../../core/infrastructure';
import { FloorPlanService } from '../../floor-plans';
import { OrderService } from '../../orders';
import { UserAdminService } from '../../users';
import { OrderNotificationService } from '../../notifications';
import type { FloorPlan } from '../../../core/models/models';
import { WorkspaceComponent } from './workspace.component';
import { workspaceShellVisibility } from './workspace-shell-visibility.util';

@Component({ selector: 'app-plan-editor', standalone: true, template: '' })
class StubPlanEditorComponent {}

@Component({ selector: 'app-table-product-panel', standalone: true, template: '' })
class StubTableProductPanelComponent {}

@Component({
  selector: 'app-workspace-user-admin',
  standalone: true,
  template: '',
  exportAs: 'userAdmin',
})
class StubUserAdminComponent {
  openAccess = vi.fn();
  reset = vi.fn();
}

@Component({
  selector: 'app-workspace-plan-admin-dialogs',
  standalone: true,
  template: '',
  exportAs: 'planAdmin',
})
class StubPlanAdminDialogsComponent {
  openCreate = vi.fn();
  askDuplicate = vi.fn();
  openRename = vi.fn();
  askRemove = vi.fn();
  reset = vi.fn();
}

@Component({
  selector: 'app-workspace-catalog-panel',
  standalone: true,
  template: '',
  exportAs: 'catalogPanel',
})
class StubCatalogPanelComponent {
  reset = vi.fn();
}

@Component({ selector: 'app-workspace-user-alert-modal', standalone: true, template: '' })
class StubUserAlertModalComponent {}

const samplePlan: FloorPlan = {
  id: 'p1',
  name: 'Sala',
  width: 2000,
  height: 1200,
  is_active: false,
  is_locked: false,
  created_by: 'u1',
  created_at: '',
  updated_at: '',
};

describe('WorkspaceComponent (characterization)', () => {
  const floors = {
    list: vi.fn().mockResolvedValue([samplePlan]),
  };
  const orders = {
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  };
  const notifications = {
    subscribeToNewOrderItems: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  };
  const auth = {
    hasRole: vi.fn().mockReturnValue(true),
    session: vi.fn().mockReturnValue({ user: { id: 'u1' } }),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
  const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };

  beforeEach(() => {
    vi.clearAllMocks();
    floors.list.mockResolvedValue([samplePlan]);
    orders.subscribe.mockReturnValue({ unsubscribe: vi.fn() });
    notifications.subscribeToNewOrderItems.mockReturnValue({ unsubscribe: vi.fn() });
    auth.hasRole.mockReturnValue(true);
    auth.session.mockReturnValue({ user: { id: 'u1' } });
    auth.signOut.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [WorkspaceComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: FloorPlanService, useValue: floors },
        { provide: OrderService, useValue: orders },
        { provide: UserAdminService, useValue: {} },
        { provide: OrderNotificationService, useValue: notifications },
        { provide: SupabaseService, useValue: { configured: true } },
        { provide: Router, useValue: router },
      ],
    }).overrideComponent(WorkspaceComponent, {
      set: {
        imports: [
          StubPlanEditorComponent,
          StubTableProductPanelComponent,
          StubUserAdminComponent,
          StubPlanAdminDialogsComponent,
          StubCatalogPanelComponent,
          StubUserAlertModalComponent,
        ],
        template: `
          <app-workspace-user-admin #userAdmin></app-workspace-user-admin>
          <app-workspace-plan-admin-dialogs #planAdmin></app-workspace-plan-admin-dialogs>
          <app-workspace-catalog-panel #catalogPanel></app-workspace-catalog-panel>
        `,
        styles: [],
      },
    });
  });

  async function create(): Promise<{
    cmp: WorkspaceComponent;
    fixture: ReturnType<typeof TestBed.createComponent<WorkspaceComponent>>;
    userAdmin: StubUserAdminComponent;
    planAdmin: StubPlanAdminDialogsComponent;
    catalogPanel: StubCatalogPanelComponent;
  }> {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const children = fixture.debugElement.children;
    const userAdmin = children[0].componentInstance as StubUserAdminComponent;
    const planAdmin = children[1].componentInstance as StubPlanAdminDialogsComponent;
    const catalogPanel = children[2].componentInstance as StubCatalogPanelComponent;
    return { cmp: fixture.componentInstance, fixture, userAdmin, planAdmin, catalogPanel };
  }

  it('ADMIN init: planos tab, no user-order subscription, orders channel subscribed', async () => {
    const { cmp } = await create();
    expect(cmp.activeTab()).toBe('planos');
    expect(cmp.selectedPlan()).toBeNull();
    expect(cmp.showMap()).toBe(true);
    expect(cmp.shellVisibility).toEqual(workspaceShellVisibility(true));
    expect(notifications.subscribeToNewOrderItems).not.toHaveBeenCalled();
    expect(orders.subscribe).toHaveBeenCalledWith(expect.any(Function), 'workspace-orders');
  });

  it('ADMIN shell visibility keeps Planos + Productos + Usuarios', async () => {
    const { cmp } = await create();
    expect(cmp.isAdmin).toBe(true);
    expect(cmp.shellVisibility.showPlanosTab).toBe(true);
    expect(cmp.shellVisibility.showProductosTab).toBe(true);
    expect(cmp.shellVisibility.showUsersButton).toBe(true);
  });

  it('USER init: operativa + first plan + user-order alerts; no admin tabs', async () => {
    auth.hasRole.mockReturnValue(false);
    const { cmp } = await create();
    expect(cmp.activeTab()).toBe('operativo');
    expect(cmp.selectedPlan()?.id).toBe('p1');
    expect(cmp.showMap()).toBe(false);
    expect(cmp.shellVisibility.showPlanosTab).toBe(false);
    expect(cmp.shellVisibility.showProductosTab).toBe(false);
    expect(cmp.shellVisibility.showUsersButton).toBe(false);
    expect(notifications.subscribeToNewOrderItems).toHaveBeenCalledTimes(1);
  });

  it('openPlan selects plan and switches to operativa', async () => {
    const { cmp } = await create();
    cmp.openPlan(samplePlan);
    expect(cmp.selectedPlan()?.id).toBe('p1');
    expect(cmp.activeTab()).toBe('operativo');
    expect(cmp.editorMode()).toBe('operativo');
  });

  it('openEditor is no-op for non-admin', async () => {
    auth.hasRole.mockReturnValue(false);
    const { cmp } = await create();
    cmp.selectedPlan.set(null);
    cmp.openEditor(samplePlan);
    expect(cmp.selectedPlan()).toBeNull();
  });

  it('openCreatePlanDialog delegates to plan-admin child', async () => {
    const { cmp, planAdmin } = await create();
    cmp.openCreatePlanDialog();
    expect(planAdmin.openCreate).toHaveBeenCalled();
  });

  it('onPlanCreated navigates shell to editor operativa', async () => {
    const { cmp } = await create();
    const created = { ...samplePlan, id: 'p2', name: 'Nuevo' };
    cmp.onPlanCreated(created);
    expect(cmp.selectedPlan()?.id).toBe('p2');
    expect(cmp.activeTab()).toBe('operativo');
    expect(cmp.editorMode()).toBe('editor');
    expect(cmp.showMap()).toBe(true);
  });

  it('onPlansUpdated syncs selected plan name and clears deleted selection', async () => {
    const { cmp } = await create();
    cmp.selectedPlan.set(samplePlan);
    cmp.onPlansUpdated([{ ...samplePlan, name: 'Sala renombrada' }]);
    expect(cmp.selectedPlan()?.name).toBe('Sala renombrada');
    cmp.onPlansUpdated([]);
    expect(cmp.selectedPlan()).toBeNull();
  });

  it('askDuplicate / openRename / askRemove delegate to plan-admin', async () => {
    const { cmp, planAdmin } = await create();
    cmp.askDuplicate(samplePlan);
    cmp.openRenamePlanDialog(samplePlan);
    cmp.askRemovePlan(samplePlan);
    expect(planAdmin.askDuplicate).toHaveBeenCalledWith(samplePlan);
    expect(planAdmin.openRename).toHaveBeenCalledWith(samplePlan);
    expect(planAdmin.askRemove).toHaveBeenCalledWith(samplePlan);
  });

  it('logout resets overlays, unsubscribes channels and navigates to login', async () => {
    const orderUnsub = vi.fn();
    const userUnsub = vi.fn();
    orders.subscribe.mockReturnValue({ unsubscribe: orderUnsub });
    notifications.subscribeToNewOrderItems.mockReturnValue({ unsubscribe: userUnsub });
    auth.hasRole.mockReturnValue(false);

    const { cmp, userAdmin, planAdmin, catalogPanel } = await create();
    cmp.newOrderAlert.set(true);
    await cmp.logout();

    expect(cmp.newOrderAlert()).toBe(false);
    expect(userAdmin.reset).toHaveBeenCalled();
    expect(planAdmin.reset).toHaveBeenCalled();
    expect(catalogPanel.reset).toHaveBeenCalled();
    expect(orderUnsub).toHaveBeenCalled();
    expect(userUnsub).toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('openUserAccessDialog rejects non-admin with toast', async () => {
    auth.hasRole.mockReturnValue(false);
    const { cmp } = await create();
    cmp.openUserAccessDialog();
    expect(cmp.toast()).toContain('administradores');
  });

  it('openUserAccessDialog delegates to user-admin panel for ADMIN', async () => {
    const { cmp, userAdmin } = await create();
    cmp.openUserAccessDialog();
    expect(userAdmin.openAccess).toHaveBeenCalled();
  });

  it('onChildToast sets shell toast', async () => {
    const { cmp } = await create();
    cmp.onChildToast('Hola');
    expect(cmp.toast()).toBe('Hola');
  });
});
