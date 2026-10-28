import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ErrorMessageService, SupabaseService } from '../infrastructure';
import { AuthService } from './auth.service';
import { fixtureProfileAdmin, fixtureProfileReceptor, fixtureProfileUser } from '../../../testing/fixtures';
import { createQueryBuilder } from '../../../testing/supabase-query-mock';

describe('AuthService (integration with mocked Supabase)', () => {
  let getSession: ReturnType<typeof vi.fn>;
  let signInWithPassword: ReturnType<typeof vi.fn>;
  let signUp: ReturnType<typeof vi.fn>;
  let signOut: ReturnType<typeof vi.fn>;
  let exchangeCodeForSession: ReturnType<typeof vi.fn>;
  let onAuthStateChange: ReturnType<typeof vi.fn>;
  let fromMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    getSession = vi.fn().mockResolvedValue({ data: { session: null } });
    signInWithPassword = vi.fn();
    signUp = vi.fn();
    signOut = vi.fn().mockResolvedValue({ error: null });
    exchangeCodeForSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
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
                signUp,
                signOut,
                exchangeCodeForSession,
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

  it('hasRole RECEPTOR only when profile is RECEPTOR', async () => {
    const session = {
      access_token: 'tok',
      user: { id: fixtureProfileReceptor.id },
    };
    signInWithPassword.mockResolvedValue({ data: { session }, error: null });
    fromMock.mockReturnValue(createQueryBuilder({ data: fixtureProfileReceptor, error: null }));

    const service = await readyService();
    await service.signIn('staff', 'secret');
    expect(service.hasRole('RECEPTOR')).toBe(true);
    expect(service.hasRole('ADMIN')).toBe(false);
    expect(service.hasRole('USER')).toBe(false);
  });

  it('hasRole USER only when profile is USER', async () => {
    const session = {
      access_token: 'tok',
      user: { id: fixtureProfileUser.id },
    };
    signInWithPassword.mockResolvedValue({ data: { session }, error: null });
    fromMock.mockReturnValue(createQueryBuilder({ data: fixtureProfileUser, error: null }));

    const service = await readyService();
    await service.signIn('manager', 'secret');
    expect(service.hasRole('USER')).toBe(true);
    expect(service.hasRole('RECEPTOR')).toBe(false);
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

  it('signUpCompany sends metadata without role and does not mark session when confirmation is required', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u-new' }, session: null },
      error: null,
    });
    const service = await readyService();
    const result = await service.signUpCompany({
      email: 'boss@club.test',
      password: 'secreto123',
      adminFullName: 'Boss Club',
      establishmentName: 'Club Test',
      phone: '+34 600 000 000',
    });

    expect(result).toEqual({
      userId: 'u-new',
      email: 'boss@club.test',
      confirmationRequired: true,
    });
    expect(localStorage.getItem('tableflow.sessionStartedAt')).toBeNull();
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'boss@club.test',
        options: expect.objectContaining({
          data: expect.objectContaining({
            full_name: 'Boss Club',
            establishment_name: 'Club Test',
            phone: '+34 600 000 000',
          }),
        }),
      }),
    );
    const meta = signUp.mock.calls[0][0].options.data as Record<string, unknown>;
    expect(meta['role']).toBeUndefined();
  });
});
