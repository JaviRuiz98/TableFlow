import { NgStyle } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonInput,
  IonInputPasswordToggle,
  IonText,
} from '@ionic/angular/standalone';
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
  ],
  templateUrl: './registro-empresa.component.html',
  styleUrl: './registro-empresa.component.scss',
})
export class RegistroEmpresaComponent {
  readonly branding = TABLEFLOW_DEFAULT_BRANDING;
  /** Backend registration is not enabled yet — keep CTA visibly disabled. */
  readonly registrationEnabled = false;

  readonly form = this.fb.nonNullable.group(
    {
      establishmentName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      adminFullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
    },
    { validators: passwordsMatchValidator },
  );

  constructor(private fb: FormBuilder) {}

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

  errorFor(controlName: 'establishmentName' | 'adminFullName' | 'email' | 'password' | 'confirmPassword' | 'acceptTerms'): string {
    const control = this.form.controls[controlName];
    const mismatch =
      controlName === 'confirmPassword' &&
      this.form.hasError('passwordsMismatch') &&
      (control.touched || control.dirty);
    return fieldErrorMessage(control, mismatch);
  }

  /** Intentionally no-op until company registration backend is authorized. */
  onSubmit(): void {
    this.form.markAllAsTouched();
  }
}
