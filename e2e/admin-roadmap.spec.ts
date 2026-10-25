import { expect, test } from '@playwright/test';
import { ROADMAP_META, ROADMAP_SECTIONS } from '../src/pages/admin/roadmap/roadmap-content';
import { E2E_ADMIN, E2E_OWNER } from './support/fixture';
import { loginThroughForm, trackPageErrors } from './support/session';

test('super admin reads the developer roadmap and opens the calculation methods page', async ({ page }) => {
  const errors = trackPageErrors(page);
  await loginThroughForm(page, E2E_ADMIN.email);
  await page.goto('/admin/roadmap');

  await expect(page.getByRole('heading', { level: 1, name: 'Geliştirici Yol Haritası' })).toBeVisible();
  await expect(page.getByText(ROADMAP_META.title, { exact: true })).toBeVisible();
  for (const section of [ROADMAP_SECTIONS[0], ROADMAP_SECTIONS.at(-1)!]) {
    await expect(page.getByRole('heading', { name: section.title }).first()).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Kaynaklar' })).toBeVisible();

  await page.getByRole('button', { name: /Hesaplama Yöntemleri/ }).click();
  await expect(page).toHaveURL(/\/admin\/roadmap\/calculations$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('tenant owner without super-admin rights is kept out of the admin roadmap', async ({ page }) => {
  await loginThroughForm(page, E2E_OWNER.email, /^\/app/);
  await page.goto('/admin/roadmap');
  await expect(page).not.toHaveURL(/\/admin\/roadmap/);
  await expect(page.getByRole('heading', { name: 'Geliştirici Yol Haritası' })).toHaveCount(0);
  expect((await page.request.get('/api/admin/dashboard')).status()).toBe(403);
});
