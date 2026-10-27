/** Visual identity for the TableFlow platform (pre-auth). Not tenant-specific. */
export interface BrandAssets {
  /** Primary logo (login hero / brand panel) */
  logoPrimaryUrl: string;
  /** Compact logo (small headers, future chrome) */
  logoCompactUrl: string;
  /** Decorative login background image; null = CSS-only backdrop */
  loginBackgroundUrl: string | null;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  onPrimary: string;
  danger: string;
}

export interface BrandingConfig {
  productName: string;
  tagline: string;
  accessLabel: string;
  assets: BrandAssets;
  colors: BrandColors;
}
