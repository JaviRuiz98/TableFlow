import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { isSetupIntent, peekSetupIntent, TF_SETUP_QUERY } from './onboarding-setup-intent';
import { OnboardingService } from './onboarding.service';

/**
 * Incomplete ADMIN tenants land on /onboarding instead of Planos.
 * Explicit setup intents (CTA from onboarding) may enter the workspace.
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
    const progress = await onboarding.refresh();
    if (progress.isComplete) return true;
  } catch {
    // If progress cannot be loaded, do not block the operational shell.
    return true;
  }

  return router.createUrlTree(['/onboarding']);
};
