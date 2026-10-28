import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { OnboardingService } from '../onboarding/onboarding.service';

/** ADMIN-only enterprise dashboard. Incomplete onboarding → /onboarding. */
export const adminDashboardGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const onboarding = inject(OnboardingService);

  await auth.whenReady();
  if (!auth.session()) return router.createUrlTree(['/login']);
  if (!auth.hasRole('ADMIN')) return router.createUrlTree(['/']);

  try {
    await onboarding.refresh();
    if (onboarding.isInitialSetup()) {
      return router.createUrlTree(['/onboarding']);
    }
  } catch {
    // Prefer dashboard over blocking if flags cannot load.
  }

  return true;
};
