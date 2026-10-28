import { CanActivateFn } from '@angular/router';

/** Local visual QA only — never expose preview without auth on real hosts. */
export const onboardingPreviewGuard: CanActivateFn = () => {
  if (typeof location === 'undefined') return false;
  return /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
};
