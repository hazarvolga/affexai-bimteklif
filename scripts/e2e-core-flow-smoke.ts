/**
 * Uçtan uca çekirdek akış smoke testi (Denetim P1-10): gerçek sunucu + Vite + gerçek tarayıcı.
 *
 *   giriş formu -> HttpOnly çerez oturumu -> müşteri + teklif oluşturma -> PDF üretimi
 *   -> yenilemeden sonra oturum sürer -> çıkış çerezi siler -> CSRF ve anonim erişim reddedilir
 *
 * İzole PostgreSQL şeması kullanır (paylaşılan veritabanını reddeder). Kullanım:
 *   PUPPETEER_EXECUTABLE_PATH=<chrome> pnpm exec tsx scripts/e2e-core-flow-smoke.ts
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
import { createServer as createViteServer } from 'vite';
import { createTestIsolation } from '../src/server/routes/test-isolation';

dotenv.config({ path: '.env.local', quiet: true });
const isolation = await createTestIsolation(process.env.DATABASE_URL!);
Object.assign(process.env, {
  DATABASE_URL: isolation.databaseUrl,
  GRAPHILE_WORKER_SCHEMA: isolation.workerSchema,
  SMARTCHECK_LOCAL_STORAGE_DIR: isolation.storageDir,
  AUTH_EMAIL_WEBHOOK_URL: '',
  NODE_ENV: 'test',
});
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
let server: ReturnType<typeof createServer> | undefined;
let vite: Awaited<ReturnType<typeof createViteServer>> | undefined;
let database: typeof import('../src/db').db | undefined;
const output = '/tmp/bimmetraj-e2e';
try {
  const [{ createApiApp }, { db }, schema, { AuthService }] = await Promise.all([
    import('../src/server/app'), import('../src/db'), import('../src/db/schema'),
    import('../src/services/auth/authService'),
  ]);
  database = db;
  const password = 'E2e-fixture-pass-123';
  const [company] = await db.insert(schema.companies).values({ name: 'E2E Taahhüt A.Ş.' }).returning();
  const [owner] = await db.insert(schema.users).values({
    email: 'e2e-owner@example.test', fullName: 'E2E Owner', emailVerified: new Date(), passwordHash: await AuthService.hashPassword(password),
  }).returning();
  await db.insert(schema.memberships).values({ userId: owner.id, companyId: company.id, role: 'owner' });
  const [plan] = await db.insert(schema.plans).values({ name: 'E2E Plan', monthlyQuoteLimit: 20, monthlyPrice: 100, monthlyPdfLimit: 20 }).returning();
  await db.insert(schema.subscriptions).values({ companyId: company.id, planId: plan.id, currentPeriodStart: new Date('2020-01-01') });

  const app = createApiApp();
  vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' });
  app.use(vite.middlewares);
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  process.env.PUBLIC_APP_URL = base;
  await mkdir(output, { recursive: true });

  browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  const api = <T>(path: string, init: { method?: string; body?: unknown } = {}) => page.evaluate(async (p, i) => {
    const response = await fetch(p, {
      method: i.method ?? 'GET', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: i.body === undefined ? undefined : JSON.stringify(i.body),
    });
    const type = response.headers.get('content-type') ?? '';
    return { status: response.status, type, body: type.includes('json') ? await response.json() : (await response.text()).slice(0, 8) } as unknown;
  }, path, init) as Promise<{ status: number; type: string; body: T }>;

  // 1) Anonim erişim reddedilir
  await page.goto(`${base}/login`, { waitUntil: 'networkidle0' });
  assert.equal((await api('/api/quotations')).status, 401);

  // 2) Giriş formu -> çerez oturumu
  await page.type('input[type="email"]', 'e2e-owner@example.test');
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname.startsWith('/app'), { timeout: 20_000 });
  await page.screenshot({ path: `${output}/after-login.png` });
  const exposed = await page.evaluate(() => ({ storage: Object.keys(localStorage).filter(key => /token|session_backup/i.test(key)), cookie: document.cookie }));
  assert.deepEqual(exposed.storage, [], 'oturum jetonu localStorage içinde olmamalı');
  assert.equal(/bm_(session|admin)/.test(exposed.cookie), false, 'oturum çerezi JavaScript tarafından okunamamalı');
  const me = await api<{ company: { id: string }; role: string }>('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.company.id, company.id);

  // 3) Müşteri ve teklif
  const client = await api<{ id: string }>('/api/clients', { method: 'POST', body: { name: 'E2E Müşteri', type: 'company' } });
  assert.equal(client.status, 200, `müşteri oluşturulamadı: ${client.status}`);
  const quote = await api<{ id: string }>('/api/quotations', {
    method: 'POST',
    body: {
      clientId: client.body.id, quoteNumber: 'E2E-001', projectName: 'E2E Proje', date: '2026-10-17', expiryDate: '2026-11-17',
      items: [{ description: 'C30/37 hazır beton', unit: 'm3', quantity: 10, unitPrice: 3000, vatPercent: 20 }],
    },
  });
  assert.equal(quote.status, 200, `teklif oluşturulamadı: ${quote.status}`);
  const list = await api<unknown[]>('/api/quotations');
  assert.ok(Array.isArray(list.body) && list.body.length === 1);

  // 4) PDF üretimi
  const pdf = await api(`/api/quotations/${quote.body.id}/pdf`);
  assert.equal(pdf.status, 200, `PDF üretilemedi: ${pdf.status}`);
  assert.ok(pdf.type.includes('pdf'), `PDF içerik türü beklenirken ${pdf.type}`);
  assert.ok(String(pdf.body).startsWith('%PDF-'), 'yanıt bir PDF dosyası olmalı');

  // 5) Yenileme sonrası oturum sürer
  await page.reload({ waitUntil: 'networkidle0' });
  assert.ok(await page.evaluate(() => location.pathname.startsWith('/app')), 'yenilemeden sonra uygulamada kalınmalı');
  assert.equal((await api('/api/auth/me')).status, 200);

  // 6) CSRF: çerezle gelen, kaynağı kanıtlanamayan değiştirici istek reddedilir (tarayıcı dışı istemci)
  const cookies = await page.cookies(`${base}/api/auth/me`); // çerez yolu /api
  const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
  assert.ok(cookies.some(cookie => cookie.name === 'bm_session' && cookie.httpOnly && cookie.sameSite === 'Strict'));
  const forged = await fetch(`${base}/api/clients`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookieHeader, Origin: 'https://evil.example' },
    body: JSON.stringify({ name: 'Sahte' }),
  });
  assert.equal(forged.status, 403);
  assert.equal(((await forged.json()) as { code: string }).code, 'CSRF_ORIGIN_MISMATCH');

  // 7) Çıkış: çerez silinir, API 401 verir
  assert.equal((await api('/api/auth/logout', { method: 'POST' })).status, 200);
  assert.equal((await api('/api/quotations')).status, 401);
  assert.equal((await page.cookies(`${base}/api/auth/me`)).some(cookie => cookie.name === 'bm_session'), false);

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, loginFormCookieSession: true, noTokenInStorage: true, quoteAndPdf: true, sessionSurvivesReload: true, csrfRejected: true, logoutClearsCookie: true, screenshots: output }));
} finally {
  try { await browser?.close(); } finally {
    try {
      if (server) await new Promise<void>(resolve => { server!.close(() => resolve()); server!.closeAllConnections(); });
      await vite?.close();
    } finally {
      try { await database?.$client.end(); } finally { await isolation.cleanup(); }
    }
  }
}
