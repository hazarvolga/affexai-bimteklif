import { expect, type Page } from '@playwright/test';
import { E2E_PASSWORD } from './fixture';

/** Logs in through the real form and waits for the post-login route. */
export async function loginThroughForm(page: Page, email: string, landing: RegExp = /^\/(app|admin)/): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(E2E_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toMatch(landing);
}

/** Collects uncaught page errors so each spec can assert a clean console. */
export function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  return errors;
}
