import { test, expect } from '@playwright/test';
import { blockSupabaseMutations } from './helpers/network-safety';

test.describe('Auth shell (E2E, mutations blocked)', () => {
  test.beforeEach(async ({ page }) => {
    await blockSupabaseMutations(page);
  });

  test('unauthenticated root redirects to login', async ({ page }) => {
    await page.goto('/#/');
    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible();
  });

  test('login form exposes usuario and password fields', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page.getByLabel('Usuario')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('login submit with credentials is blocked from mutating remote auth', async ({ page }) => {
    await page.goto('/#/login');
    await page.getByLabel('Usuario').fill('e2e.user');
    await page.getByLabel('Contraseña').fill('not-a-real-password');
    await page.getByRole('button', { name: 'Entrar' }).click();
    // Must remain on login — no successful remote session.
    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible();
  });
});
