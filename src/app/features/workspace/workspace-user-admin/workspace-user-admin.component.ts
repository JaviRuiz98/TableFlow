import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonModal,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { normalizeUsername } from '../../../core/auth/auth-identity';
import { ErrorMessageService } from '../../../core/infrastructure';
import type { Role } from '../../../core/models/models';
import { UserAdminService } from '../../users';
import { canSubmitNewUserForm, validateNewUserForm } from './workspace-user-form.util';

/**
 * Owns user-access + create-user dialog state (single owner).
 * Parent only opens via openAccess() and receives toastMessage.
 */
@Component({
  selector: 'app-workspace-user-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonModal,
    IonSelect,
    IonSelectOption,
  ],
  templateUrl: './workspace-user-admin.component.html',
  styleUrl: './workspace-user-admin.component.scss',
})
export class WorkspaceUserAdminComponent {
  /** When true (onboarding step 3), force role USER and hide role picker. */
  @Input() lockRoleToUser = false;

  @Output() toastMessage = new EventEmitter<string>();
  @Output() userCreated = new EventEmitter<void>();

  userAccessDialog = signal(false);
  createUserDialog = signal(false);
  verifyingUserAccess = signal(false);
  creatingUser = signal(false);
  userAccessError = signal('');
  createUserError = signal('');
  /** Starts false so browsers cannot autofill into readonly staff fields. */
  fieldsInteractive = signal(false);
  adminAccessPassword = '';
  newUserFullName = '';
  newUserUsername = '';
  newUserPassword = '';
  newUserRole: Role = 'USER';
  private verifiedAdminPassword = '';
  private unlockTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly userAdmin: UserAdminService,
    private readonly errors: ErrorMessageService,
  ) {}

  get canCreateUser(): boolean {
    return canSubmitNewUserForm(this.newUserFormState());
  }

  /**
   * Public API for shell (ADMIN only — parent must gate the button).
   * Onboarding (`lockRoleToUser`) skips the management-password gate.
   */
  openAccess(): void {
    this.adminAccessPassword = '';
    this.userAccessError.set('');
    if (this.lockRoleToUser) {
      this.verifiedAdminPassword = '';
      this.openCreateUserDialog();
      return;
    }
    this.userAccessDialog.set(true);
  }

  unlockFields(): void {
    this.fieldsInteractive.set(true);
  }

  /** Clears overlays/forms — called from Workspace resetTransientUi / logout. */
  reset(): void {
    this.clearUnlockTimer();
    this.userAccessDialog.set(false);
    this.createUserDialog.set(false);
    this.verifyingUserAccess.set(false);
    this.creatingUser.set(false);
    this.fieldsInteractive.set(false);
    this.userAccessError.set('');
    this.createUserError.set('');
    this.adminAccessPassword = '';
    this.verifiedAdminPassword = '';
    this.resetNewUserForm();
  }

  closeUserAccessDialog(): void {
    this.userAccessDialog.set(false);
    this.adminAccessPassword = '';
    this.userAccessError.set('');
  }

  async verifyUserAccess(): Promise<void> {
    if (!this.adminAccessPassword || this.verifyingUserAccess()) return;
    this.verifyingUserAccess.set(true);
    this.userAccessError.set('');
    try {
      const ok = await this.userAdmin.verifyAccess(this.adminAccessPassword);
      if (!ok) {
        this.userAccessError.set('Contraseña incorrecta');
        return;
      }
      this.verifiedAdminPassword = this.adminAccessPassword;
      this.userAccessDialog.set(false);
      this.adminAccessPassword = '';
      this.openCreateUserDialog();
    } catch (error) {
      this.userAccessError.set(error instanceof Error ? error.message : 'No se pudo verificar la contraseña');
    } finally {
      this.verifyingUserAccess.set(false);
    }
  }

  closeCreateUserDialog(): void {
    this.clearUnlockTimer();
    this.createUserDialog.set(false);
    this.fieldsInteractive.set(false);
    this.verifiedAdminPassword = '';
    this.resetNewUserForm();
  }

  private openCreateUserDialog(): void {
    this.resetNewUserForm();
    this.fieldsInteractive.set(false);
    this.createUserDialog.set(true);
    this.clearUnlockTimer();
    // Unlock after paint so Chrome/Safari cannot inject login autofill into empty fields.
    this.unlockTimer = setTimeout(() => this.fieldsInteractive.set(true), 350);
  }

  private clearUnlockTimer(): void {
    if (this.unlockTimer) {
      clearTimeout(this.unlockTimer);
      this.unlockTimer = null;
    }
  }

  async createUser(): Promise<void> {
    if (this.creatingUser()) return;

    const validationError = validateNewUserForm(this.newUserFormState());
    if (validationError) {
      this.createUserError.set(validationError);
      return;
    }

    this.creatingUser.set(true);
    this.createUserError.set('');
    try {
      await this.userAdmin.createUser({
        full_name: this.newUserFullName.trim(),
        username: normalizeUsername(this.newUserUsername),
        password: this.newUserPassword,
        role: this.lockRoleToUser ? 'USER' : this.newUserRole,
        ...(this.lockRoleToUser ? {} : { admin_password: this.verifiedAdminPassword }),
      });
      const username = normalizeUsername(this.newUserUsername);
      this.closeCreateUserDialog();
      this.toastMessage.emit(`Usuario ${username} creado correctamente`);
      this.userCreated.emit();
    } catch (error) {
      this.createUserError.set(this.errors.humanize(error, 'No se pudo crear el usuario'));
    } finally {
      this.creatingUser.set(false);
    }
  }

  private resetNewUserForm(): void {
    this.newUserFullName = '';
    this.newUserUsername = '';
    this.newUserPassword = '';
    this.newUserRole = 'USER';
    this.createUserError.set('');
  }

  private newUserFormState() {
    return {
      fullName: this.newUserFullName,
      username: this.newUserUsername,
      password: this.newUserPassword,
      role: this.lockRoleToUser ? ('USER' as Role) : this.newUserRole,
      verifiedAdminPassword: this.verifiedAdminPassword,
      requireAdminPassword: !this.lockRoleToUser,
    };
  }
}
