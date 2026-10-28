import {
  COMPANY_ADMIN_USERNAME,
  isReservedUsername,
  isValidUsername,
  normalizeUsername,
} from './auth-identity';

describe('auth-identity', () => {
  it('normalizes usernames to lowercase ascii', () => {
    expect(normalizeUsername('  Ana.User  ')).toBe('ana.user');
    expect(normalizeUsername(COMPANY_ADMIN_USERNAME)).toBe('administrador');
  });

  it('reserves Administrador for company registration', () => {
    expect(isReservedUsername('Administrador')).toBe(true);
    expect(isReservedUsername('administrador')).toBe(true);
    expect(isValidUsername('Administrador')).toBe(false);
    expect(isValidUsername('ana.user')).toBe(true);
  });
});
