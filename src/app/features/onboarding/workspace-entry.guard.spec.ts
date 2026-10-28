import { TestBed } from '@angular/core/testing';
import { Router, type ActivatedRouteSnapshot, type UrlTree } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { beginSetupIntent, clearSetupIntent } from './onboarding-setup-intent';
import { OnboardingService } from './onboarding.service';
import { workspaceEntryGuard } from './workspace-entry.guard';

describe('workspaceEntryGuard', () => {
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
    clearSetupIntent();
    auth.whenReady.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: OnboardingService, useValue: onboarding },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });
  });

  afterEach(() => {
    clearSetupIntent();
  });

  function routeWithQuery(value: string | null): ActivatedRouteSnapshot {
    return {
      queryParamMap: { get: vi.fn().mockReturnValue(value) },
    } as unknown as ActivatedRouteSnapshot;
  }

  it('sends incomplete ADMIN to /onboarding', async () => {
    auth.session.mockReturnValue({});
    auth.hasRole.mockReturnValue(true);
    onboarding.refresh.mockResolvedValue({ isComplete: false });
    onboarding.isInitialSetup.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      workspaceEntryGuard(routeWithQuery(null), {} as never),
    );

    expect(result).toEqual({ commands: ['/onboarding'] });
  });

  it('allows incomplete ADMIN when a setup intent is present', async () => {
    auth.session.mockReturnValue({});
    auth.hasRole.mockReturnValue(true);
    beginSetupIntent('products');

    const result = await TestBed.runInInjectionContext(() =>
      workspaceEntryGuard(routeWithQuery(null), {} as never),
    );

    expect(result).toBe(true);
    expect(onboarding.refresh).not.toHaveBeenCalled();
  });

  it('allows non-ADMIN (RECEPTOR/staff) without checking onboarding progress', async () => {
    auth.session.mockReturnValue({});
    auth.hasRole.mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      workspaceEntryGuard(routeWithQuery(null), {} as never),
    );

    expect(result).toBe(true);
    expect(onboarding.refresh).not.toHaveBeenCalled();
  });
});
