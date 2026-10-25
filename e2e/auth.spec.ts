import { expect, test } from '@playwright/test';
import { E2E_BASE_URL, E2E_OWNER } from './support/fixture';
import { loginThroughForm, trackPageErrors } from './support/session';

// Ported from scripts/e2e-core-flow-smoke.ts steps 1, 2, 5, 6, 7.
test('login form issues an HttpOnly session that survives reload, rejects CSRF and clears on logout', async ({ page, request }) => {
  const errors = trackPageErrors(page);
  await page.goto('/login');
  expect((await page.request.get('/api/quotations')).status()).toBe(401);

  await loginThroughForm(page, E2E_OWNER.email, /^\/app/);
  const exposed = await page.evaluate(() => ({ storage: Object.keys(localStorage).filter(key => /token|session_backup/i.test(key)), cookie: document.cookie }));
  expect(exposed.storage, 'oturum jetonu localStorage içinde olmamalı').toEqual([]);
  expect(exposed.cookie).not.toMatch(/bm_(session|admin)/);

  const cookies = await page.context().cookies(`${E2E_BASE_URL}/api/auth/me`);
  const session = cookies.find(cookie => cookie.name === 'bm_session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe('Strict');
  const me = await page.request.get('/api/auth/me');
  expect(me.status()).toBe(200);
  expect((await me.json() as { user: { email: string } }).user.email).toBe(E2E_OWNER.email);

  await page.reload();
  await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/app/);
  expect((await page.request.get('/api/auth/me')).status()).toBe(200);

  // Cookie-bearing mutation from a foreign origin (non-browser client) is refused.
  const forged = await request.post('/api/clients', {
    headers: { Cookie: `bm_session=${session?.value}`, Origin: 'https://evil.example' },
    data: { name: 'Sahte', type: 'company' },
  });
  expect(forged.status()).toBe(403);
  expect((await forged.json() as { code: string }).code).toBe('CSRF_ORIGIN_MISMATCH');

  // Browser-originated logout (same-origin fetch carries Origin, like the app's own button).
  const logout = await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).then(response => response.status));
  expect(logout).toBe(200);
  expect((await page.request.get('/api/quotations')).status()).toBe(401);
  expect((await page.context().cookies(`${E2E_BASE_URL}/api/auth/me`)).some(cookie => cookie.name === 'bm_session')).toBe(false);
  expect(errors).toEqual([]);
});

// Unknown account, so a failed attempt never counts against the seeded users.
test('rejected credentials stay on the login page without a session', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill('nobody@example.test');
  await page.locator('input[type="password"]').fill('wrong-password-123');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/login/);
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
});
