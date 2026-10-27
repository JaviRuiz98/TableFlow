import { canSubmitNewUserForm, validateNewUserForm } from './workspace-user-form.util';

describe('workspace-user-form.util', () => {
  const valid = {
    fullName: 'Ana',
    username: 'ana.user',
    password: 'secret1',
    role: 'USER' as const,
    verifiedAdminPassword: 'admin',
  };

  it('accepts a valid form', () => {
    expect(validateNewUserForm(valid)).toBeNull();
    expect(canSubmitNewUserForm(valid)).toBe(true);
  });

  it('rejects short passwords and missing admin verification', () => {
    expect(validateNewUserForm({ ...valid, password: '123' })).toContain('6 caracteres');
    expect(canSubmitNewUserForm({ ...valid, verifiedAdminPassword: '' })).toBe(false);
  });

  it('rejects invalid usernames', () => {
    expect(validateNewUserForm({ ...valid, username: 'ab' })).toContain('3 y 32');
  });
});
