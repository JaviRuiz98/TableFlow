import { TestBed } from '@angular/core/testing';
import { Router, type UrlTree } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { adminDashboardGuard } from './admin-dashboard.guard';

describe('adminDashboardGuard', () => {
  const createUrlTree = vi.fn((commands: unknown[]) => ({ commands }) as unknown as UrlTree);
  const auth = {
    whenReady: vi.fn().mockResolvedValue(undefined),
    session: vi.fn(),
    hasRole: vi.fn(),
  };
  const onboarding = {
    refresh: vi.fn(),
    isInitialSetup: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: OnboardingService, useValue: onboarding },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });
  });

  it('redirects unauthenticated users to login', async () => {
    auth.session.mockReturnValue(null);
    const result = await TestBed.runInInjectionContext(() => adminDashboardGuard({} as never, {} as never));
    expect(result).toEqual({ commands: ['/login'] });
  });

  it('redirects non-ADMIN to workspace', async () => {
    auth.session.mockReturnValue({});
    auth.hasRole.mockReturnValue(false);
    const result = await TestBed.runInInjectionContext(() => adminDashboardGuard({} as never, {} as never));
    expect(result).toEqual({ commands: ['/'] });
  });

  it('redirects incomplete ADMIN to onboarding', async () => {
    auth.session.mockReturnValue({});
    auth.hasRole.mockReturnValue(true);
    onboarding.isInitialSetup.mockReturnValue(true);
    const result = await TestBed.runInInjectionContext(() => adminDashboardGuard({} as never, {} as never));
    expect(result).toEqual({ commands: ['/onboarding'] });
  });

  it('allows onboarded ADMIN', async () => {
    auth.session.mockReturnValue({});
    auth.hasRole.mockReturnValue(true);
    onboarding.isInitialSetup.mockReturnValue(false);
    const result = await TestBed.runInInjectionContext(() => adminDashboardGuard({} as never, {} as never));
    expect(result).toBe(true);
  });
});
