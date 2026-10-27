import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { SupabaseService } from '../../core/infrastructure';
import { FloorPlanService, PlanDuplicationService } from '../floor-plans';
import { OrderService } from '../orders';
import { ProductService } from '../products';
import { UserAdminService } from '../users';
import { OrderNotificationService } from '../notifications';
import type { FloorPlan, Product, ProductCategory } from '../../core/models/models';
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

const sampleCategory: ProductCategory = {
  id: 'c1',
  name: 'Bebidas',
  sort_order: 0,
  created_at: '',
  updated_at: '',
};

const sampleProduct: Product = {
  id: 'pr1',
  category_id: 'c1',
  name: 'Agua',
  price: null,
  active: true,
  created_at: '',
  updated_at: '',
};

describe('WorkspaceComponent (characterization)', () => {
  const floors = {
    list: vi.fn().mockResolvedValue([samplePlan]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const product = {
    categories: vi.fn().mockResolvedValue([]),
    products: vi.fn().mockResolvedValue([]),
    createCategory: vi.fn(),
    createProduct: vi.fn(),
    updateCategory: vi.fn(),
    updateProduct: vi.fn(),
    productHasOrderHistory: vi.fn(),
    categoryHasOrderHistory: vi.fn(),
    deleteProductSafe: vi.fn(),
    deleteCategorySafe: vi.fn(),
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
  const duplication = {
    duplicate: vi.fn(),
  };
  const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };

  beforeEach(() => {
    vi.clearAllMocks();
    floors.list.mockResolvedValue([samplePlan]);
    product.categories.mockResolvedValue([]);
    product.products.mockResolvedValue([]);
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
        { provide: ProductService, useValue: product },
        { provide: OrderService, useValue: orders },
        { provide: UserAdminService, useValue: {} },
        { provide: PlanDuplicationService, useValue: duplication },
        { provide: OrderNotificationService, useValue: notifications },
        { provide: SupabaseService, useValue: { configured: true } },
        { provide: Router, useValue: router },
      ],
    })
      .overrideComponent(WorkspaceComponent, {
        set: {
          imports: [StubPlanEditorComponent, StubTableProductPanelComponent, StubUserAdminComponent],
          template: '<app-workspace-user-admin #userAdmin></app-workspace-user-admin>',
          styles: [],
        },
      });
  });

  async function create(): Promise<{
    cmp: WorkspaceComponent;
    fixture: ReturnType<typeof TestBed.createComponent<WorkspaceComponent>>;
    userAdmin: StubUserAdminComponent;
  }> {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    // Create child ViewChild bindings first, then run init once (await async load).
    fixture.detectChanges();
    // ngOnInit already ran via detectChanges — re-await completion via whenStable only.
    await fixture.whenStable();
    const userAdmin = fixture.debugElement.children[0].componentInstance as StubUserAdminComponent;
    return { cmp: fixture.componentInstance, fixture, userAdmin };
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

  it('createPlan dialog open/close and create success', async () => {
    floors.create.mockResolvedValue({ ...samplePlan, id: 'p2', name: 'Nuevo' });
    const { cmp } = await create();
    cmp.openCreatePlanDialog();
    expect(cmp.createPlanDialog()).toBe(true);
    cmp.newPlanName = 'Nuevo';
    await cmp.createPlan();
    expect(floors.create).toHaveBeenCalled();
    expect(cmp.createPlanDialog()).toBe(false);
    expect(cmp.activeTab()).toBe('operativo');
    expect(cmp.selectedPlan()?.id).toBe('p2');
    expect(cmp.toast()).toContain('creado');
  });

  it('askDuplicate / closeCopyDialog', async () => {
    const { cmp } = await create();
    cmp.askDuplicate(samplePlan);
    expect(cmp.copyPlanDialog()).toBe(true);
    expect(cmp.copyPlanName).toBe('Sala copia');
    cmp.closeCopyDialog();
    expect(cmp.copyPlanDialog()).toBe(false);
    expect(cmp.planToCopy()).toBeNull();
  });

  it('catalog delete product blocked path', async () => {
    product.productHasOrderHistory.mockResolvedValue(true);
    const { cmp } = await create();
    await cmp.askDeleteProduct(sampleProduct);
    expect(cmp.catalogDeleteDialog()).toBe(true);
    expect(cmp.catalogDeleteBlocked()).toBe(true);
    expect(cmp.productToDelete()?.id).toBe('pr1');
  });

  it('confirmCatalogDelete applies product removal', async () => {
    product.deleteProductSafe.mockResolvedValue(true);
    const { cmp } = await create();
    cmp.products.set([sampleProduct]);
    cmp.categories.set([sampleCategory]);
    cmp.productToDelete.set(sampleProduct);
    cmp.catalogDeleteDialog.set(true);
    await cmp.confirmCatalogDelete();
    expect(cmp.products()).toEqual([]);
    expect(cmp.catalogDeleteDialog()).toBe(false);
    expect(cmp.toast()).toBe('Producto eliminado');
  });

  it('logout resets overlays, unsubscribes channels and navigates to login', async () => {
    const orderUnsub = vi.fn();
    const userUnsub = vi.fn();
    orders.subscribe.mockReturnValue({ unsubscribe: orderUnsub });
    notifications.subscribeToNewOrderItems.mockReturnValue({ unsubscribe: userUnsub });
    auth.hasRole.mockReturnValue(false);

    const { cmp, userAdmin } = await create();
    cmp.createPlanDialog.set(true);
    cmp.newOrderAlert.set(true);
    await cmp.logout();

    expect(cmp.createPlanDialog()).toBe(false);
    expect(cmp.newOrderAlert()).toBe(false);
    expect(userAdmin.reset).toHaveBeenCalled();
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
});
