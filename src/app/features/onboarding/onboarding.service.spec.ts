import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { FloorPlanService } from '../floor-plans';
import { ProductService } from '../products';
import { UserAdminService } from '../users';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  const auth = {
    whenReady: vi.fn().mockResolvedValue(undefined),
    profile: vi.fn().mockReturnValue({ company_id: 'co-1' }),
    session: vi.fn().mockReturnValue({ user: { id: 'admin-1' } }),
  };
  const floors = { list: vi.fn() };
  const products = { products: vi.fn() };
  const users = { countAdditionalCompanyUsers: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.whenReady.mockResolvedValue(undefined);
    auth.profile.mockReturnValue({ company_id: 'co-1' });
    auth.session.mockReturnValue({ user: { id: 'admin-1' } });

    TestBed.configureTestingModule({
      providers: [
        OnboardingService,
        { provide: AuthService, useValue: auth },
        { provide: FloorPlanService, useValue: floors },
        { provide: ProductService, useValue: products },
        { provide: UserAdminService, useValue: users },
      ],
    });
  });

  it('derives incomplete progress from empty tenant data', async () => {
    floors.list.mockResolvedValue([]);
    products.products.mockResolvedValue([]);
    users.countAdditionalCompanyUsers.mockResolvedValue(0);

    const service = TestBed.inject(OnboardingService);
    const progress = await service.refresh();

    expect(progress.isComplete).toBe(false);
    expect(progress.activeStep).toBe('plan');
    expect(users.countAdditionalCompanyUsers).toHaveBeenCalledWith({
      companyId: 'co-1',
      currentUserId: 'admin-1',
    });
  });

  it('marks complete when plan, product and additional user exist', async () => {
    floors.list.mockResolvedValue([{ id: 'p1' }]);
    products.products.mockResolvedValue([{ id: 'prod1' }]);
    users.countAdditionalCompanyUsers.mockResolvedValue(1);

    const service = TestBed.inject(OnboardingService);
    const progress = await service.refresh();

    expect(progress.isComplete).toBe(true);
    expect(progress.activeStep).toBeNull();
    expect(service.progress().isComplete).toBe(true);
  });
});
