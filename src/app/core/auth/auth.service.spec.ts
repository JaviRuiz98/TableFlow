import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ErrorMessageService, SupabaseService } from '../infrastructure';
import { AuthService } from './auth.service';
import { fixtureProfileAdmin, fixtureProfileUser } from '../../../testing/fixtures';
import { createQueryBuilder } from '../../../testing/supabase-query-mock';

describe('AuthService (integration with mocked Supabase)', () => {
  let getSession: ReturnType<typeof vi.fn>;
  let signInWithPassword: ReturnType<typeof vi.fn>;
  let signOut: ReturnType<typeof vi.fn>;
  let onAuthStateChange: ReturnType<typeof vi.fn>;
  let fromMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    getSession = vi.fn().mockResolvedValue({ data: { session: null } });
    signInWithPassword = vi.fn();
    signOut = vi.fn().mockResolvedValue({ error: null });
    onAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    fromMock = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: {
            configured: true,
            client: {
              auth: {
                getSession,
                signInWithPassword,
                signOut,
                onAuthStateChange,
              },
              from: fromMock,
            },
          },
        },
        {
          provide: ErrorMessageService,
          useValue: {
            humanize: (_e: unknown, fallback: string) => fallback,
          },
        },
      ],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  async function readyService(): Promise<AuthService> {
    const service = TestBed.inject(AuthService);
    await service.whenReady();
    return service;
  }

  it('becomes ready with null session when getSession returns empty', async () => {
    const service = await readyService();
    expect(service.ready()).toBe(true);
    expect(service.session()).toBeNull();
    expect(service.profile()).toBeNull();
  });

  it('signIn stores session start, loads ADMIN profile, hasRole ADMIN', async () => {
    const session = {
      access_token: 'tok',
      user: { id: fixtureProfileAdmin.id },
    };
    signInWithPassword.mockResolvedValue({ data: { session }, error: null });
    fromMock.mockReturnValue(createQueryBuilder({ data: fixtureProfileAdmin, error: null }));

    const service = await readyService();
    await service.signIn('admin', 'secret');

    expect(signInWithPassword).toHaveBeenCalled();
    expect(service.session()?.access_token).toBe('tok');
    expect(service.profile()?.role).toBe('ADMIN');
    expect(service.hasRole('ADMIN')).toBe(true);
    expect(service.hasRole('USER')).toBe(false);
    expect(localStorage.getItem('tableflow.sessionStartedAt')).toBeTruthy();
  });

  it('hasRole USER only when profile is USER', async () => {
    const session = {
      access_token: 'tok',
      user: { id: fixtureProfileUser.id },
    };
    signInWithPassword.mockResolvedValue({ data: { session }, error: null });
    fromMock.mockReturnValue(createQueryBuilder({ data: fixtureProfileUser, error: null }));

    const service = await readyService();
    await service.signIn('staff', 'secret');
    expect(service.hasRole('USER')).toBe(true);
    expect(service.hasRole('ADMIN')).toBe(false);
  });

  it('signOut clears session, profile and local start marker', async () => {
    const session = {
      access_token: 'tok',
      user: { id: fixtureProfileAdmin.id },
    };
    signInWithPassword.mockResolvedValue({ data: { session }, error: null });
    fromMock.mockReturnValue(createQueryBuilder({ data: fixtureProfileAdmin, error: null }));

    const service = await readyService();
    await service.signIn('admin', 'secret');
    await service.signOut();

    expect(signOut).toHaveBeenCalled();
    expect(service.session()).toBeNull();
    expect(service.profile()).toBeNull();
    expect(localStorage.getItem('tableflow.sessionStartedAt')).toBeNull();
  });

  it('signIn surfaces humanized error without remote side effects beyond auth call', async () => {
    signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: 'bad' } });
    const service = await readyService();
    await expect(service.signIn('x', 'y')).rejects.toThrow('No se pudo iniciar sesión');
  });
});
