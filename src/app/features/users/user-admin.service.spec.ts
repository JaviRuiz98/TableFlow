import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ErrorMessageService, SupabaseService } from '../../core/infrastructure';
import { UserAdminService } from './user-admin.service';

describe('UserAdminService', () => {
  let service: UserAdminService;
  let rpcMock: ReturnType<typeof vi.fn>;
  let getSessionMock: ReturnType<typeof vi.fn>;
  let invokeMock: ReturnType<typeof vi.fn>;
  let humanizeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rpcMock = vi.fn();
    getSessionMock = vi.fn();
    invokeMock = vi.fn();
    humanizeMock = vi.fn((value: unknown, fallback: string) =>
      typeof value === 'string' ? value : fallback,
    );

    TestBed.configureTestingModule({
      providers: [
        UserAdminService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              rpc: rpcMock,
              auth: { getSession: getSessionMock },
              functions: { invoke: invokeMock },
            },
          },
        },
        {
          provide: ErrorMessageService,
          useValue: { humanize: humanizeMock },
        },
      ],
    });

    service = TestBed.inject(UserAdminService);
  });

  it('verifyAccess calls user_management secret RPC', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    await expect(service.verifyAccess('secret')).resolves.toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('verify_app_secret', {
      p_key: 'user_management',
      p_secret: 'secret',
    });
  });

  it('verifyAccess returns false when RPC is not true', async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    await expect(service.verifyAccess('bad')).resolves.toBe(false);
  });

  it('createUser invokes create-user with bearer session token', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'tok-123' } },
    });
    invokeMock.mockResolvedValue({ data: { success: true }, error: null });

    const request = {
      full_name: 'Ana',
      username: 'ana',
      password: 'secret12',
      role: 'USER' as const,
      admin_password: 'admin-secret',
    };

    await expect(service.createUser(request)).resolves.toBeUndefined();
    expect(invokeMock).toHaveBeenCalledWith('create-user', {
      body: request,
      headers: { Authorization: 'Bearer tok-123' },
    });
  });

  it('createUser fails when session token is missing', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    await expect(
      service.createUser({
        full_name: 'Ana',
        username: 'ana',
        password: 'secret12',
        role: 'USER',
        admin_password: 'admin-secret',
      }),
    ).rejects.toThrow('La sesión ha caducado. Cierra sesión y vuelve a entrar.');
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('createUser maps authorization-style function errors via humanize', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
    });
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: 'Solo un ADMIN puede crear usuarios.' },
    });
    humanizeMock.mockReturnValue('No tienes permisos para realizar esta operación.');

    await expect(
      service.createUser({
        full_name: 'Ana',
        username: 'ana',
        password: 'secret12',
        role: 'USER',
        admin_password: 'admin-secret',
      }),
    ).rejects.toThrow('No tienes permisos para realizar esta operación.');
  });

  it('createUser rejects payloads without success confirmation', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
    });
    invokeMock.mockResolvedValue({ data: {}, error: null });

    await expect(
      service.createUser({
        full_name: 'Ana',
        username: 'ana',
        password: 'secret12',
        role: 'ADMIN',
        admin_password: 'admin-secret',
      }),
    ).rejects.toThrow('El servidor no confirmó la creación del usuario.');
  });
});
