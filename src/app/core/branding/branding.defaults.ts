import type { BrandingConfig } from './branding.types';

/**
 * Default TableFlow platform branding — VIP Premium (opción 4).
 * Swap logos by replacing files under `public/brand/tableflow/` or updating URLs here.
 * Pre-auth screens must always use platform defaults (no tenant resolution).
 */
export const TABLEFLOW_DEFAULT_BRANDING: BrandingConfig = {
  productName: 'TableFlow',
  tagline: 'Gestión inteligente para tu discoteca',
  accessLabel: 'Acceso a TableFlow',
  assets: {
    logoPrimaryUrl: '/brand/tableflow/logo-primary.svg',
    logoCompactUrl: '/brand/tableflow/logo-compact.svg',
    loginBackgroundUrl: '/brand/tableflow/login-background.webp',
  },
  colors: {
    primary: '#D4AF7C',
    secondary: '#3B2A4A',
    surface: '#121218',
    surfaceMuted: '#0B0B0F',
    text: '#F4EFE6',
    textMuted: '#9A948A',
    onPrimary: '#0B0B0F',
    danger: '#E07A7A',
  },
};
