import { isValidUsername } from '../../core/auth/auth-identity';
import type { Role } from '../../core/models/models';

export interface NewUserFormState {
  fullName: string;
  username: string;
  password: string;
  role: Role;
  verifiedAdminPassword: string;
}

export function canSubmitNewUserForm(state: NewUserFormState): boolean {
  return (
    !!state.fullName.trim() &&
    isValidUsername(state.username) &&
    state.password.length >= 6 &&
    (state.role === 'ADMIN' || state.role === 'USER') &&
    !!state.verifiedAdminPassword
  );
}

export function validateNewUserForm(state: NewUserFormState): string | null {
  if (!state.fullName.trim()) return 'Introduce el nombre del usuario.';
  if (!state.username.trim()) return 'Introduce un nombre de usuario.';
  if (!isValidUsername(state.username)) {
    return 'El nombre de usuario debe tener entre 3 y 32 caracteres y solo puede contener letras, números, punto, guion o guion bajo.';
  }
  if (!state.password) return 'Introduce una contraseña para el nuevo usuario.';
  if (state.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  if (state.role !== 'ADMIN' && state.role !== 'USER') return 'Selecciona un rol válido.';
  if (!state.verifiedAdminPassword) return 'Vuelve a validar la contraseña de administración.';
  return null;
}
