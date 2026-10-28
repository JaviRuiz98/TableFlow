import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { isSetupIntent, peekSetupIntent, TF_SETUP_QUERY } from './onboarding-setup-intent';
import { OnboardingService } from './onboarding.service';

/**
 * Post-login workspace (/ and /sala):
 * - USER / RECEPTOR → workspace
 * - ADMIN + setup intent → workspace (onboarding steps)
 * - ADMIN + incomplete onboarding → /onboarding
 * - ADMIN onboarded on `/` → /admin dashboard
 * - ADMIN onboarded on `/sala` → workspace (gestión de sala)
 */
export const workspaceEntryGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const onboarding = inject(OnboardingService);

  await auth.whenReady();
  if (!auth.session()) return router.createUrlTree(['/login']);
  if (!auth.hasRole('ADMIN')) return true;

  const queryIntent = route.queryParamMap.get(TF_SETUP_QUERY);
  if (isSetupIntent(queryIntent) || peekSetupIntent()) {
    return true;
  }

  try {
    await onboarding.refresh();
    if (onboarding.isInitialSetup()) {
      return router.createUrlTree(['/onboarding']);
    }
  } catch {
    // If progress cannot be loaded, do not block operational entry.
  }

  const path = route.routeConfig?.path ?? '';
  if (path === 'sala') {
    return true;
  }

  // Default home for onboarded ADMIN is the enterprise dashboard.
  return router.createUrlTree(['/admin']);
};
