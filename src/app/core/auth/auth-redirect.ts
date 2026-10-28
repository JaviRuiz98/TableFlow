/** Query flag so Supabase can append `?code=` on `location.search` (not inside the Angular hash). */
export const AUTH_ACTIVATE_QUERY = 'tf_activate';

export const COMPANY_ACTIVATE_PATH = '/registro-empresa/activar';

/**
 * Build Auth email-confirm redirect compatible with hash routing + Capacitor.
 *
 * Important: put the activation marker in the *search* string and the Angular
 * route in the hash. If the destination lives only as `/#/ruta`, some Auth
 * redirects place `code` inside the fragment where PKCE detection is unreliable.
 */
export function buildEmailConfirmRedirectUrl(
  locationRef: Pick<Location, 'origin' | 'pathname'> = window.location,
): string {
  const basePath =
    locationRef.pathname && locationRef.pathname !== '/'
      ? locationRef.pathname.replace(/\/$/, '')
      : '';
  return `${locationRef.origin}${basePath}/?${AUTH_ACTIVATE_QUERY}=1#${COMPANY_ACTIVATE_PATH}`;
}

export interface AuthCallbackParams {
  code: string | null;
  activateIntent: boolean;
  accessToken: string | null;
  errorDescription: string | null;
}

/** Extract PKCE / implicit callback params from search and hash-query forms. */
export function extractAuthCallbackParams(href: string): AuthCallbackParams {
  const url = new URL(href);
  let code = url.searchParams.get('code');
  let accessToken = url.searchParams.get('access_token');
  let errorDescription = url.searchParams.get('error_description');
  let activateIntent = url.searchParams.get(AUTH_ACTIVATE_QUERY) === '1';

  const rawHash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  if (rawHash.includes('registro-empresa/activar')) {
    activateIntent = true;
  }

  const hashQueryIndex = rawHash.indexOf('?');
  if (hashQueryIndex >= 0) {
    const hashParams = new URLSearchParams(rawHash.slice(hashQueryIndex + 1));
    code = code ?? hashParams.get('code');
    accessToken = accessToken ?? hashParams.get('access_token');
    errorDescription = errorDescription ?? hashParams.get('error_description');
    if (hashParams.get(AUTH_ACTIVATE_QUERY) === '1') {
      activateIntent = true;
    }
  }

  return { code, activateIntent, accessToken, errorDescription };
}

/**
 * Remove one-time Auth params from the address bar while preserving the Angular hash route.
 */
export function stripAuthCallbackFromUrl(
  href: string = typeof window !== 'undefined' ? window.location.href : 'http://localhost/',
  historyRef: Pick<History, 'replaceState'> = typeof window !== 'undefined' ? window.history : { replaceState() {} },
  activatePath = COMPANY_ACTIVATE_PATH,
): string {
  const url = new URL(href);
  const { activateIntent } = extractAuthCallbackParams(href);

  url.searchParams.delete('code');
  url.searchParams.delete('access_token');
  url.searchParams.delete('refresh_token');
  url.searchParams.delete('expires_in');
  url.searchParams.delete('expires_at');
  url.searchParams.delete('token_type');
  url.searchParams.delete('type');
  url.searchParams.delete('error');
  url.searchParams.delete('error_code');
  url.searchParams.delete('error_description');
  url.searchParams.delete(AUTH_ACTIVATE_QUERY);

  if (activateIntent) {
    url.hash = `#${activatePath.startsWith('/') ? activatePath : `/${activatePath}`}`;
  }

  const next = `${url.pathname}${url.search}${url.hash}`;
  historyRef.replaceState({}, '', next);
  return next;
}
