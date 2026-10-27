import { defineConfig } from '@playwright/test';

/**
 * Smoke E2E against local `ng serve` (hash routing, base `/`).
 * Legacy `/discoteca/` paths removed in B12 — angular.json has no baseHref.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  webServer: {
    command: 'npm start -- --host 127.0.0.1 --port 4200',
    url: 'http://127.0.0.1:4200/',
    reuseExistingServer: true,
    timeout: 180_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4200/',
    trace: 'on-first-retry',
  },
});
