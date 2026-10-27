import { test, expect } from '@playwright/test';

test('login page renders brand and welcome', async ({ page }) => {
  await page.goto('/#/login');
  await expect(page.getByText('CHOCOLATTE')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible();
});
