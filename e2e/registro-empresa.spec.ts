import { test, expect } from '@playwright/test';
import { blockSupabaseMutations } from './helpers/network-safety';

test.describe('Registro empresa (UI only)', () => {
  test.beforeEach(async ({ page }) => {
    await blockSupabaseMutations(page);
  });

  test('login CTA navigates to registro-empresa', async ({ page }) => {
    await page.goto('/#/login');
    await page.locator('ion-button.register-button').click();
    await expect(page).toHaveURL(/#\/registro-empresa/);
    await expect(page.getByRole('heading', { name: 'Registra tu empresa' })).toBeVisible();
  });

  test('registro page shows pending banner and disabled submit', async ({ page }) => {
    await page.goto('/#/registro-empresa');
    await expect(page.getByText('Alta de empresas pendiente de activación')).toBeVisible();
    const submit = page.locator('ion-button.submit-button');
    await expect(submit).toContainText('Crear cuenta de empresa');
    await expect
      .poll(async () => submit.evaluate((el) => (el as HTMLIonButtonElement).disabled))
      .toBe(true);
    await expect(page.getByText('Envío pendiente de activación')).toBeVisible();
  });

  test('legacy register-empresa path redirects', async ({ page }) => {
    await page.goto('/#/register-empresa');
    await expect(page).toHaveURL(/#\/registro-empresa/);
  });

  test('link returns to login without mutating auth', async ({ page }) => {
    await page.goto('/#/registro-empresa');
    await page.getByRole('link', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByLabel('Acceso a TableFlow').getByRole('img', { name: 'TableFlow' })).toBeVisible();
  });
});
