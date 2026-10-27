import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorMessageService, SupabaseService } from '../../core/infrastructure';
import { FloorPlanService, PlanDuplicationService } from '../floor-plans';
import { OrderService } from '../orders';
import { ProductService } from '../products';
import { UserAdminService } from '../users';
import { OrderNotificationService } from '../notifications';
import type { FloorPlan } from '../../core/models/models';
import { WorkspaceComponent } from './workspace.component';

@Component({ selector: 'app-plan-editor', standalone: true, template: '' })
class StubPlanEditorComponent {}

@Component({ selector: 'app-table-product-panel', standalone: true, template: '' })
class StubTableProductPanelComponent {}

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
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const product = {
    categories: vi.fn().mockResolvedValue([]),
    products: vi.fn().mockResolvedValue([]),
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
    product.categories.mockResolvedValue([]);
    product.products.mockResolvedValue([]);
    orders.subscribe.mockReturnValue({ unsubscribe: vi.fn() });
    notifications.subscribeToNewOrderItems.mockReturnValue({ unsubscribe: vi.fn() });
    auth.hasRole.mockReturnValue(true);
    auth.signOut.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [WorkspaceComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: FloorPlanService, useValue: floors },
        { provide: ProductService, useValue: product },
        { provide: OrderService, useValue: orders },
        { provide: UserAdminService, useValue: {} },
        { provide: PlanDuplicationService, useValue: {} },
        { provide: OrderNotificationService, useValue: notifications },
        { provide: ErrorMessageService, useValue: { humanize: (e: unknown) => String(e) } },
        { provide: SupabaseService, useValue: { configured: true } },
        { provide: Router, useValue: router },
      ],
    })
      .overrideComponent(WorkspaceComponent, {
        set: {
          imports: [StubPlanEditorComponent, StubTableProductPanelComponent],
          template: '<div></div>',
          styles: [],
        },
      });
  });

  async function create(): Promise<WorkspaceComponent> {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    await fixture.componentInstance.ngOnInit();
    return fixture.componentInstance;
  }

  it('ADMIN init: planos tab, no user-order subscription, orders channel subscribed', async () => {
    const cmp = await create();
    expect(cmp.activeTab()).toBe('planos');
    expect(cmp.selectedPlan()).toBeNull();
    expect(cmp.showMap()).toBe(true);
    expect(notifications.subscribeToNewOrderItems).not.toHaveBeenCalled();
    expect(orders.subscribe).toHaveBeenCalledWith(expect.any(Function), 'workspace-orders');
  });

  it('USER init: operativa + first plan + user-order alerts', async () => {
    auth.hasRole.mockReturnValue(false);
    const cmp = await create();
    expect(cmp.activeTab()).toBe('operativo');
    expect(cmp.selectedPlan()?.id).toBe('p1');
    expect(cmp.showMap()).toBe(false);
    expect(notifications.subscribeToNewOrderItems).toHaveBeenCalledTimes(1);
  });

  it('openPlan selects plan and switches to operativa', async () => {
    const cmp = await create();
    cmp.openPlan(samplePlan);
    expect(cmp.selectedPlan()?.id).toBe('p1');
    expect(cmp.activeTab()).toBe('operativo');
    expect(cmp.editorMode()).toBe('operativo');
  });

  it('openEditor is no-op for non-admin', async () => {
    auth.hasRole.mockReturnValue(false);
    const cmp = await create();
    cmp.selectedPlan.set(null);
    cmp.openEditor(samplePlan);
    expect(cmp.selectedPlan()).toBeNull();
  });

  it('logout resets overlays, unsubscribes channels and navigates to login', async () => {
    const orderUnsub = vi.fn();
    const userUnsub = vi.fn();
    orders.subscribe.mockReturnValue({ unsubscribe: orderUnsub });
    notifications.subscribeToNewOrderItems.mockReturnValue({ unsubscribe: userUnsub });
    auth.hasRole.mockReturnValue(false);

    const cmp = await create();
    cmp.createPlanDialog.set(true);
    cmp.newOrderAlert.set(true);
    await cmp.logout();

    expect(cmp.createPlanDialog()).toBe(false);
    expect(cmp.newOrderAlert()).toBe(false);
    expect(orderUnsub).toHaveBeenCalled();
    expect(userUnsub).toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('openUserAccessDialog rejects non-admin with toast', async () => {
    auth.hasRole.mockReturnValue(false);
    const cmp = await create();
    cmp.openUserAccessDialog();
    expect(cmp.userAccessDialog()).toBe(false);
    expect(cmp.toast()).toContain('administradores');
  });
});
