import { NgStyle } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonInput,
  IonInputPasswordToggle,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import { AuthService } from '../../../core/auth/auth.service';
import { TEMP_SKIP_EMAIL_VERIFICATION } from '../../../core/auth/auth-temp-flags';
import { TABLEFLOW_DEFAULT_BRANDING } from '../../../core/branding';
import { fieldErrorMessage, passwordsMatchValidator } from './registro-empresa.form';

@Component({
  selector: 'app-registro-empresa',
  standalone: true,
  imports: [
    NgStyle,
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonInput,
    IonInputPasswordToggle,
    IonButton,
    IonCheckbox,
    IonText,
    IonSpinner,
  ],
  templateUrl: './registro-empresa.component.html',
  styleUrl: './registro-empresa.component.scss',
})
export class RegistroEmpresaComponent {
  readonly branding = TABLEFLOW_DEFAULT_BRANDING;
  /** TEMP: hide “we will email you” copy while verification is bypassed. */
  readonly skipEmailVerification = TEMP_SKIP_EMAIL_VERIFICATION;
  readonly loading = signal(false);
  readonly formError = signal('');

  readonly form = this.fb.nonNullable.group(
    {
      establishmentName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      adminFullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
      phone: ['', [Validators.required, Validators.minLength(7), Validators.maxLength(30), Validators.pattern(/^[+\d\s().-]{7,30}$/)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
    },
    { validators: passwordsMatchValidator },
  );

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {}

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

  errorFor(
    controlName:
      | 'establishmentName'
      | 'adminFullName'
      | 'phone'
      | 'email'
      | 'password'
      | 'confirmPassword'
      | 'acceptTerms',
  ): string {
    const control = this.form.controls[controlName];
    const mismatch =
      controlName === 'confirmPassword' &&
      this.form.hasError('passwordsMismatch') &&
      (control.touched || control.dirty);
    return fieldErrorMessage(control, mismatch);
  }

  async onSubmit(): Promise<void> {
    this.formError.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    const value = this.form.getRawValue();
    this.loading.set(true);
    try {
      const result = await this.auth.signUpCompany({
        email: value.email,
        password: value.password,
        adminFullName: value.adminFullName,
        establishmentName: value.establishmentName,
        phone: value.phone,
      });

      // TEMP: treat signup as if the user already opened the confirm link.
      // Original: navigate to /registro-empresa/pendiente with email query param.
      if (TEMP_SKIP_EMAIL_VERIFICATION || !result.confirmationRequired) {
        await this.router.navigate(['/registro-empresa/activar']);
      } else {
        await this.router.navigate(['/registro-empresa/pendiente'], {
          queryParams: { email: result.email },
        });
      }
    } catch (e) {
      this.formError.set(e instanceof Error ? e.message : 'No se pudo completar el registro');
    } finally {
      this.loading.set(false);
    }
  }
}
