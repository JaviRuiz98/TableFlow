import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { FloorPlan, FloorSnapshot } from '../../core/models/models';
import { FloorPlanService } from './floor-plan.service';
import { PlanDuplicationService } from './plan-duplication.service';

describe('PlanDuplicationService', () => {
  it('duplicates via load → create → saveSnapshot and copies lock flag', async () => {
    const source: FloorSnapshot = {
      elements: [],
      tables: [],
      reserved: [],
    };
    const original: FloorPlan = {
      id: 'src',
      name: 'Original',
      width: 1800,
      height: 900,
      is_active: false,
      is_locked: true,
      created_by: 'u1',
      created_at: '',
      updated_at: '',
    };
    const created: FloorPlan = {
      ...original,
      id: 'copy',
      name: 'Copia',
      is_locked: false,
    };

    const floors = {
      load: vi.fn().mockResolvedValue(source),
      create: vi.fn().mockResolvedValue({ ...created }),
      saveSnapshot: vi.fn().mockResolvedValue(undefined),
      setLocked: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        PlanDuplicationService,
        { provide: FloorPlanService, useValue: floors },
      ],
    });

    const service = TestBed.inject(PlanDuplicationService);
    const result = await service.duplicate(original, 'u1', 'Copia');

    expect(floors.load).toHaveBeenCalledWith('src');
    expect(floors.create).toHaveBeenCalledWith('Copia', 1800, 900, 'u1');
    expect(floors.saveSnapshot).toHaveBeenCalledWith('copy', expect.any(Object));
    expect(floors.setLocked).toHaveBeenCalledWith('copy', true);
    expect(result.is_locked).toBe(true);
    expect(result.id).toBe('copy');
  });
});
