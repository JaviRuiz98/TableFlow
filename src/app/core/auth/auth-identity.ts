/** Dominio técnico interno para Auth (no es email real). Debe coincidir con create-user. */
export const INTERNAL_AUTH_DOMAIN = 'usuarios.tableflow.app';

/** Reserved for company-registration ADMIN (`handle_new_user`). Not creatable via staff UI/Edge. */
export const COMPANY_ADMIN_USERNAME = 'Administrador';

export function normalizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '');
}

export function isReservedUsername(value: string): boolean {
  return normalizeUsername(value) === normalizeUsername(COMPANY_ADMIN_USERNAME);
}

export function isValidUsername(value: string): boolean {
  const normalized = normalizeUsername(value);
  return (
    /^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalized) &&
    !isReservedUsername(normalized)
  );
}

export function usernameToInternalEmail(value: string): string {
  return `${normalizeUsername(value)}@${INTERNAL_AUTH_DOMAIN}`;
}
