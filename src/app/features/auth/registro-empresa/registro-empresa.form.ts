import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Payload shape for company registration (Auth signUp + pending activation). */
export interface CompanyRegistrationDraft {
  establishmentName: string;
  adminFullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export const passwordsMatchValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const password = group.get('password')?.value ?? '';
  const confirm = group.get('confirmPassword')?.value ?? '';
  if (!password && !confirm) {
    return null;
  }
  return password === confirm ? null : { passwordsMismatch: true };
};

export function fieldErrorMessage(
  control: AbstractControl | null,
  mismatch = false,
): string {
  if (!control || !(control.touched || control.dirty) || (!control.errors && !mismatch)) {
    return '';
  }
  if (mismatch) {
    return 'Las contraseñas no coinciden.';
  }
  const errors = control.errors ?? {};
  if (errors['required'] || errors['requiredTrue']) {
    return 'Este campo es obligatorio.';
  }
  if (errors['email']) {
    return 'Introduce un correo electrónico válido.';
  }
  if (errors['pattern']) {
    return 'Formato no válido.';
  }
  if (errors['minlength']) {
    return `Mínimo ${errors['minlength'].requiredLength} caracteres.`;
  }
  if (errors['maxlength']) {
    return `Máximo ${errors['maxlength'].requiredLength} caracteres.`;
  }
  return 'Revisa este campo.';
}
