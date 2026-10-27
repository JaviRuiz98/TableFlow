import type { Page } from '@playwright/test';

/**
 * Abort mutating Supabase REST/RPC/Edge traffic during E2E.
 * Read-only GETs may still hit the network if the app is configured;
 * B13 never asserts against production data mutations.
 */
export async function blockSupabaseMutations(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method().toUpperCase();
    const isSupabase =
      url.includes('supabase.co') ||
      url.includes('/rest/v1/') ||
      url.includes('/auth/v1/') ||
      url.includes('/functions/v1/');

    if (!isSupabase) {
      await route.continue();
      return;
    }

    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      // Avoid depending on remote data: fulfill empty-ish safe responses for REST.
      if (url.includes('/rest/v1/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '[]',
        });
        return;
      }
      await route.continue();
      return;
    }

    // POST/PATCH/PUT/DELETE — never mutate remote TableFlow / other projects.
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'B13 E2E blocked remote mutation',
        code: 'tableflow_e2e_mutation_blocked',
      }),
    });
  });
}
