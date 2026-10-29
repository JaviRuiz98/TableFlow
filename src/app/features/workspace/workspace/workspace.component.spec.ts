import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { SupabaseService } from '../../../core/infrastructure';
import { FloorPlanService } from '../../floor-plans';
import { OnboardingService } from '../../onboarding';
import { OrderService } from '../../orders';
import { ProductService } from '../../products';
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
  openEditSchedule = vi.fn();
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
  company_id: 'company-1',
  opening_date: '2026-01-01',
  opens_at: '22:00:00',
  closes_at: '06:00:00',
  closes_next_day: true,
  status: 'scheduled',
  created_at: '',
  updated_at: '',
};

describe('WorkspaceComponent (characterization)', () => {
  const floors = {
    list: vi.fn().mockResolvedValue([samplePlan]),
    loadTableAttentionStates: vi.fn().mockResolvedValue([]),
  };
  const orders = {
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    getOpenOrderQuantityMaps: vi.fn().mockResolvedValue({
      pendingByTableId: new Map(),
      totalByTableId: new Map(),
    }),
  };
  const notifications = {
    subscribeToNewOrderItems: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  };
  const auth = {
    hasRole: vi.fn().mockReturnValue(true),
    session: vi.fn().mockReturnValue({ user: { id: 'u1' } }),
    profile: vi.fn().mockReturnValue({ company_id: 'co-1' }),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
  const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
  const onboarding = {
    refresh: vi.fn().mockResolvedValue({ isComplete: true, completedCount: 3, facts: { hasAdditionalUser: true } }),
    progress: vi.fn().mockReturnValue({ completedCount: 0 }),
    isInitialSetup: vi.fn().mockReturnValue(false),
    markStepDone: vi.fn().mockResolvedValue(undefined),
  };
  const products = {
    products: vi.fn().mockResolvedValue([{ id: 'prod-1', company_id: 'co-1' }]),
  };
  const route = {
    snapshot: { queryParamMap: { get: vi.fn().mockReturnValue(null) } },
  };

  function mockRole(role: 'ADMIN' | 'USER' | 'RECEPTOR' | null): void {
    auth.hasRole.mockImplementation((...roles: string[]) => (role ? roles.includes(role) : false));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    floors.list.mockResolvedValue([samplePlan]);
    floors.loadTableAttentionStates.mockResolvedValue([]);
    orders.subscribe.mockReturnValue({ unsubscribe: vi.fn() });
    orders.getOpenOrderQuantityMaps.mockResolvedValue({
      pendingByTableId: new Map(),
      totalByTableId: new Map(),
    });
    notifications.subscribeToNewOrderItems.mockReturnValue({ unsubscribe: vi.fn() });
    mockRole('ADMIN');
    auth.session.mockReturnValue({ user: { id: 'u1' } });
    auth.profile.mockReturnValue({ company_id: 'co-1' });
    auth.signOut.mockResolvedValue(undefined);
    onboarding.refresh.mockResolvedValue({ isComplete: true });
    onboarding.isInitialSetup.mockReturnValue(false);
    onboarding.markStepDone.mockResolvedValue(undefined);
    onboarding.progress.mockReturnValue({ completedCount: 0 });
    products.products.mockResolvedValue([{ id: 'prod-1', company_id: 'co-1' }]);
    route.snapshot.queryParamMap.get.mockReturnValue(null);

    TestBed.configureTestingModule({
      imports: [WorkspaceComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: FloorPlanService, useValue: floors },
        { provide: OrderService, useValue: orders },
        { provide: ProductService, useValue: products },
        { provide: UserAdminService, useValue: {} },
        { provide: OrderNotificationService, useValue: notifications },
        { provide: SupabaseService, useValue: { configured: true } },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: OnboardingService, useValue: onboarding },
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

  it('ADMIN init: management shell + Usuarios, no receptor alerts', async () => {
    const { cmp } = await create();
    expect(cmp.isAdmin).toBe(true);
    expect(cmp.isManager).toBe(false);
    expect(cmp.canManageFloor).toBe(true);
    expect(cmp.activeTab()).toBe('planos');
    expect(cmp.showMap()).toBe(true);
    expect(cmp.shellVisibility).toEqual(
      workspaceShellVisibility({ isAdmin: true, isManager: false, isReceptor: false }),
    );
    expect(cmp.shellVisibility.showUsersButton).toBe(true);
    expect(cmp.shellVisibility.showAdminDashboardLink).toBe(true);
    expect(notifications.subscribeToNewOrderItems).not.toHaveBeenCalled();
    expect(orders.subscribe).toHaveBeenCalledWith(expect.any(Function), 'workspace-orders');
  });

  it('USER (manager) init: planos + management tabs, no Usuarios', async () => {
    mockRole('USER');
    const { cmp } = await create();
    expect(cmp.isManager).toBe(true);
    expect(cmp.activeTab()).toBe('planos');
    expect(cmp.showMap()).toBe(true);
    expect(cmp.shellVisibility.showPlanosTab).toBe(true);
    expect(cmp.shellVisibility.showProductosTab).toBe(true);
    expect(cmp.shellVisibility.showUsersButton).toBe(false);
    expect(notifications.subscribeToNewOrderItems).not.toHaveBeenCalled();
  });

  it('ADMIN initial setup hides workspace chrome (Planos/Operativa/Productos)', async () => {
    onboarding.isInitialSetup.mockReturnValue(true);
    const { cmp } = await create();
    expect(cmp.onboardingMode()).toBe(true);
    expect(orders.subscribe).not.toHaveBeenCalled();
    expect(notifications.subscribeToNewOrderItems).not.toHaveBeenCalled();
  });

  it('ionViewWillEnter restores guided shell after cached re-entry from onboarding', async () => {
    const { cmp } = await create();
    expect(cmp.onboardingMode()).toBe(false);

    cmp.onboardingMode.set(false);
    cmp.setupIntent = null;
    onboarding.isInitialSetup.mockReturnValue(true);
    route.snapshot.queryParamMap.get.mockReturnValue('plan');

    await (cmp as unknown as { reenterWorkspace: () => Promise<void> }).reenterWorkspace();

    expect(onboarding.refresh).toHaveBeenCalled();
    expect(cmp.onboardingMode()).toBe(true);
    expect(cmp.setupIntent).toBe('plan');
  });

  it('returnToOnboarding keeps guided chrome and clears plan surface (no operational flash)', async () => {
    onboarding.isInitialSetup.mockReturnValue(true);
    route.snapshot.queryParamMap.get.mockReturnValue('plan');
    const { cmp } = await create();
    cmp.selectedPlan.set(samplePlan);
    cmp.activeTab.set('operativo');

    await cmp.returnToOnboarding();

    expect(cmp.onboardingMode()).toBe(true);
    expect(cmp.setupIntent).toBeNull();
    expect(cmp.selectedPlan()).toBeNull();
    expect(cmp.activeTab()).toBe('planos');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding');
  });

  it('products setup intent switches off plan editor surface', async () => {
    const { cmp } = await create();
    cmp.selectedPlan.set(samplePlan);
    cmp.activeTab.set('operativo');
    cmp.onboardingMode.set(true);
    onboarding.isInitialSetup.mockReturnValue(true);
    route.snapshot.queryParamMap.get.mockReturnValue('products');

    await (cmp as unknown as { reenterWorkspace: () => Promise<void> }).reenterWorkspace();

    expect(cmp.setupIntent).toBe('products');
    expect(cmp.onboardingMode()).toBe(true);
    expect(cmp.activeTab()).toBe('productos');
    expect(cmp.selectedPlan()).toBeNull();
  });

  it('finishOnboardingProducts marks flag only after at least one product', async () => {
    onboarding.isInitialSetup.mockReturnValue(true);
    route.snapshot.queryParamMap.get.mockReturnValue('products');
    const { cmp } = await create();

    products.products.mockResolvedValueOnce([]);
    await cmp.finishOnboardingProducts();
    expect(onboarding.markStepDone).not.toHaveBeenCalled();
    expect(cmp.toast()).toContain('al menos un producto');

    products.products.mockResolvedValueOnce([{ id: 'prod-1', company_id: 'co-1' }]);
    await cmp.finishOnboardingProducts();
    expect(onboarding.markStepDone).toHaveBeenCalledWith('products');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding');
  });

  it('creating a product during products setup does not auto-complete the step', async () => {
    onboarding.isInitialSetup.mockReturnValue(true);
    route.snapshot.queryParamMap.get.mockReturnValue('products');
    const { cmp } = await create();

    cmp.onOnboardingProductCreated({ id: 'p1', company_id: 'co-1' });
    expect(onboarding.markStepDone).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalledWith('/onboarding');
  });

  it('RECEPTOR init: operativa + first plan + order alerts; no admin tabs', async () => {
    mockRole('RECEPTOR');
    const { cmp } = await create();
    expect(cmp.isReceptor).toBe(true);
    expect(cmp.activeTab()).toBe('operativo');
    expect(cmp.selectedPlan()?.id).toBe('p1');
    expect(cmp.showMap()).toBe(false);
    expect(cmp.shellVisibility.showPlanosTab).toBe(false);
    expect(cmp.shellVisibility.showProductosTab).toBe(false);
    expect(cmp.shellVisibility.showUsersButton).toBe(false);
    expect(notifications.subscribeToNewOrderItems).toHaveBeenCalledTimes(1);
  });

  it('RECEPTOR init shows order alert when pending work already exists', async () => {
    mockRole('RECEPTOR');
    orders.getOpenOrderQuantityMaps.mockResolvedValue({
      pendingByTableId: new Map([['t1', 2]]),
      totalByTableId: new Map([['t1', 2]]),
    });
    const { cmp, fixture } = await create();
    await fixture.whenStable();
    expect(orders.getOpenOrderQuantityMaps).toHaveBeenCalled();
    expect(cmp.newOrderAlert()).toBe(true);
    expect(cmp.userAlertTitle()).toBe('HAY NUEVOS PEDIDOS');
  });

  it('openPlan selects plan and switches to operativa (USER manager)', async () => {
    mockRole('USER');
    const { cmp } = await create();
    cmp.openPlan(samplePlan);
    expect(cmp.selectedPlan()?.id).toBe('p1');
    expect(cmp.activeTab()).toBe('operativo');
    expect(cmp.editorMode()).toBe('operativo');
    expect(cmp.showMap()).toBe(true);
  });

  it('openEditor is no-op for RECEPTOR', async () => {
    mockRole('RECEPTOR');
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
    mockRole('USER');
    const { cmp } = await create();
    const created = { ...samplePlan, id: 'p2', name: 'Nuevo' };
    cmp.onPlanCreated(created);
    expect(cmp.selectedPlan()?.id).toBe('p2');
    expect(cmp.activeTab()).toBe('operativo');
    expect(cmp.editorMode()).toBe('editor');
    expect(cmp.showMap()).toBe(true);
  });

  it('onPlansUpdated syncs selected plan fields and clears deleted selection', async () => {
    const { cmp } = await create();
    cmp.selectedPlan.set(samplePlan);
    cmp.onPlansUpdated([
      {
        ...samplePlan,
        name: 'Sala renombrada',
        opening_date: '2026-10-31',
        opens_at: '23:00:00',
        closes_at: '05:00:00',
      },
    ]);
    expect(cmp.selectedPlan()?.name).toBe('Sala renombrada');
    expect(cmp.selectedPlan()?.opening_date).toBe('2026-10-31');
    expect(cmp.selectedPlan()?.opens_at).toBe('23:00:00');
    cmp.onPlansUpdated([]);
    expect(cmp.selectedPlan()).toBeNull();
  });

  it('askDuplicate / openRename / openEditSchedule / askRemove delegate to plan-admin', async () => {
    const { cmp, planAdmin } = await create();
    cmp.askDuplicate(samplePlan);
    cmp.openRenamePlanDialog(samplePlan);
    cmp.openEditScheduleDialog(samplePlan);
    cmp.askRemovePlan(samplePlan);
    expect(planAdmin.askDuplicate).toHaveBeenCalledWith(samplePlan);
    expect(planAdmin.openRename).toHaveBeenCalledWith(samplePlan);
    expect(planAdmin.openEditSchedule).toHaveBeenCalledWith(samplePlan);
    expect(planAdmin.askRemove).toHaveBeenCalledWith(samplePlan);
  });

  it('formatPlanSchedule shows date and hours', async () => {
    const { cmp } = await create();
    expect(cmp.formatPlanHours(samplePlan)).toBe('22:00 – 06:00 (+1)');
    expect(cmp.formatPlanSchedule(samplePlan)).toContain('22:00 – 06:00 (+1)');
  });

  it('logout resets overlays, unsubscribes channels and navigates to login', async () => {
    const orderUnsub = vi.fn();
    const receptorUnsub = vi.fn();
    orders.subscribe.mockReturnValue({ unsubscribe: orderUnsub });
    notifications.subscribeToNewOrderItems.mockReturnValue({ unsubscribe: receptorUnsub });
    mockRole('RECEPTOR');

    const { cmp, userAdmin, planAdmin, catalogPanel } = await create();
    cmp.newOrderAlert.set(true);
    await cmp.logout();

    expect(cmp.newOrderAlert()).toBe(false);
    expect(userAdmin.reset).toHaveBeenCalled();
    expect(planAdmin.reset).toHaveBeenCalled();
    expect(catalogPanel.reset).toHaveBeenCalled();
    expect(orderUnsub).toHaveBeenCalled();
    expect(receptorUnsub).toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('openUserAccessDialog rejects USER manager with toast', async () => {
    mockRole('USER');
    const { cmp } = await create();
    cmp.openUserAccessDialog();
    expect(cmp.toast()).toContain('administradores');
  });

  it('openUserAccessDialog delegates to user-admin panel for ADMIN', async () => {
    mockRole('ADMIN');
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
