import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { GeometryService } from '../geometry';
import { TableDeletionService } from '../../tables';
import type { ClubTable, FloorPlan, FloorPlanElement, FloorSnapshot } from '../../../core/models/models';
import { FloorPlanService } from '../../floor-plans';
import { OrderService } from '../../orders';
import { PlanEditorComponent } from './plan-editor.component';

const plan = (partial: Partial<FloorPlan> = {}): FloorPlan => ({
  id: 'plan-1',
  name: 'Sala',
  width: 2000,
  height: 1200,
  is_active: false,
  is_locked: false,
  company_id: 'company-1',
  created_at: '',
  updated_at: '',
  ...partial,
});

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

describe('PlanEditorComponent history/permissions (characterization)', () => {
  let cmp: PlanEditorComponent;
  let renderSpy: ReturnType<typeof vi.spyOn>;
  const auth = { hasRole: vi.fn().mockReturnValue(true) };
  const floors = { saveSnapshot: vi.fn().mockResolvedValue(undefined) };
  const orders = {
    forTable: vi.fn().mockResolvedValue({ items: [] }),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    getOpenOrderQuantityMaps: vi.fn().mockResolvedValue({
      pendingByTableId: new Map(),
      totalByTableId: new Map(),
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.hasRole.mockReturnValue(true);
    floors.saveSnapshot.mockResolvedValue(undefined);
    orders.forTable.mockResolvedValue({ items: [] });
    orders.subscribe.mockReturnValue({ unsubscribe: vi.fn() });
    orders.getOpenOrderQuantityMaps.mockResolvedValue({
      pendingByTableId: new Map(),
      totalByTableId: new Map(),
    });

    TestBed.configureTestingModule({
      imports: [PlanEditorComponent],
      providers: [
        { provide: FloorPlanService, useValue: floors },
        { provide: GeometryService, useValue: {} },
        { provide: AuthService, useValue: auth },
        { provide: OrderService, useValue: orders },
        { provide: TableDeletionService, useValue: {} },
        { provide: ChangeDetectorRef, useValue: { detectChanges: vi.fn() } },
      ],
    }).overrideComponent(PlanEditorComponent, {
      set: { template: '<div #container></div>', styles: [] },
    });

    const fixture = TestBed.createComponent(PlanEditorComponent);
    cmp = fixture.componentInstance;
    cmp.plan = plan();
    cmp.mode = 'editor';
    renderSpy = vi.spyOn(cmp as unknown as { render: () => void }, 'render').mockImplementation(() => undefined);
  });

  it('pushHistory truncates redo branch and caps at 30', () => {
    cmp.elements = [];
    cmp.tables = [table({ id: 't1', number: 1, type: 'TABLE' })];
    cmp.reserved = [];
    cmp.pushHistory();
    expect(cmp.historyIndex).toBe(0);

    cmp.tables = [table({ id: 't1', number: 1, type: 'TABLE' }), table({ id: 't2', number: 2, type: 'TABLE' })];
    cmp.pushHistory();
    expect(cmp.history.length).toBe(2);

    cmp.undo();
    expect(cmp.historyIndex).toBe(0);
    expect(cmp.tables.map((t) => t.id)).toEqual(['t1']);

    cmp.tables = [table({ id: 't9', number: 9, type: 'TABLE' })];
    cmp.pushHistory();
    expect(cmp.history.length).toBe(2);
    expect(cmp.historyIndex).toBe(1);
    expect(cmp.history[1].tables.map((t) => t.id)).toEqual(['t9']);

    for (let i = 0; i < 40; i++) {
      cmp.tables = [table({ id: `x${i}`, number: i + 1, type: 'TABLE' })];
      cmp.pushHistory();
    }
    expect(cmp.history.length).toBeLessThanOrEqual(30);
    expect(cmp.historyIndex).toBe(cmp.history.length - 1);
  });

  it('redo restores forward snapshot after undo', () => {
    cmp.tables = [table({ id: 'a', number: 1, type: 'TABLE' })];
    cmp.reserved = [];
    cmp.elements = [];
    cmp.pushHistory();
    cmp.tables = [table({ id: 'a', number: 1, type: 'TABLE' }), table({ id: 'b', number: 2, type: 'TABLE' })];
    cmp.pushHistory();
    cmp.undo();
    cmp.redo();
    expect(cmp.tables.map((t) => t.id)).toEqual(['a', 'b']);
    expect(renderSpy).toHaveBeenCalled();
  });

  it('restore migrates legacy RESERVED rows out of tables', () => {
    const snapshot: FloorSnapshot = {
      elements: [],
      tables: [
        table({ id: 't1', number: 1, type: 'TABLE' }),
        table({ id: 'legacy-r', number: 3, type: 'RESERVED' }),
      ],
      reserved: [],
    };
    cmp.restore(snapshot);
    expect(cmp.tables.map((t) => t.id)).toEqual(['t1']);
    expect(cmp.reserved.map((t) => t.id)).toEqual(['legacy-r']);
    expect(cmp.selectedTable).toBeNull();
    expect(cmp.selectedReserved).toBeNull();
  });

  it('canEditGeometry requires ADMIN + editor mode + unlocked plan', () => {
    expect(cmp.canEditGeometry).toBe(true);
    cmp.mode = 'operativo';
    expect(cmp.canEditGeometry).toBe(false);
    cmp.mode = 'editor';
    cmp.plan = plan({ is_locked: true });
    expect(cmp.canEditGeometry).toBe(false);
    cmp.plan = plan({ is_locked: false });
    auth.hasRole.mockReturnValue(false);
    expect(cmp.canEditGeometry).toBe(false);
  });

  it('setTool ignores draw/text when geometry locked for role', () => {
    auth.hasRole.mockReturnValue(false);
    cmp.tool = 'select';
    cmp.setTool('draw');
    expect(cmp.tool).toBe('select');
    cmp.setTool('text');
    expect(cmp.tool).toBe('select');
  });

  it('addTable assigns next free number and preserves existing table ids', () => {
    cmp.tables = [table({ id: 'keep', number: 1, type: 'TABLE' }), table({ id: 'keep2', number: 3, type: 'TABLE' })];
    cmp.reserved = [];
    cmp.elements = [] as FloorPlanElement[];
    cmp.pushHistory();
    cmp.addTable();
    expect(cmp.tables.map((t) => t.id)).toContain('keep');
    expect(cmp.tables.map((t) => t.id)).toContain('keep2');
    const created = cmp.tables.find((t) => t.number === 2);
    expect(created).toBeTruthy();
    expect(created!.type).toBe('TABLE');
    expect(cmp.selectedTable?.id).toBe(created!.id);
  });

  it('saveDesign returns false for non-admin without calling floors', async () => {
    auth.hasRole.mockReturnValue(false);
    await expect(cmp.saveDesign(false)).resolves.toBe(false);
    expect(floors.saveSnapshot).not.toHaveBeenCalled();
  });

  it('saveDesign persists current ids for ADMIN without confirmation dialog', async () => {
    const keep = table({ id: 'keep-id', number: 1, type: 'TABLE' });
    cmp.tables = [keep];
    cmp.reserved = [];
    cmp.elements = [];
    await expect(cmp.saveDesign(false)).resolves.toBe(true);
    expect(floors.saveSnapshot).toHaveBeenCalledWith('plan-1', {
      elements: [],
      tables: [keep],
      reserved: [],
    });
    expect(cmp.showSaveDialog).toBe(false);
  });

  it('openOperationalTarget opens order dialog only in operativo', async () => {
    const target = table({ id: 'op-1', number: 1, type: 'TABLE' });
    cmp.mode = 'editor';
    await cmp.openOperationalTarget(target);
    expect(cmp.showOrderDialog).toBe(false);
    expect(cmp.selectedOrderTarget).toBeNull();

    cmp.mode = 'operativo';
    await cmp.openOperationalTarget(target);
    expect(cmp.selectedOrderTarget?.id).toBe('op-1');
    expect(cmp.showOrderDialog).toBe(true);
    expect(cmp.selectedTable?.id).toBe('op-1');
  });

  it('onOrderDialogClosed clears open state for Workspace contract', () => {
    cmp.showOrderDialog = true;
    cmp.selectedOrderTarget = table({ id: 'x', number: 1, type: 'TABLE' });
    cmp.onOrderDialogClosed();
    expect(cmp.showOrderDialog).toBe(false);
    expect(cmp.selectedOrderTarget).toBeNull();
  });

  it('ngOnDestroy clears order overlay and tears down realtime/stage handles', () => {
    const unsub = vi.fn();
    (cmp as unknown as { realtimeChannel: { unsubscribe: () => void } | null }).realtimeChannel = {
      unsubscribe: unsub,
    };
    cmp.showOrderDialog = true;
    cmp.selectedOrderTarget = table({ id: 'x', number: 1, type: 'TABLE' });
    cmp.ngOnDestroy();
    expect(unsub).toHaveBeenCalled();
    expect(cmp.showOrderDialog).toBe(false);
    expect(cmp.selectedOrderTarget).toBeNull();
  });
});

