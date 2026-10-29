import { Injectable, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';
import { ErrorMessageService, SupabaseService } from '../infrastructure';
import type { Profile, Role } from '../models/models';
import {
  AUTH_ACTIVATE_QUERY,
  buildEmailConfirmRedirectUrl,
  extractAuthCallbackParams,
  stripAuthCallbackFromUrl,
} from './auth-redirect';
import { TEMP_SKIP_EMAIL_VERIFICATION } from './auth-temp-flags';
import { usernameToInternalEmail } from './auth-identity';

export interface CompanySignUpInput {
  email: string;
  password: string;
  adminFullName: string;
  establishmentName: string;
  phone: string;
}

export interface CompanySignUpResult {
  userId: string;
  email: string;
  /** True when Auth requires email confirmation before a session exists. */
  confirmationRequired: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<Session | null>(null);
  readonly profile = signal<Profile | null>(null);
  readonly ready = signal(false);

  private readonly sessionStartedAtKey = 'tableflow.sessionStartedAt';
  private readonly maxSessionDurationMs = 12 * 60 * 60 * 1000;
  private expiryTimer: number | null = null;
  private callbackRecovery: Promise<void> | null = null;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly errors: ErrorMessageService,
  ) {
    if (!supabase.configured) {
      this.ready.set(true);
      return;
    }

    void this.init();

    supabase.client.auth.onAuthStateChange((event, session) => {
      this.session.set(session);

      if (event === 'SIGNED_OUT' || !session?.user) {
        this.profile.set(null);
        this.clearSessionDeadline();
        return;
      }

      this.ensureSessionStartMarker();
      void this.loadProfile(session.user);
      this.scheduleSessionExpiry();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.enforceSessionDeadline();
    });
    window.addEventListener('focus', () => void this.enforceSessionDeadline());
  }

  private async init(): Promise<void> {
    await this.recoverSessionFromAuthCallback();

    const { data } = await this.supabase.client.auth.getSession();

    if (data.session && this.isSessionExpired()) {
      await this.forceExpiredSignOut();
      this.ready.set(true);
      return;
    }

    // Email-confirm / PKCE recoveries arrive without a prior login marker.
    // Start the absolute 12h window instead of forcing sign-out (legacy unmarked
    // sessions also get a fresh 12h clock — acceptable vs breaking activation).
    if (data.session && !this.getSessionStartedAt()) {
      this.ensureSessionStartMarker();
    }

    this.session.set(data.session);
    if (data.session?.user) {
      await this.loadProfile(data.session.user);
      this.scheduleSessionExpiry();
    }
    this.ready.set(true);
  }

  /**
   * Process `?code=` / leftover callback params after Supabase email confirm.
   * detectSessionInUrl usually handles this; we also exchange manually when the
   * client skipped PKCE because the verifier was missing in another tab/browser.
   */
  private async recoverSessionFromAuthCallback(): Promise<void> {
    if (this.callbackRecovery) {
      await this.callbackRecovery;
      return;
    }

    this.callbackRecovery = this.runAuthCallbackRecovery();
    try {
      await this.callbackRecovery;
    } finally {
      this.callbackRecovery = null;
    }
  }

  private async runAuthCallbackRecovery(): Promise<void> {
    if (typeof window === 'undefined') return;

    const href = window.location.href;
    const params = extractAuthCallbackParams(href);
    const searchHasActivate = new URL(href).searchParams.has(AUTH_ACTIVATE_QUERY);
    const shouldStrip =
      !!params.code || !!params.accessToken || !!params.errorDescription || searchHasActivate;

    if (!params.code && !shouldStrip) {
      return;
    }

    // Let createClient's detectSessionInUrl finish first (may already exchange).
    const initial = await this.supabase.client.auth.getSession();
    if (initial.data.session) {
      if (shouldStrip) stripAuthCallbackFromUrl();
      return;
    }

    if (params.code) {
      const { data, error } = await this.supabase.client.auth.exchangeCodeForSession(params.code);
      if (!error && data.session) {
        this.ensureSessionStartMarker();
        this.session.set(data.session);
        await this.loadProfile(data.session.user);
        this.scheduleSessionExpiry();
      }
      // If exchange fails (typical when opening the mail in another browser
      // without the PKCE verifier), email may still be confirmed — login resume.
    }

    if (shouldStrip) {
      stripAuthCallbackFromUrl();
    }
  }

  private async loadProfile(user: User): Promise<void> {
    const { data } = await this.supabase.client.from('profiles').select('*').eq('id', user.id).maybeSingle();
    this.profile.set(data);
  }

  async signIn(identifier: string, password: string): Promise<void> {
    const cleanIdentifier = identifier.trim();
    const email = cleanIdentifier.includes('@')
      ? cleanIdentifier.toLowerCase()
      : usernameToInternalEmail(cleanIdentifier);

    const { data, error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(this.errors.humanize(error, 'No se pudo iniciar sesión'));

    if (!data.session) {
      throw new Error('Supabase no devolvió una sesión válida');
    }

    localStorage.setItem(this.sessionStartedAtKey, String(Date.now()));
    this.session.set(data.session);
    if (data.session.user) await this.loadProfile(data.session.user);
    this.scheduleSessionExpiry();
  }

  /**
   * Public company registration via Auth signUp.
   * Never sends role/company_id/username. Server handle_new_user creates company + ADMIN
   * (username Administrador) from establishment_name metadata. Login blocked until email confirm.
   */
  async signUpCompany(input: CompanySignUpInput): Promise<CompanySignUpResult> {
    if (!this.supabase.configured) {
      throw new Error('Supabase no está configurado.');
    }

    const email = input.email.trim().toLowerCase();
    const fullName = input.adminFullName.trim();
    const establishmentName = input.establishmentName.trim();
    const phone = input.phone.trim();

    await this.assertCompanyNameAvailable(establishmentName);

    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password: input.password,
      options: {
        // TEMP_SKIP_EMAIL_VERIFICATION: do not ask Auth to send the confirm email.
        // Restore when re-enabling verification (and Confirm email in the dashboard):
        // emailRedirectTo: buildEmailConfirmRedirectUrl(),
        ...(TEMP_SKIP_EMAIL_VERIFICATION
          ? {}
          : { emailRedirectTo: buildEmailConfirmRedirectUrl() }),
        data: {
          full_name: fullName,
          establishment_name: establishmentName,
          phone,
          // Never send role or company_id — server assigns ADMIN only for this path.
        },
      },
    });

    if (error) {
      throw new Error(this.errors.humanize(error, 'No se pudo completar el registro'));
    }

    const user = data.user;
    // With "Confirm email" enabled, Auth may return a fake user (empty identities)
    // instead of an error when the email is already registered.
    if (user && Array.isArray(user.identities) && user.identities.length === 0) {
      throw new Error('Ese correo ya está registrado.');
    }

    const userId = user?.id;
    if (!userId) {
      throw new Error('Supabase no devolvió el usuario registrado.');
    }

    // With Confirm Email enabled, session is null until the user confirms.
    // TEMP: with Confirm email OFF + TEMP_SKIP_EMAIL_VERIFICATION, session should exist.
    const confirmationRequired = TEMP_SKIP_EMAIL_VERIFICATION ? false : !data.session;
    if (data.session) {
      this.ensureSessionStartMarker();
      this.session.set(data.session);
      await this.loadProfile(data.session.user);
      this.scheduleSessionExpiry();
    } else if (TEMP_SKIP_EMAIL_VERIFICATION) {
      // Simulate "clicked email link": establish session with the password just chosen.
      const { data: signedIn, error: signInError } = await this.supabase.client.auth.signInWithPassword({
        email,
        password: input.password,
      });
      if (signInError || !signedIn.session) {
        throw new Error(
          this.errors.humanize(
            signInError,
            'Registro creado, pero no se pudo activar la sesión. Desactiva «Confirm email» en Supabase Auth (temporal).',
          ),
        );
      }
      this.ensureSessionStartMarker();
      this.session.set(signedIn.session);
      await this.loadProfile(signedIn.session.user);
      this.scheduleSessionExpiry();
    }

    return { userId, email, confirmationRequired };
  }

  async resendCompanySignupEmail(email: string): Promise<void> {
    if (!this.supabase.configured) {
      throw new Error('Supabase no está configurado.');
    }

    // TEMP — email resend disabled while skipping verification.
    if (TEMP_SKIP_EMAIL_VERIFICATION) {
      // Original flow (restore when TEMP_SKIP_EMAIL_VERIFICATION is false):
      // const { error } = await this.supabase.client.auth.resend({
      //   type: 'signup',
      //   email: email.trim().toLowerCase(),
      //   options: { emailRedirectTo: buildEmailConfirmRedirectUrl() },
      // });
      // if (error) {
      //   throw new Error(this.errors.humanize(error, 'No se pudo reenviar el correo de verificación'));
      // }
      return;
    }

    const { error } = await this.supabase.client.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: buildEmailConfirmRedirectUrl() },
    });
    if (error) {
      throw new Error(this.errors.humanize(error, 'No se pudo reenviar el correo de verificación'));
    }
  }

  /**
   * Public pre-check for company registration (RPC `is_company_name_available`).
   * Server unique index remains the real enforcement.
   */
  async assertCompanyNameAvailable(name: string): Promise<void> {
    if (!this.supabase.configured) {
      throw new Error('Supabase no está configurado.');
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new Error('Introduce un nombre comercial de al menos 2 caracteres.');
    }

    const { data, error } = await this.supabase.client.rpc('is_company_name_available', {
      p_name: trimmed,
    });

    if (error) {
      // RPC not deployed yet — signup may still fail on unique index after 0026.
      if (this.isMissingCompanyNameRpc(error.message)) {
        return;
      }
      throw new Error(this.errors.humanize(error, 'No se pudo comprobar el nombre comercial'));
    }

    if (data !== true) {
      throw new Error('Ya existe una empresa con ese nombre. Elige otro nombre comercial.');
    }
  }

  async refreshProfile(): Promise<void> {
    const session = this.session();
    if (!session?.user) return;
    await this.loadProfile(session.user);
  }

  private isMissingCompanyNameRpc(message: string): boolean {
    const t = message.toLowerCase();
    return t.includes('could not find the function') || t.includes('is_company_name_available');
  }

  /**
   * Requests Auth email change for the signed-in user.
   * Supabase may require confirmation on the new address before it becomes definitive.
   */
  async updateAccountEmail(email: string): Promise<{ email: string; confirmationRequired: boolean }> {
    if (!this.supabase.configured) {
      throw new Error('Supabase no está configurado.');
    }
    const next = email.trim().toLowerCase();
    if (!next || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) || next.length > 120) {
      throw new Error('Introduce un correo electrónico válido.');
    }
    const current = this.session()?.user?.email?.trim().toLowerCase() ?? '';
    if (next === current) {
      return { email: current, confirmationRequired: false };
    }

    const { data, error } = await this.supabase.client.auth.updateUser({ email: next });
    if (error) {
      throw new Error(this.errors.humanize(error, 'No se pudo actualizar el correo'));
    }

    const { data: sessionData } = await this.supabase.client.auth.getSession();
    if (sessionData.session) {
      this.session.set(sessionData.session);
    }

    const effective =
      sessionData.session?.user?.email?.trim().toLowerCase() ??
      data.user?.email?.trim().toLowerCase() ??
      current;
    const pendingNew =
      typeof (data.user as { new_email?: string } | null)?.new_email === 'string'
        ? String((data.user as { new_email?: string }).new_email).trim().toLowerCase()
        : '';

    return {
      email: effective || current,
      confirmationRequired: !!pendingNew || effective !== next,
    };
  }

  async signOut(): Promise<void> {
    this.clearSessionDeadline();
    const { error } = await this.supabase.client.auth.signOut();
    this.session.set(null);
    this.profile.set(null);
    if (error) throw error;
  }

  private ensureSessionStartMarker(): void {
    if (!this.getSessionStartedAt()) {
      localStorage.setItem(this.sessionStartedAtKey, String(Date.now()));
    }
  }

  private getSessionStartedAt(): number | null {
    const raw = localStorage.getItem(this.sessionStartedAtKey);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private isSessionExpired(): boolean {
    const startedAt = this.getSessionStartedAt();
    if (!startedAt) return false;
    return Date.now() - startedAt >= this.maxSessionDurationMs;
  }

  private scheduleSessionExpiry(): void {
    if (this.expiryTimer !== null) {
      window.clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }

    const startedAt = this.getSessionStartedAt();
    if (!startedAt || !this.session()) return;

    const remaining = this.maxSessionDurationMs - (Date.now() - startedAt);
    if (remaining <= 0) {
      void this.forceExpiredSignOut();
      return;
    }

    this.expiryTimer = window.setTimeout(() => {
      void this.forceExpiredSignOut();
    }, remaining);
  }

  private async enforceSessionDeadline(): Promise<void> {
    if (!this.session()) return;

    if (!this.getSessionStartedAt() || this.isSessionExpired()) {
      await this.forceExpiredSignOut();
      return;
    }

    this.scheduleSessionExpiry();
  }

  private async forceExpiredSignOut(): Promise<void> {
    this.clearSessionDeadline();
    try {
      await this.supabase.client.auth.signOut();
    } finally {
      this.session.set(null);
      this.profile.set(null);
    }
  }

  private clearSessionDeadline(): void {
    localStorage.removeItem(this.sessionStartedAtKey);
    if (this.expiryTimer !== null) {
      window.clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }

  async whenReady(): Promise<void> {
    if (this.ready()) return;
    await new Promise<void>((resolve) => {
      const timer = window.setInterval(() => {
        if (this.ready()) {
          window.clearInterval(timer);
          resolve();
        }
      }, 10);
    });
  }

  hasRole(...roles: Role[]): boolean {
    const role = this.profile()?.role;
    return !!role && roles.includes(role);
  }
}
