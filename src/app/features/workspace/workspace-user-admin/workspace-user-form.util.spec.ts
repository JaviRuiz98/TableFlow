import { canSubmitNewUserForm, validateNewUserForm } from './workspace-user-form.util';

describe('workspace-user-form.util', () => {
  const valid = {
    fullName: 'Ana',
    username: 'ana.user',
    password: 'secret1',
    role: 'RECEPTOR' as const,
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

  it('allows empty admin password when requireAdminPassword is false (onboarding)', () => {
    const onboarding = { ...valid, verifiedAdminPassword: '', requireAdminPassword: false };
    expect(validateNewUserForm(onboarding)).toBeNull();
    expect(canSubmitNewUserForm(onboarding)).toBe(true);
  });

  it('rejects invalid usernames', () => {
    expect(validateNewUserForm({ ...valid, username: 'ab' })).toContain('3 y 32');
  });
});
