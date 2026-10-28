import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

/** Onboarding is ADMIN-only. Staff (RECEPTOR) go straight to the operational workspace. */
export const onboardingAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  if (!auth.session()) return router.createUrlTree(['/login']);
  if (!auth.hasRole('ADMIN')) return router.createUrlTree(['/']);
  return true;
};
