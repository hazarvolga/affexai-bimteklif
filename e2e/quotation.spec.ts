import { expect, test } from '@playwright/test';
import { E2E_CLIENT_NAME, E2E_OWNER } from './support/fixture';
import { loginThroughForm, trackPageErrors } from './support/session';

const PROJECT = 'E2E Konut Bloğu Kaba İnşaat';

test('owner creates a quotation in the editor, opens it and downloads its PDF', async ({ page }) => {
  const errors = trackPageErrors(page);
  await loginThroughForm(page, E2E_OWNER.email, /^\/app/);
  await page.goto('/app/quotes/new');

  await page.locator('#quote-client').click();
  await page.getByRole('option', { name: E2E_CLIENT_NAME }).click();
  await page.getByLabel('Proje başlığı').fill(PROJECT);

  const description = page.getByPlaceholder('Burada yeni bir iş kalemi oluşturun...').first();
  await description.fill('C30/37 hazır beton');
  const row = page.locator('tr').filter({ has: description });
  const numbers = row.locator('input[type="number"]');
  await numbers.nth(0).fill('10');
  await numbers.nth(1).fill('3000');

  const saved = page.waitForResponse(response => response.url().endsWith('/api/quotations') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /Taslağı Kaydet/ }).click();
  const response = await saved;
  expect(response.status()).toBe(200);
  const { id } = await response.json() as { id: string };
  await expect(page).toHaveURL(new RegExp(`/app/quotes/${id}$`));
  await expect(page.getByText(PROJECT).first()).toBeVisible();
  await expect(page.getByText('C30/37 hazır beton').first()).toBeVisible();

  // Server-side numbers: 10 m² × 3.000 = 30.000 net, KDV %20 → 36.000.
  const stored = await page.request.get(`/api/quotations/${id}`);
  expect(stored.status()).toBe(200);
  const quote = await stored.json() as { projectName: string; subtotal: string | number; grandTotal: string | number };
  expect(quote.projectName).toBe(PROJECT);
  expect(Number(quote.subtotal)).toBe(30_000);
  expect(Number(quote.grandTotal)).toBe(36_000);

  const pdf = await page.request.get(`/api/quotations/${id}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('pdf');
  expect((await pdf.body()).subarray(0, 5).toString('latin1')).toBe('%PDF-');
  expect(errors).toEqual([]);
});
