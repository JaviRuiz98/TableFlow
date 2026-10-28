import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ErrorMessageService } from '../../../core/infrastructure';
import { UserAdminService } from '../../users';
import { WorkspaceUserAdminComponent } from './workspace-user-admin.component';

describe('WorkspaceUserAdminComponent', () => {
  const userAdmin = {
    verifyAccess: vi.fn(),
    createUser: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [WorkspaceUserAdminComponent],
      providers: [
        { provide: UserAdminService, useValue: userAdmin },
        { provide: ErrorMessageService, useValue: { humanize: (e: unknown) => String(e) } },
      ],
    });
  });

  function create(): WorkspaceUserAdminComponent {
    return TestBed.createComponent(WorkspaceUserAdminComponent).componentInstance;
  }

  it('openAccess opens create dialog without management-password gate', () => {
    const cmp = create();
    cmp.openAccess();
    expect(cmp.createUserDialog()).toBe(true);
    expect(cmp.newUserFullName).toBe('');
    expect(cmp.newUserUsername).toBe('');
    expect(cmp.newUserPassword).toBe('');
  });

  it('createUser validates then emits toast on success', async () => {
    userAdmin.createUser.mockResolvedValue(undefined);
    const cmp = create();
    const toast = vi.fn();
    cmp.toastMessage.subscribe(toast);
    cmp.openAccess();
    cmp.newUserFullName = 'Ana';
    cmp.newUserUsername = 'ana.user';
    cmp.newUserPassword = 'Password1';
    cmp.newUserRole = 'RECEPTOR';
    await cmp.createUser();
    expect(userAdmin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'Ana',
        username: 'ana.user',
        role: 'RECEPTOR',
      }),
    );
    expect(userAdmin.createUser.mock.calls[0][0].admin_password).toBeUndefined();
    expect(cmp.createUserDialog()).toBe(false);
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('ana.user'));
  });

  it('reset closes dialogs and clears form', () => {
    const cmp = create();
    cmp.createUserDialog.set(true);
    cmp.newUserFullName = 'x';
    cmp.reset();
    expect(cmp.createUserDialog()).toBe(false);
    expect(cmp.newUserFullName).toBe('');
  });
});
