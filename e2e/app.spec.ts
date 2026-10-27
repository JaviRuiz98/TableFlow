import { test, expect } from '@playwright/test';

test('login page renders brand and form', async ({ page }) => {
  await page.goto('/#/login');
  await expect(page.getByRole('img', { name: 'TableFlow' })).toBeVisible();
  await expect(page.getByLabel('Usuario')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page.getByText('¿Tu empresa aún no usa TableFlow?')).toBeVisible();
  await expect(page.locator('ion-button.register-button')).toContainText('Registrar empresa');
});
