import { Injectable } from '@angular/core';
import type { FloorPlan, FloorSnapshot } from '../../../core/models/models';
import { FloorPlanService } from '../floor-plan/floor-plan.service';
import { buildDuplicatedSnapshot } from '../floor-plan-snapshot/floor-plan-snapshot.util';

@Injectable({ providedIn: 'root' })
export class PlanDuplicationService {
  constructor(private readonly floors: FloorPlanService) {}

  async duplicate(plan: FloorPlan, userId: string, copyName: string): Promise<FloorPlan> {
    const source = await this.floors.load(plan.id);
    const copy = await this.floors.create(copyName, plan.width, plan.height, userId);
    const clone: FloorSnapshot = buildDuplicatedSnapshot(source, copy.id);
    await this.floors.saveSnapshot(copy.id, clone);
    if (plan.is_locked) {
      await this.floors.setLocked(copy.id, true);
      copy.is_locked = true;
    }
    return copy;
  }
}
