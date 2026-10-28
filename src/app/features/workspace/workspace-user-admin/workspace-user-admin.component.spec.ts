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

  it('openAccess clears password error and opens gate dialog', () => {
    const cmp = create();
    cmp.adminAccessPassword = 'x';
    cmp.userAccessError.set('old');
    cmp.openAccess();
    expect(cmp.userAccessDialog()).toBe(true);
    expect(cmp.adminAccessPassword).toBe('');
    expect(cmp.userAccessError()).toBe('');
  });

  it('openAccess skips password gate when lockRoleToUser (onboarding)', () => {
    const cmp = create();
    cmp.lockRoleToUser = true;
    cmp.openAccess();
    expect(cmp.userAccessDialog()).toBe(false);
    expect(cmp.createUserDialog()).toBe(true);
    expect(cmp.newUserFullName).toBe('');
    expect(cmp.newUserUsername).toBe('');
    expect(cmp.newUserPassword).toBe('');
  });

  it('verifyUserAccess opens create dialog when password ok', async () => {
    userAdmin.verifyAccess.mockResolvedValue(true);
    const cmp = create();
    cmp.openAccess();
    cmp.adminAccessPassword = 'secret';
    await cmp.verifyUserAccess();
    expect(cmp.userAccessDialog()).toBe(false);
    expect(cmp.createUserDialog()).toBe(true);
  });

  it('verifyUserAccess keeps gate open on bad password', async () => {
    userAdmin.verifyAccess.mockResolvedValue(false);
    const cmp = create();
    cmp.openAccess();
    cmp.adminAccessPassword = 'bad';
    await cmp.verifyUserAccess();
    expect(cmp.userAccessDialog()).toBe(true);
    expect(cmp.userAccessError()).toBe('Contraseña incorrecta');
    expect(cmp.createUserDialog()).toBe(false);
  });

  it('createUser validates then emits toast on success', async () => {
    userAdmin.createUser.mockResolvedValue(undefined);
    const cmp = create();
    const toast = vi.fn();
    cmp.toastMessage.subscribe(toast);
    cmp.openAccess();
    cmp.adminAccessPassword = 'admin';
    userAdmin.verifyAccess.mockResolvedValue(true);
    await cmp.verifyUserAccess();
    cmp.newUserFullName = 'Ana';
    cmp.newUserUsername = 'ana.user';
    cmp.newUserPassword = 'Password1';
    cmp.newUserRole = 'USER';
    await cmp.createUser();
    expect(userAdmin.createUser).toHaveBeenCalled();
    expect(cmp.createUserDialog()).toBe(false);
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('ana.user'));
  });

  it('reset closes dialogs and clears form', () => {
    const cmp = create();
    cmp.createUserDialog.set(true);
    cmp.newUserFullName = 'x';
    cmp.reset();
    expect(cmp.createUserDialog()).toBe(false);
    expect(cmp.userAccessDialog()).toBe(false);
    expect(cmp.newUserFullName).toBe('');
  });
});
