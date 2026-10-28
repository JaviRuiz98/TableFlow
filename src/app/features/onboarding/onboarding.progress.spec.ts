import { computeOnboardingProgress } from './onboarding.progress';

describe('computeOnboardingProgress', () => {
  it('marks plan as the only active step for a brand-new company', () => {
    const progress = computeOnboardingProgress({
      hasPlan: false,
      hasProduct: false,
      hasAdditionalUser: false,
    });

    expect(progress.isComplete).toBe(false);
    expect(progress.activeStep).toBe('plan');
    expect(progress.completedCount).toBe(0);
    expect(progress.steps.map((step) => [step.id, step.completed, step.locked, step.active])).toEqual([
      ['plan', false, false, true],
      ['products', false, true, false],
      ['users', false, true, false],
    ]);
  });

  it('unlocks products after the first plan exists', () => {
    const progress = computeOnboardingProgress({
      hasPlan: true,
      hasProduct: false,
      hasAdditionalUser: false,
    });

    expect(progress.activeStep).toBe('products');
    expect(progress.steps[0]).toMatchObject({ completed: true, active: false, locked: false });
    expect(progress.steps[1]).toMatchObject({ completed: false, active: true, locked: false });
    expect(progress.steps[2]).toMatchObject({ completed: false, active: false, locked: true });
  });

  it('unlocks users after plan and products exist', () => {
    const progress = computeOnboardingProgress({
      hasPlan: true,
      hasProduct: true,
      hasAdditionalUser: false,
    });

    expect(progress.activeStep).toBe('users');
    expect(progress.completedCount).toBe(2);
    expect(progress.steps[2]).toMatchObject({ active: true, locked: false, completed: false });
  });

  it('marks onboarding complete when all facts are true', () => {
    const progress = computeOnboardingProgress({
      hasPlan: true,
      hasProduct: true,
      hasAdditionalUser: true,
    });

    expect(progress.isComplete).toBe(true);
    expect(progress.activeStep).toBeNull();
    expect(progress.completedCount).toBe(3);
    expect(progress.steps.every((step) => step.completed && !step.locked && !step.active)).toBe(true);
  });
});
