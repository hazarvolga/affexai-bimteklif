import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';

// Isolated UI test: every API response is intercepted; no real account or database is touched.
const vite = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false }, appType: 'spa' });
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
try {
  await vite.listen();
  const addr = vite.httpServer!.address();
  assert.ok(addr && typeof addr === 'object');
  const base = `http://127.0.0.1:${addr.port}`;
  browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH });
  const page = await browser.newPage();
  const errors: string[] = [];
  const logoutStatuses: number[] = [];
  let logoutStatus = 503;
  page.on('pageerror', error => errors.push(String(error)));
  await page.evaluateOnNewDocument(() => localStorage.setItem('bm_authed', '1'));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) { void request.continue(); return; }
    const respond = (body: unknown, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/auth/me') {
      void respond({ user: { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.test', fullName: 'Test Admin', isSuperAdmin: true, emailVerified: '2026-10-11' }, company: { id: '11111111-1111-4111-8111-111111111111', name: 'UI fixture' }, role: 'owner', accountType: 'workspace' });
      return;
    }
    if (url.pathname === '/api/auth/logout') { logoutStatuses.push(logoutStatus); void respond(logoutStatus === 200 ? { success: true } : { error: 'unavailable' }, logoutStatus); return; }
    if (url.pathname === '/api/admin/dashboard') { void respond({ totalTenants: 1, statusCounts: { active: 1 }, totalMRR: 0, totalQuotesThisMonth: 0, totalIfcThisMonth: 0, planDistribution: [], queueStats: {} }); return; }
    void respond([]);
  });
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${base}/admin`, { waitUntil: 'networkidle0' });
  const logout = await page.waitForSelector('button ::-p-text(Çıkış Yap)');
  assert.ok(logout);
  await logout.click();
  await page.waitForFunction(() => document.body.innerText.includes('Oturum sunucuda sonlandırılamadı. Lütfen tekrar deneyin.'));
  assert.equal(new URL(page.url()).pathname, '/admin');
  assert.equal(await page.evaluate(() => localStorage.getItem('bm_authed')), '1');
  assert.equal((await page.evaluate(() => document.body.innerText)).includes('Oturum kapatıldı.'), false);
  logoutStatus = 200;
  await logout.click();
  await page.waitForFunction(() => window.location.pathname === '/login');
  assert.equal(await page.evaluate(() => localStorage.getItem('bm_authed')), null);
  assert.deepEqual(logoutStatuses, [503, 200]);
  assert.deepEqual(errors, []);
  console.log('PASS logout 503 retains session and shows error; retry 200 clears session and redirects');
} finally {
  await browser?.close();
  await vite.close();
}
