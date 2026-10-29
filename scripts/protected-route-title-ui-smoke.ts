import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';

// Synthetic API responses ensure this smoke does not alter real accounts or data.
const vite = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false }, appType: 'spa' });
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
try {
  await vite.listen();
  const address = vite.httpServer!.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => localStorage.setItem('bm_authed', '1'));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (!path.startsWith('/api/')) { void request.continue(); return; }
    const body = path === '/api/auth/me'
      ? { user: { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.test', fullName: 'Test Admin', isSuperAdmin: true, emailVerified: '2026-10-11' }, company: { id: '11111111-1111-4111-8111-111111111111', name: 'UI fixture' }, role: 'owner', accountType: 'workspace' }
      : path === '/api/admin/dashboard' ? { totalTenants: 0, statusCounts: {}, totalMRR: 0, totalQuotesThisMonth: 0, totalIfcThisMonth: 0, planDistribution: [], queueStats: {} } : [];
    void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const expectTitle = async (title: string) => { try { await page.waitForFunction(expected => document.title === expected, { timeout: 5000 }, title); } catch { throw new Error(`Expected ${title}, got ${await page.title()} at ${page.url()}, body ${String(await page.evaluate(() => document.body.innerText)).slice(0,300)}`); } };
  await page.goto(`${base}/admin`, { waitUntil: 'networkidle0' });
  await expectTitle('Yönetim Paneli — BIMMetraj');
  await page.click('a[href="/admin/tenants"]');
  await expectTitle('Firmalar — BIMMetraj');
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => { history.pushState({}, '', '/app/quotes/new'); dispatchEvent(new PopStateEvent('popstate')); });
  await expectTitle('Yeni Teklif — BIMMetraj');
  await page.evaluate(() => { history.pushState({}, '', '/forgot-password'); dispatchEvent(new PopStateEvent('popstate')); });
  await page.waitForFunction(() => location.pathname === '/forgot-password' && document.title === 'BIMMetraj');
  await page.evaluate(() => { history.pushState({}, '', '/app/quotes/new'); dispatchEvent(new PopStateEvent('popstate')); });
  await expectTitle('Yeni Teklif — BIMMetraj');
  await page.evaluate(() => { history.pushState({}, '', '/admin/not-a-page'); dispatchEvent(new PopStateEvent('popstate')); });
  await expectTitle('Sayfa Bulunamadı (404) | BIMMetraj');
  await page.evaluate(() => { history.pushState({}, '', '/login'); dispatchEvent(new PopStateEvent('popstate')); });
  await page.waitForSelector('input');
  await page.waitForFunction(() => document.title.includes('Giriş Yap'));
  assert.equal(await page.$eval('link[rel="canonical"]', (node: HTMLLinkElement) => new URL(node.href).pathname), '/login');
  console.log('PASS protected SPA titles, 404 fallback and public login metadata at 390px');
} finally {
  await browser?.close();
  await vite.close();
}
