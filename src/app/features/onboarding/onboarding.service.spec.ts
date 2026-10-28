import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { SupabaseService } from '../../core/infrastructure';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  const auth = {
    whenReady: vi.fn().mockResolvedValue(undefined),
    profile: vi.fn().mockReturnValue({ company_id: 'co-1' }),
    session: vi.fn().mockReturnValue({ user: { id: 'admin-1' } }),
  };
  let fromMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    auth.whenReady.mockResolvedValue(undefined);
    auth.profile.mockReturnValue({ company_id: 'co-1' });
    fromMock = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        OnboardingService,
        { provide: AuthService, useValue: auth },
        {
          provide: SupabaseService,
          useValue: { client: { from: fromMock } },
        },
      ],
    });
  });

  it('derives incomplete progress from company onboarding flags', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        onboarding_plan_done: false,
        onboarding_products_done: false,
        onboarding_users_done: false,
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    fromMock.mockReturnValue({ select });

    const service = TestBed.inject(OnboardingService);
    const progress = await service.refresh();

    expect(progress.isComplete).toBe(false);
    expect(progress.activeStep).toBe('plan');
    expect(service.isInitialSetup()).toBe(true);
    expect(fromMock).toHaveBeenCalledWith('companies');
  });

  it('marks complete when all company flags are true', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        onboarding_plan_done: true,
        onboarding_products_done: true,
        onboarding_users_done: true,
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    fromMock.mockReturnValue({ select });

    const service = TestBed.inject(OnboardingService);
    const progress = await service.refresh();

    expect(progress.isComplete).toBe(true);
    expect(progress.activeStep).toBeNull();
    expect(service.isInitialSetup()).toBe(false);
  });

  it('markStepDone updates the matching company flag', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const single = vi.fn().mockResolvedValue({
      data: {
        onboarding_plan_done: true,
        onboarding_products_done: false,
        onboarding_users_done: false,
      },
      error: null,
    });
    const selectEq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq: selectEq });
    fromMock.mockImplementation((table: string) => {
      if (table === 'companies') {
        return { update, select };
      }
      return {};
    });

    const service = TestBed.inject(OnboardingService);
    await service.markStepDone('plan');

    expect(update).toHaveBeenCalledWith({ onboarding_plan_done: true });
    expect(updateEq).toHaveBeenCalledWith('id', 'co-1');
  });
});
