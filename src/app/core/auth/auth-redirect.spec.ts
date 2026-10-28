import { vi } from 'vitest';
import {
  AUTH_ACTIVATE_QUERY,
  buildEmailConfirmRedirectUrl,
  extractAuthCallbackParams,
  stripAuthCallbackFromUrl,
} from './auth-redirect';

describe('buildEmailConfirmRedirectUrl', () => {
  it('puts activate flag in search and Angular route in hash', () => {
    expect(
      buildEmailConfirmRedirectUrl({
        origin: 'https://app.tableflow.test',
        pathname: '/',
      }),
    ).toBe(`https://app.tableflow.test/?${AUTH_ACTIVATE_QUERY}=1#/registro-empresa/activar`);
  });

  it('keeps non-root pathname for Capacitor-style bases', () => {
    expect(
      buildEmailConfirmRedirectUrl({
        origin: 'https://localhost',
        pathname: '/app/',
      }),
    ).toBe(`https://localhost/app/?${AUTH_ACTIVATE_QUERY}=1#/registro-empresa/activar`);
  });
});

describe('extractAuthCallbackParams', () => {
  it('reads PKCE code from search with activate intent', () => {
    expect(
      extractAuthCallbackParams(
        `https://app.test/?${AUTH_ACTIVATE_QUERY}=1&code=abc123#/registro-empresa/activar`,
      ),
    ).toEqual({
      code: 'abc123',
      activateIntent: true,
      accessToken: null,
      errorDescription: null,
    });
  });

  it('reads code from hash query (legacy broken form)', () => {
    expect(extractAuthCallbackParams('https://app.test/#/registro-empresa/activar?code=legacy')).toEqual({
      code: 'legacy',
      activateIntent: true,
      accessToken: null,
      errorDescription: null,
    });
  });

  it('detects activate path without code', () => {
    expect(extractAuthCallbackParams('https://app.test/#/registro-empresa/activar')).toEqual({
      code: null,
      activateIntent: true,
      accessToken: null,
      errorDescription: null,
    });
  });
});

describe('stripAuthCallbackFromUrl', () => {
  it('removes auth params and keeps activate hash', () => {
    const replaceState = vi.fn();
    const next = stripAuthCallbackFromUrl(
      `https://app.test/?${AUTH_ACTIVATE_QUERY}=1&code=abc#/registro-empresa/activar`,
      { replaceState },
    );
    expect(next).toBe('/#/registro-empresa/activar');
    expect(replaceState).toHaveBeenCalled();
  });
});
