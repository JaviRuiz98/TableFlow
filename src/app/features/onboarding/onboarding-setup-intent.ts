import type { OnboardingStepId } from './onboarding.progress';

/** Query param used when entering workspace from an onboarding CTA. */
export const TF_SETUP_QUERY = 'tf_setup';

const STORAGE_KEY = 'tableflow.setupIntent';

const VALID: ReadonlySet<string> = new Set(['plan', 'products', 'users']);

export function isSetupIntent(value: string | null | undefined): value is OnboardingStepId {
  return !!value && VALID.has(value);
}

export function beginSetupIntent(intent: OnboardingStepId): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, intent);
}

export function peekSetupIntent(): OnboardingStepId | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return isSetupIntent(raw) ? raw : null;
}

export function clearSetupIntent(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Prefer explicit query, then session; keep session so in-workspace navigation retains context. */
export function resolveSetupIntent(queryValue: string | null): OnboardingStepId | null {
  if (isSetupIntent(queryValue)) {
    beginSetupIntent(queryValue);
    return queryValue;
  }
  return peekSetupIntent();
}
