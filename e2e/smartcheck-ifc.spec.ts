import { basename, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { E2E_IFC_SAMPLE, E2E_OWNER } from './support/fixture';
import { loginThroughForm, trackPageErrors } from './support/session';

interface QueueRun { documentId: string; status: string; fileName: string | null; errorCode: string | null }
interface EvidenceRow { reviewStatus: string }

test('SmartCheck uploads the repo IFC sample, the worker processes it and evidence rows reach the UI', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = trackPageErrors(page);
  const fileName = basename(E2E_IFC_SAMPLE);
  await loginThroughForm(page, E2E_OWNER.email, /^\/app/);
  await page.goto('/app/smartcheck');

  await page.locator('input[type="file"][accept*=".ifc"]').setInputFiles(resolve(E2E_IFC_SAMPLE));
  await expect(page.getByText(fileName).first()).toBeVisible();

  const queued = page.waitForResponse(response => /\/api\/smartcheck\/documents\/[^/]+\/process$/.test(response.url()));
  await page.getByRole('button', { name: /IFC Modelini Yükle/ }).click();
  expect((await queued).status()).toBe(202);

  // The in-process Graphile IFC worker consumes the committed job; the UI polls status.
  let run: QueueRun | undefined;
  await expect.poll(async () => {
    const queue = await (await page.request.get('/api/smartcheck/queue')).json() as QueueRun[];
    run = queue.find(entry => entry.fileName === fileName);
    return run?.status;
  }, { timeout: 120_000, intervals: [1_000] }).toMatch(/^(succeeded|failed)$/);
  expect(run?.errorCode ?? null, `IFC işleme başarısız: ${run?.errorCode}`).toBeNull();
  expect(run?.status).toBe('succeeded');

  const rowsResponse = await page.request.get(`/api/smartcheck/documents/${run!.documentId}/rows`);
  expect(rowsResponse.status()).toBe(200);
  const rows = await rowsResponse.json() as EvidenceRow[];
  expect(rows.length).toBeGreaterThan(0);
  // Evidence is review-gated: nothing is auto-approved.
  expect(rows.every(row => row.reviewStatus === 'pending_review')).toBe(true);

  // The UI leaves the upload form for the processed model's icmal sheet.
  await expect(page.getByRole('heading', { name: fileName })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Yeni Dosya Yükle' })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('smartcheck-after-ifc.png'), fullPage: true });
  expect(errors).toEqual([]);
});
