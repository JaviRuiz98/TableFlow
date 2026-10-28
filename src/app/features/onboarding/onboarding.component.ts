import { NgStyle } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  chevronForwardOutline,
  gridOutline,
  logOutOutline,
  peopleOutline,
  wineOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/auth/auth.service';
import { TABLEFLOW_DEFAULT_BRANDING } from '../../core/branding';
import { beginSetupIntent, clearSetupIntent, TF_SETUP_QUERY } from './onboarding-setup-intent';
import {
  computeOnboardingProgress,
  type OnboardingFacts,
  type OnboardingProgress,
  type OnboardingStepId,
} from './onboarding.progress';
import { OnboardingService } from './onboarding.service';

const PREVIEW_FACTS: Record<string, OnboardingFacts> = {
  initial: { hasPlan: false, hasProduct: false, hasAdditionalUser: false },
  'plan-done': { hasPlan: true, hasProduct: false, hasAdditionalUser: false },
  'products-done': { hasPlan: true, hasProduct: true, hasAdditionalUser: false },
  complete: { hasPlan: true, hasProduct: true, hasAdditionalUser: true },
};

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [NgStyle, IonContent, IonButton, IonIcon, IonSpinner],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
})
export class OnboardingComponent implements OnInit, OnDestroy {
  readonly branding = TABLEFLOW_DEFAULT_BRANDING;

  /** Localhost visual QA override via ?preview=initial|plan-done|products-done|complete */
  private readonly previewOverride = signal<OnboardingProgress | null>(null);
  private previewSub: Subscription | null = null;

  readonly viewProgress = computed(() => this.previewOverride() ?? this.onboarding.progress());
  readonly loading = computed(() => !this.previewOverride() && this.onboarding.loading());
  readonly error = computed(() => (this.previewOverride() ? '' : this.onboarding.error()));
  readonly isComplete = computed(() => this.viewProgress().isComplete);
  readonly activeStep = computed(() => this.viewProgress().activeStep);
  readonly completedCount = computed(() => this.viewProgress().completedCount);

  constructor(
    private readonly auth: AuthService,
    private readonly onboarding: OnboardingService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    addIcons({
      checkmarkCircle,
      chevronForwardOutline,
      gridOutline,
      logOutOutline,
      peopleOutline,
      wineOutline,
    });
  }

  brandCssVars(): Record<string, string> {
    const { colors } = this.branding;
    return {
      '--tf-brand-primary': colors.primary,
      '--tf-brand-secondary': colors.secondary,
      '--tf-brand-surface': colors.surface,
      '--tf-brand-surface-muted': colors.surfaceMuted,
      '--tf-brand-text': colors.text,
      '--tf-brand-text-muted': colors.textMuted,
      '--tf-brand-on-primary': colors.onPrimary,
      '--tf-brand-danger': colors.danger,
    };
  }

  stepIcon(id: OnboardingStepId): string {
    if (id === 'plan') return 'grid-outline';
    if (id === 'products') return 'wine-outline';
    return 'people-outline';
  }

  async ngOnInit(): Promise<void> {
    if (this.allowPreview()) {
      this.previewSub = this.route.queryParamMap.subscribe((params) => {
        this.tryApplyPreview(params.get('preview'));
      });
      if (this.previewOverride()) return;
    }

    clearSetupIntent();
    try {
      await this.onboarding.refresh();
    } catch {
      // error signal already set by the service
    }
  }

  ngOnDestroy(): void {
    this.previewSub?.unsubscribe();
  }

  private tryApplyPreview(previewKey: string | null): boolean {
    if (!previewKey || !this.allowPreview() || !(previewKey in PREVIEW_FACTS)) {
      return false;
    }
    this.previewOverride.set(computeOnboardingProgress(PREVIEW_FACTS[previewKey]));
    return true;
  }

  async continueStep(stepId: OnboardingStepId): Promise<void> {
    if (this.previewOverride()) return;
    const step = this.viewProgress().steps.find((item) => item.id === stepId);
    if (!step || step.locked || step.completed) return;

    beginSetupIntent(stepId);
    await this.router.navigate(['/'], {
      queryParams: { [TF_SETUP_QUERY]: stepId },
    });
  }

  async goToWorkspace(): Promise<void> {
    clearSetupIntent();
    await this.router.navigateByUrl('/');
  }

  async goToPlans(): Promise<void> {
    clearSetupIntent();
    await this.router.navigateByUrl('/');
  }

  async logout(): Promise<void> {
    clearSetupIntent();
    try {
      await this.auth.signOut();
    } catch {
      // still leave the protected route
    }
    await this.router.navigateByUrl('/login');
  }

  private allowPreview(): boolean {
    if (typeof location === 'undefined') return false;
    return /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
  }
}
