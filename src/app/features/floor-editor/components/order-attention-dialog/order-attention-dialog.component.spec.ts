import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../../../core/auth/auth.service';
import type { ClubTable } from '../../../../core/models/models';
import { FloorPlanService } from '../../../floor-plans';
import { OrderService } from '../../../orders';
import { ProductService } from '../../../products';
import { OrderAttentionDialogComponent } from './order-attention-dialog.component';

const table = (partial: Partial<ClubTable> & Pick<ClubTable, 'id' | 'number' | 'type'>): ClubTable =>
  ({
    floor_plan_id: 'plan-1',
    x: 10,
    y: 10,
    width: 100,
    height: 80,
    rotation: 0,
    shape: partial.type === 'RESERVED' ? 'rectangle' : 'circle',
    attended: false,
    observation: null,
    created_at: '',
    updated_at: '',
    ...partial,
  }) as ClubTable;

describe('OrderAttentionDialogComponent', () => {
  let cmp: OrderAttentionDialogComponent;
  const auth = { hasRole: vi.fn().mockReturnValue(true), session: vi.fn().mockReturnValue({ user: { id: 'u1' } }) };
  const floors = {
    setTableObservation: vi.fn().mockResolvedValue(undefined),
    setTableAttended: vi.fn().mockResolvedValue(undefined),
  };
  const orders = {
    forTable: vi.fn().mockResolvedValue({ items: [] }),
    addItem: vi.fn(),
    updatePendingItemQuantity: vi.fn(),
    cancelPendingItem: vi.fn(),
    markPlaced: vi.fn(),
  };
  const products = {
    products: vi.fn().mockResolvedValue([]),
    categories: vi.fn().mockResolvedValue([]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [OrderAttentionDialogComponent],
      providers: [
        { provide: FloorPlanService, useValue: floors },
        { provide: OrderService, useValue: orders },
        { provide: ProductService, useValue: products },
        { provide: AuthService, useValue: auth },
        { provide: ChangeDetectorRef, useValue: { detectChanges: vi.fn() } },
      ],
    }).overrideComponent(OrderAttentionDialogComponent, {
      set: { template: '', styles: [] },
    });
    const fixture = TestBed.createComponent(OrderAttentionDialogComponent);
    cmp = fixture.componentInstance;
  });

  async function openFor(target: ClubTable): Promise<void> {
    cmp.open = true;
    cmp.target = target;
    cmp.ngOnChanges({
      open: { currentValue: true, previousValue: false, firstChange: true, isFirstChange: () => true },
      target: { currentValue: target, previousValue: null, firstChange: true, isFirstChange: () => true },
    });
    await vi.waitFor(() => {
      expect(orders.forTable).toHaveBeenCalledWith(target.id);
    });
  }

  it('loads orders when open+target are set', async () => {
    const target = table({ id: 't1', number: 1, type: 'TABLE' });
    await openFor(target);
    expect(cmp.selectedOrderTarget?.id).toBe('t1');
  });

  it('reloadIfOpen no-ops when closed', async () => {
    cmp.open = false;
    await cmp.reloadIfOpen();
    expect(orders.forTable).not.toHaveBeenCalled();
  });

  it('closeOrderDialog emits closed once while open', () => {
    const spy = vi.fn();
    cmp.closed.subscribe(spy);
    cmp.open = true;
    cmp.selectedOrderTarget = table({ id: 't1', number: 1, type: 'TABLE' });
    cmp.closeOrderDialog();
    cmp.closeOrderDialog();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('pendingChanged emits after order load', async () => {
    const spy = vi.fn();
    cmp.pendingChanged.subscribe(spy);
    orders.forTable.mockResolvedValue({
      items: [{ id: 'i1', quantity: 2, status: 'PENDING', attended: false, product: { name: 'A', category_id: 'c' } }],
    });
    await openFor(table({ id: 't1', number: 1, type: 'TABLE' }));
    expect(spy).toHaveBeenCalled();
  });
});
