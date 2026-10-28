import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
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
 * Owns create-user dialog state (single owner).
 * Parent opens via openAccess() and receives toastMessage / userCreated.
 * Caller must be ADMIN (Edge enforces again). No management-password gate —
 * Auth JWT + ADMIN role is sufficient.
 */
@Component({
  selector: 'app-workspace-user-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
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
  /**
   * @deprecated Management-password gate removed; kept for parent bindings.
   */
  @Input() skipAdminPassword = true;

  @Output() toastMessage = new EventEmitter<string>();
  @Output() userCreated = new EventEmitter<void>();

  createUserDialog = signal(false);
  creatingUser = signal(false);
  createUserError = signal('');
  /** Starts false so browsers cannot autofill into readonly staff fields. */
  fieldsInteractive = signal(false);
  newUserFullName = '';
  newUserUsername = '';
  newUserPassword = '';
  newUserRole: Role = 'RECEPTOR';
  readonly roleSelectOptions = {
    cssClass: 'tf-role-select-popover',
  };
  private unlockTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly userAdmin: UserAdminService,
    private readonly errors: ErrorMessageService,
  ) {}

  get canCreateUser(): boolean {
    return canSubmitNewUserForm(this.newUserFormState());
  }

  /** Public API for shell (ADMIN only — parent must gate the button). */
  openAccess(): void {
    this.openCreateUserDialog();
  }

  unlockFields(): void {
    this.fieldsInteractive.set(true);
  }

  /** Clears overlays/forms — called from Workspace resetTransientUi / logout. */
  reset(): void {
    this.clearUnlockTimer();
    this.createUserDialog.set(false);
    this.creatingUser.set(false);
    this.fieldsInteractive.set(false);
    this.createUserError.set('');
    this.resetNewUserForm();
  }

  closeCreateUserDialog(): void {
    this.clearUnlockTimer();
    this.createUserDialog.set(false);
    this.fieldsInteractive.set(false);
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
        role: this.newUserRole,
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
    this.newUserRole = 'RECEPTOR';
    this.createUserError.set('');
  }

  private newUserFormState() {
    return {
      fullName: this.newUserFullName,
      username: this.newUserUsername,
      password: this.newUserPassword,
      role: this.newUserRole,
      verifiedAdminPassword: '',
      requireAdminPassword: false,
    };
  }
}
