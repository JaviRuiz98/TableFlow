import { FormControl, FormGroup } from '@angular/forms';
import { fieldErrorMessage, passwordsMatchValidator } from './registro-empresa.form';

describe('registro-empresa.form', () => {
  it('accepts matching passwords', () => {
    const group = new FormGroup(
      {
        password: new FormControl('secreto123'),
        confirmPassword: new FormControl('secreto123'),
      },
      { validators: passwordsMatchValidator },
    );
    expect(group.valid).toBe(true);
  });

  it('flags mismatched passwords', () => {
    const group = new FormGroup(
      {
        password: new FormControl('secreto123'),
        confirmPassword: new FormControl('otra'),
      },
      { validators: passwordsMatchValidator },
    );
    expect(group.errors).toEqual({ passwordsMismatch: true });
  });

  it('returns accessible required message for touched empty control', () => {
    const control = new FormControl('', { validators: [] });
    control.setErrors({ required: true });
    control.markAsTouched();
    expect(fieldErrorMessage(control)).toBe('Este campo es obligatorio.');
  });
});
