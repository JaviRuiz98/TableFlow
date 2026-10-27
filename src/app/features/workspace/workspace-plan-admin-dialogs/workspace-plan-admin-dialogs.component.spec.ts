import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import type { FloorPlan } from '../../../core/models/models';
import { FloorPlanService, PlanDuplicationService } from '../../floor-plans';
import { WorkspacePlanAdminDialogsComponent } from './workspace-plan-admin-dialogs.component';

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

describe('WorkspacePlanAdminDialogsComponent', () => {
  const floors = {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const duplication = { duplicate: vi.fn() };
  const auth = {
    hasRole: vi.fn().mockReturnValue(true),
    session: vi.fn().mockReturnValue({ user: { id: 'u1' } }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.hasRole.mockReturnValue(true);
    auth.session.mockReturnValue({ user: { id: 'u1' } });
    TestBed.configureTestingModule({
      imports: [WorkspacePlanAdminDialogsComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: FloorPlanService, useValue: floors },
        { provide: PlanDuplicationService, useValue: duplication },
      ],
    });
  });

  function create(): WorkspacePlanAdminDialogsComponent {
    const fixture = TestBed.createComponent(WorkspacePlanAdminDialogsComponent);
    const cmp = fixture.componentInstance;
    cmp.plans = [samplePlan];
    return cmp;
  }

  it('openCreate / reset dialog state', () => {
    const cmp = create();
    cmp.openCreate();
    expect(cmp.createPlanDialog()).toBe(true);
    cmp.newPlanName = 'X';
    cmp.reset();
    expect(cmp.createPlanDialog()).toBe(false);
    expect(cmp.newPlanName).toBe('');
  });

  it('createPlan emits plansUpdated, toast and planCreated', async () => {
    const created = { ...samplePlan, id: 'p2', name: 'Nuevo' };
    floors.create.mockResolvedValue(created);
    const cmp = create();
    const toast = vi.fn();
    const plansUpdated = vi.fn();
    const planCreated = vi.fn();
    cmp.toastMessage.subscribe(toast);
    cmp.plansUpdated.subscribe(plansUpdated);
    cmp.planCreated.subscribe(planCreated);
    cmp.openCreate();
    cmp.newPlanName = 'Nuevo';
    await cmp.createPlan();
    expect(floors.create).toHaveBeenCalled();
    expect(plansUpdated).toHaveBeenCalledWith([samplePlan, created]);
    expect(planCreated).toHaveBeenCalledWith(created);
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('creado'));
    expect(cmp.createPlanDialog()).toBe(false);
  });

  it('askDuplicate / closeCopyDialog', () => {
    const cmp = create();
    cmp.askDuplicate(samplePlan);
    expect(cmp.copyPlanDialog()).toBe(true);
    expect(cmp.copyPlanName).toBe('Sala copia');
    cmp.closeCopyDialog();
    expect(cmp.copyPlanDialog()).toBe(false);
    expect(cmp.planToCopy()).toBeNull();
  });

  it('confirmDuplicate emits plansUpdated', async () => {
    const copy = { ...samplePlan, id: 'p2', name: 'Sala copia' };
    duplication.duplicate.mockResolvedValue(copy);
    const cmp = create();
    const plansUpdated = vi.fn();
    cmp.plansUpdated.subscribe(plansUpdated);
    cmp.askDuplicate(samplePlan);
    await cmp.confirmDuplicate();
    expect(duplication.duplicate).toHaveBeenCalled();
    expect(plansUpdated).toHaveBeenCalled();
    expect(cmp.copyPlanDialog()).toBe(false);
  });

  it('confirmRenamePlan emits updated plans', async () => {
    floors.update.mockResolvedValue(undefined);
    const cmp = create();
    const plansUpdated = vi.fn();
    cmp.plansUpdated.subscribe(plansUpdated);
    cmp.openRename(samplePlan);
    cmp.renamePlanName = 'Sala 2';
    await cmp.confirmRenamePlan();
    expect(floors.update).toHaveBeenCalledWith('p1', { name: 'Sala 2' });
    expect(plansUpdated.mock.calls[0][0][0].name).toBe('Sala 2');
  });

  it('confirmRemovePlan emits filtered plans', async () => {
    floors.remove.mockResolvedValue(undefined);
    const cmp = create();
    const plansUpdated = vi.fn();
    cmp.plansUpdated.subscribe(plansUpdated);
    cmp.askRemove(samplePlan);
    await cmp.confirmRemovePlan();
    expect(floors.remove).toHaveBeenCalledWith('p1');
    expect(plansUpdated).toHaveBeenCalledWith([]);
  });

  it('askDuplicate is no-op for non-admin', () => {
    auth.hasRole.mockReturnValue(false);
    const cmp = create();
    cmp.askDuplicate(samplePlan);
    expect(cmp.copyPlanDialog()).toBe(false);
  });
});
