import { NgStyle } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonInput, IonInputPasswordToggle, IonButton, IonText, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { lockClosedOutline, mailOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { AuthService } from '../../../core/auth/auth.service';
import { TABLEFLOW_DEFAULT_BRANDING } from '../../../core/branding';

/** Public route for company registration UI. */
export const COMPANY_REGISTER_PATH = '/registro-empresa';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [NgStyle, FormsModule, RouterLink, IonContent, IonInput, IonInputPasswordToggle, IonButton, IonText, IonSpinner, IonIcon],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  readonly branding = TABLEFLOW_DEFAULT_BRANDING;
  readonly companyRegisterPath = COMPANY_REGISTER_PATH;

  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {
    addIcons({ lockClosedOutline, mailOutline });
  }

  /** Runtime CSS variables from platform branding (swap config → colors update). */
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

  async submit() {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.signIn(this.username.trim(), this.password);
      await this.router.navigateByUrl('/');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      this.loading.set(false);
    }
  }
}
