import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';

const vite = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false }, appType: 'spa' });
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
const clientId = '11111111-1111-4111-8111-111111111111';
try {
  await vite.listen();
  const address = vite.httpServer!.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors: string[] = [];
  let role = 'owner', previewStatus = 200, previewCalls = 0, mutations = 0;
  page.on('pageerror', error => errors.push(String(error)));
  await page.evaluateOnNewDocument(() => localStorage.setItem('bm_authed', '1'));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) { void request.continue(); return; }
    if (request.method() !== 'GET') mutations++;
    const respond = (body: unknown, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/auth/me') { void respond({ user: { id: clientId, email: 'fixture@example.test', fullName: 'Test', emailVerified: '2026-10-11' }, company: { id: clientId, name: 'Test', defaultCurrency: 'TRY' }, role, accountType: 'workspace' }); return; }
    if (url.pathname === `/api/clients/${clientId}`) { void respond({ id: clientId, name: 'Örnek', type: 'company', createdAt: '2026-10-01', pipelineStage: 'lead', deals: [], quotations: [] }); return; }
    if (url.pathname === `/api/clients/${clientId}/deletion-impact`) { previewCalls++; const status = previewStatus; setTimeout(() => void respond({ clientId, counts: { quotations: 3, revisions: 1, deals: 2, activities: 4 }, limitations: [] }, status), 150); return; }
    void respond([]);
  });
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${base}/app/clients/${clientId}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="client-deletion-impact"]');
  const panel = () => page.$('[data-testid="client-deletion-impact"]');
  const trigger = await page.waitForSelector('button ::-p-text(İlişkili kayıtları göster)');
  assert.ok(trigger);
  previewStatus = 403;
  await trigger.click();
  await page.waitForFunction(() => document.querySelector('[data-testid="client-deletion-impact"]')?.textContent?.includes('İlişkili kayıtlar hesaplanıyor'));
  await page.waitForFunction(() => document.querySelector('[data-testid="client-deletion-impact"]')?.textContent?.includes('yetkiniz bulunmuyor'));
  previewStatus = 503;
  await trigger.click();
  await page.waitForFunction(() => document.querySelector('[data-testid="client-deletion-impact"]')?.textContent?.includes('Önizleme yüklenemedi'));
  previewStatus = 200;
  await trigger.click();
  await page.waitForFunction(() => document.querySelector('[data-testid="client-deletion-impact"]')?.textContent?.includes('Fırsat etkinlikleri'));
  const content = await (await panel())!.evaluate(element => element.textContent ?? '');
  assert.match(content, /Teklifler3/); assert.match(content, /Teklif revizyonları1/); assert.match(content, /Fırsatlar2/); assert.match(content, /Fırsat etkinlikleri4/);
  assert.match(content, /Hiçbir veriyi silmez/); assert.match(content, /durumu bilinmiyor/); assert.match(content, /Diğer firmalardaki olası ilişkiler de hesaplanmaz/); assert.match(content, /sayılar tüm bağımlılıkları veya silmenin mümkün olduğunu göstermez/); assert.match(content, /info@bimmetraj\.com/);
  const fits = await (await panel())!.evaluate(element => element.scrollWidth <= element.clientWidth);
  assert.ok(fits, 'preview component fits on a 390px viewport');
  assert.equal(mutations, 0); assert.equal(previewCalls, 3);
  role = 'admin';
  await page.reload({ waitUntil: 'networkidle0' });
  assert.ok(await panel(), 'admin can access the preview control');
  role = 'viewer';
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(await panel(), null, 'viewer must not see preview control');
  role = 'manager';
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(await panel(), null, 'manager must not see preview control');
  assert.equal(previewCalls, 3);
  assert.deepEqual(errors, []);
  console.log('PASS owner preview 403/error/retry, read-only counts, mobile width and viewer/manager hidden');
} finally { await browser?.close(); await vite.close(); }
