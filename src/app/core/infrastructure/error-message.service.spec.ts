import { TestBed } from '@angular/core/testing';
import { ErrorMessageService } from './error-message.service';

describe('ErrorMessageService', () => {
  let service: ErrorMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ErrorMessageService);
  });

  it('is provided in root as a singleton', () => {
    const again = TestBed.inject(ErrorMessageService);
    expect(again).toBe(service);
  });

  it('humanizes invalid login credentials', () => {
    expect(service.humanize(new Error('Invalid login credentials'))).toBe(
      'Usuario o contraseña incorrectos.',
    );
  });

  it('returns fallback for empty input', () => {
    expect(service.humanize('', 'Fallback')).toBe('Fallback');
  });

  it('humanizes duplicate company commercial names', () => {
    expect(service.humanize(new Error('Ya existe una empresa con ese nombre'))).toContain(
      'empresa con ese nombre',
    );
  });
});
