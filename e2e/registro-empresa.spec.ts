import { test, expect } from '@playwright/test';
import { blockSupabaseMutations } from './helpers/network-safety';

test.describe('Registro empresa (UI + navigation)', () => {
  test.beforeEach(async ({ page }) => {
    await blockSupabaseMutations(page);
  });

  test('login CTA navigates to registro-empresa', async ({ page }) => {
    await page.goto('/#/login');
    await page.locator('ion-button.register-button').click();
    await expect(page).toHaveURL(/#\/registro-empresa/);
    await expect(page.getByRole('heading', { name: 'Registra tu empresa' })).toBeVisible();
  });

  test('registro form exposes required fields and enabled submit when valid', async ({ page }) => {
    await page.goto('/#/registro-empresa');
    await expect(page.getByRole('heading', { name: 'Registra tu empresa' })).toBeVisible();
    await expect(page.locator('#establishmentName')).toBeVisible();
    await expect(page.locator('#phone')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    const submit = page.locator('ion-button.submit-button');
    await expect(submit).toContainText('Crear cuenta de empresa');
    await expect
      .poll(async () => submit.evaluate((el) => (el as HTMLIonButtonElement).disabled))
      .toBe(true);

    await page.locator('#establishmentName input').fill('Club E2E');
    await page.locator('#adminFullName input').fill('Admin E2E');
    await page.locator('#phone input').fill('+34 600 111 222');
    await page.locator('#email input').fill('e2e.club@example.com');
    await page.locator('#password input').fill('secreto123');
    await page.locator('#confirmPassword input').fill('secreto123');
    await page.locator('ion-checkbox').click();

    await expect
      .poll(async () => submit.evaluate((el) => (el as HTMLIonButtonElement).disabled))
      .toBe(false);
  });

  test('pending and activar routes render status screens', async ({ page }) => {
    await page.goto('/#/registro-empresa/pendiente?email=demo%40club.test');
    await expect(page.getByRole('heading', { name: /Revisa tu correo/ })).toBeVisible();
    await expect(page.getByText('demo@club.test')).toBeVisible();

    await page.goto('/#/registro-empresa/activar');
    await expect(
      page.getByRole('heading', {
        name: /Confirmando correo|¡Correo electrónico confirmado!|No se pudo confirmar/,
      }),
    ).toBeVisible();
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
