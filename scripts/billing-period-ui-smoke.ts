import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';

// Local mock responses only; production data is not accessed.
const vite = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false }, appType: 'spa' });
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
try {
  await vite.listen();
  const address = vite.httpServer!.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluateOnNewDocument(() => localStorage.setItem('bm_authed', '1'));
  let end: string | undefined = '2026-11-01T00:00:00.000Z';
  await page.setRequestInterception(true);
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if (!pathname.startsWith('/api/')) { void request.continue(); return; }
    const reply = (body: unknown) => request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (pathname === '/api/auth/me') { void reply({ user: { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.test', fullName: 'Test', emailVerified: '2026-10-01' }, company: { id: '11111111-1111-4111-8111-111111111111', name: 'Test' }, role: 'owner', accountType: 'workspace' }); return; }
    if (pathname === '/api/billing/usage-stats') { void reply({ plan: 'Pilot', usage: [], totalMonthlyCost: 0, period: { start: '2026-10-01T00:00:00.000Z', end, timezone: 'UTC' } }); return; }
    void reply([]);
  });
  await page.goto(`${base}/app/billing`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.body.innerText.includes('Kullanım dönemi sonu: 01.11.2026 00:00 UTC'));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.match(await page.evaluate(() => document.body.innerText), /aboneliğinizin bitiş tarihi farklı olabilir/i);
  end = undefined;
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.body.innerText.includes('Kullanım dönemi sonu: Bilgi alınamadı'));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  console.log('PASS UTC usage boundary, unavailable end and 390px layout');
} finally {
  await browser?.close();
  await vite.close();
}
