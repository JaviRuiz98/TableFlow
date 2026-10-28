import { Injectable, computed, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { SupabaseService } from '../../core/infrastructure';
import {
  computeOnboardingProgress,
  emptyOnboardingProgress,
  type OnboardingProgress,
  type OnboardingStepId,
} from './onboarding.progress';

export interface CompanyOnboardingFlags {
  onboarding_plan_done: boolean;
  onboarding_products_done: boolean;
  onboarding_users_done: boolean;
}

/**
 * Onboarding progress is persisted on `companies` flags (default false).
 * Initial setup is active while any flag is still false.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  readonly progress = signal<OnboardingProgress>(emptyOnboardingProgress());
  readonly flags = signal<CompanyOnboardingFlags | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  /** True while at least one company onboarding flag is false. */
  readonly isInitialSetup = computed(() => {
    const flags = this.flags();
    if (!flags) return false;
    return !(flags.onboarding_plan_done && flags.onboarding_products_done && flags.onboarding_users_done);
  });

  private refreshInFlight: Promise<OnboardingProgress> | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly db: SupabaseService,
  ) {}

  async refresh(): Promise<OnboardingProgress> {
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = this.loadProgress();
    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  async markStepDone(step: OnboardingStepId): Promise<void> {
    await this.auth.whenReady();
    const companyId = this.auth.profile()?.company_id;
    if (!companyId) {
      throw new Error('Tu perfil no tiene empresa asociada.');
    }

    const patch: Partial<CompanyOnboardingFlags> =
      step === 'plan'
        ? { onboarding_plan_done: true }
        : step === 'products'
          ? { onboarding_products_done: true }
          : { onboarding_users_done: true };

    const { error } = await this.db.client.from('companies').update(patch).eq('id', companyId);
    if (error) throw error;
    await this.refresh();
  }

  private async loadProgress(): Promise<OnboardingProgress> {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.whenReady();
      const companyId = this.auth.profile()?.company_id;
      if (!companyId) {
        this.flags.set(null);
        const empty = emptyOnboardingProgress();
        this.progress.set(empty);
        return empty;
      }

      const { data, error } = await this.db.client
        .from('companies')
        .select('onboarding_plan_done, onboarding_products_done, onboarding_users_done')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      const flags: CompanyOnboardingFlags = {
        onboarding_plan_done: data?.onboarding_plan_done === true,
        onboarding_products_done: data?.onboarding_products_done === true,
        onboarding_users_done: data?.onboarding_users_done === true,
      };
      this.flags.set(flags);

      const next = computeOnboardingProgress({
        hasPlan: flags.onboarding_plan_done,
        hasProduct: flags.onboarding_products_done,
        hasAdditionalUser: flags.onboarding_users_done,
      });
      this.progress.set(next);
      return next;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar el progreso de configuración';
      this.error.set(message);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      this.loading.set(false);
    }
  }
}
