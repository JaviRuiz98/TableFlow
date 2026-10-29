/**
 * TEMP — bypass email verification while Resend has no verified domain.
 *
 * When true:
 * - signUp does not pass emailRedirectTo (commented in AuthService)
 * - UI skips /registro-empresa/pendiente and goes to /activar (as if the link was opened)
 * - resend is a no-op
 *
 * REQUIRED in Supabase Dashboard (Authentication → Providers → Email):
 * turn OFF "Confirm email". Otherwise Auth still calls SMTP and signup returns 500.
 *
 * Set back to false and restore the commented blocks before production email.
 */
export const TEMP_SKIP_EMAIL_VERIFICATION = true;
