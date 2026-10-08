import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { test } from 'node:test';
import puppeteer, { type LaunchOptions, type Page } from 'puppeteer';
import { QuoteStatus } from '../../types';
import { templates, type PdfData } from './templates';
import { renderPdf } from './renderer';

const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath();
const skip = existsSync(executablePath) ? false : 'Chromium unavailable; set PUPPETEER_EXECUTABLE_PATH for real PDF smoke';

test('Chromium smoke: default launcher produces a PDF without sandbox overrides', { skip }, async () => {
  const pdf = await renderPdf('<p>Quotation</p>');
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
});

function inspectedLaunch(inspect: (page: Page) => Promise<void>) {
  return async (options: LaunchOptions) => {
    const browser = await puppeteer.launch({ ...options, executablePath });
    return new Proxy(browser, {
      get(target, key) {
        if (key === 'newPage') return async () => {
          const page = await target.newPage();
          return new Proxy(page, {
            get(pageTarget, pageKey) {
              if (pageKey === 'pdf') return async (...args: Parameters<Page['pdf']>) => {
                await inspect(pageTarget);
                return pageTarget.pdf(...args);
              };
              const value = Reflect.get(pageTarget, pageKey, pageTarget);
              return typeof value === 'function' ? value.bind(pageTarget) : value;
            },
          });
        };
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };
}

for (const template of templates) {
  test(`Chromium smoke: ${template.id} preserves Turkish text, literal markup and totals`, { skip }, async () => {
    const data: PdfData = {
      company: { name: 'İnşaat' }, client: { name: 'Çağrı' },
      quotation: { quoteNumber: 'Q-1', projectName: 'Ölçüm', date: '08.10.2026', expiryDate: '15.10.2026', currency: 'TRY', status: QuoteStatus.DRAFT, revisionVersion: 1, subtotal: 100, discountTotal: 0, vatTotal: 20, grandTotal: 120 },
      items: [{ description: 'Beton < C30 & C40 <script>window.injected=1</script>', unit: 'm³', quantity: 2, unitPrice: 50, total: 100, discountPercent: 0, vatPercent: 20 }],
      evidenceSummary: { verifiedItemCount: 1, sourceDocumentCount: 1, ruleVersions: ['<img src="file:///etc/passwd">'] },
    };
    const pdf = await renderPdf(template.htmlTemplate(data), { launch: inspectedLaunch(async page => {
      const text = await page.evaluate(() => document.body.innerText);
      assert.ok(text.includes('Çağrı'));
      assert.ok(text.includes(data.items[0].description));
      assert.ok(text.includes(data.evidenceSummary!.ruleVersions[0]));
      assert.ok(text.includes('120 TRY'));
      assert.equal(await page.$('script, img, iframe'), null);
      assert.equal(await page.evaluate(() => (window as unknown as Record<string, unknown>).injected), undefined);
    }) });
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.length > 5000);
  });
}

test('Chromium blocks raw active content, remote resources and local files', { skip }, async () => {
  let requests = 0;
  const server = createServer((_req, res) => { requests += 1; res.end('PRIVATE'); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/private`;
  try {
    const pdf = await renderPdf(`<style>@import url('${url}'); p {background:url('${url}')}</style>
      <script>window.injected=1;fetch('${url}')</script>
      <link rel="stylesheet" href="${url}"><img src="${url}" onerror="window.injected=2">
      <iframe src="${url}"></iframe><iframe src="file:///etc/passwd"></iframe>
      <object data="file:///etc/passwd"></object><p>Safe content</p>`, {
      launch: inspectedLaunch(async page => {
        assert.equal(page.isJavaScriptEnabled(), false);
        assert.equal(await page.evaluate(() => (window as unknown as Record<string, unknown>).injected), undefined);
        assert.equal(await page.evaluate(() => document.images[0].naturalWidth), 0);
        assert.ok(page.frames().every(frame => !/^file:|^https?:/.test(frame.url())));
        assert.ok(!(await page.content()).includes('PRIVATE'));
      }),
    });
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.equal(requests, 0);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
