import { Injectable, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { FloorPlanService } from '../floor-plans';
import { ProductService } from '../products';
import { UserAdminService } from '../users';
import {
  computeOnboardingProgress,
  emptyOnboardingProgress,
  type OnboardingProgress,
} from './onboarding.progress';

/**
 * Onboarding progress is derived from real tenant data (plans / products / extra users),
 * so it survives logout and never depends on in-memory UI state alone.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  readonly progress = signal<OnboardingProgress>(emptyOnboardingProgress());
  readonly loading = signal(false);
  readonly error = signal('');

  private refreshInFlight: Promise<OnboardingProgress> | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly floors: FloorPlanService,
    private readonly products: ProductService,
    private readonly users: UserAdminService,
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

  private async loadProgress(): Promise<OnboardingProgress> {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.whenReady();
      const profile = this.auth.profile();
      const userId = this.auth.session()?.user?.id;

      const [plans, productList, additionalUsers] = await Promise.all([
        this.floors.list(),
        this.products.products(),
        userId
          ? this.users.countAdditionalCompanyUsers({
              companyId: profile?.company_id ?? null,
              currentUserId: userId,
            })
          : Promise.resolve(0),
      ]);

      const next = computeOnboardingProgress({
        hasPlan: plans.length > 0,
        hasProduct: productList.length > 0,
        hasAdditionalUser: additionalUsers > 0,
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
