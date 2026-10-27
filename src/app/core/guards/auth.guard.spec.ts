import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const whenReady = vi.fn().mockResolvedValue(undefined);
  const session = vi.fn();
  const createUrlTree = vi.fn((commands: unknown[]) => ({ commands }) as unknown as UrlTree);

  beforeEach(() => {
    vi.clearAllMocks();
    whenReady.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { whenReady, session } },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });
  });

  it('allows activation when session exists', async () => {
    session.mockReturnValue({ access_token: 't' });
    const result = await TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(whenReady).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('redirects to /login when session is missing', async () => {
    session.mockReturnValue(null);
    const result = await TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toEqual({ commands: ['/login'] });
  });
});
