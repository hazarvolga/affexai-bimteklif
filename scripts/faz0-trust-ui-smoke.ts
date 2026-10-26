/**
 * Faz 0 güven smoke testi (marka.md M-13.x, M-14.x, M-12.3, M-11.6, M-18.x): gerçek sunucu + Vite + gerçek tarayıcı.
 *
 *   giriş -> SmartCheck örnek proje (fiyat kataloğu boş) -> sonuç özeti durumları -> maliyet sekmesinde
 *   eksik fiyat 0 TL değil "fiyat bekliyor" -> yeni teklif seçim kutuları etiket gösterir -> panel şeridi
 *   katalog durumunu söyler -> kullanım ekranında USD maliyet yok
 *
 * İzole PostgreSQL şeması kullanır. Kullanım:
 *   PUPPETEER_EXECUTABLE_PATH=<chrome> pnpm exec tsx scripts/faz0-trust-ui-smoke.ts [ekran-görüntüsü-klasörü]
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
import { createServer as createViteServer } from 'vite';
import { createTestIsolation } from '../src/server/routes/test-isolation';

dotenv.config({ path: '.env.local', quiet: true });
const isolation = await createTestIsolation(process.env.TEST_ISOLATION_SOURCE_DATABASE_URL ?? process.env.DATABASE_URL!);
Object.assign(process.env, {
  DATABASE_URL: isolation.databaseUrl,
  CONTROL_DATABASE_URL: isolation.controlDatabaseUrl,
  ...(isolation.workerDatabaseUrl ? { WORKER_DATABASE_URL: isolation.workerDatabaseUrl } : {}),
  GRAPHILE_WORKER_SCHEMA: isolation.workerSchema,
  SMARTCHECK_LOCAL_STORAGE_DIR: isolation.storageDir,
  SMARTCHECK_IMPORT_ENABLED: 'true',
  AUTH_EMAIL_WEBHOOK_URL: '',
  NODE_ENV: 'test',
});

const output = process.argv[2] ?? '/tmp/bimmetraj-faz0';
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
let step = 'setup';
let server: ReturnType<typeof createServer> | undefined;
let vite: Awaited<ReturnType<typeof createViteServer>> | undefined;
try {
  const [{ createApiApp }, { db }, schema, { AuthService }] = await Promise.all([
    import('../src/server/app'), import('../src/db'), import('../src/db/schema'), import('../src/services/auth/authService'),
  ]);
  const password = 'Faz0-fixture-pass-123';
  const [company] = await db.insert(schema.companies).values({ name: 'Faz 0 Yapı A.Ş.' }).returning();
  const [owner] = await db.insert(schema.users).values({
    email: 'faz0@example.test', fullName: 'Faz Sıfır', emailVerified: new Date(), passwordHash: await AuthService.hashPassword(password),
  }).returning();
  await db.insert(schema.memberships).values({ userId: owner.id, companyId: company.id, role: 'owner' });
  const [plan] = await db.insert(schema.plans).values({ name: 'Faz 0', monthlyQuoteLimit: 20, monthlyPrice: 0, monthlyPdfLimit: 20, monthlyIfcLimit: 5 }).returning();
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
  await page.setViewport({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error instanceof Error ? error.message : String(error)));
  // textContent, not innerText: CSS uppercase would otherwise change the asserted strings.
  const text = () => page.evaluate(() => document.body.textContent ?? '');
  const clickByText = async (label: string) => {
    const handle = await page.evaluateHandle((wanted: string) =>
      [...document.querySelectorAll('button, a')].find(element => element.textContent?.trim().includes(wanted)) ?? null, label);
    const element = handle.asElement();
    assert.ok(element, `button/link containing "${label}"`);
    await (element as Awaited<ReturnType<typeof page.$>>)!.click();
  };

  await page.goto(`${base}/login`, { waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', 'faz0@example.test');
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname.startsWith('/app'), { timeout: 20_000 });

  step = 'dashboard strip';
  // M-11.6: catalogue strip states the real (empty) catalogue.
  await page.waitForFunction(() => (document.body.textContent ?? '').includes('FİYAT KATALOĞU'), { timeout: 10_000 });
  await page.waitForFunction(() => (document.body.textContent ?? '').includes('Henüz eklenmedi'), { timeout: 10_000 });
  assert.doesNotMatch(await text(), /Kanıtlı Metraj & Fiyat Kataloğu/);
  await page.screenshot({ path: `${output}/1-dashboard-strip.png` });

  step = 'smartcheck sample';
  // SmartCheck sample project with an empty price catalogue.
  await page.goto(`${base}/app/smartcheck`, { waitUntil: 'networkidle0' });
  assert.doesNotMatch(await text(), /Resmi İcmal Paftası/);
  await clickByText('Mimari (Tablo 9.1)');
  await page.waitForSelector('[data-testid="result-summary"]', { timeout: 60_000 });
  const summary = await page.$eval('[data-testid="result-summary"]', element => element.textContent ?? '');
  assert.match(summary, /kalem fiyat bekliyor/);
  assert.match(summary, /Uzman incelemesi bekliyor/);
  assert.match(summary, /Sonraki adım/);
  assert.doesNotMatch(await text(), /MİNHA DOĞRULANDI/);
  await (await page.$('[data-testid="result-summary"]'))!.scrollIntoView();
  await page.screenshot({ path: `${output}/2-result-summary.png` });

  step = 'cost step';
  // M-14.1: cost step shows missing prices, never a 0 TL grand total.
  await clickByText('3. Maliyet');
  await page.waitForFunction(() => (document.body.textContent ?? '').includes('Genel Toplam Hesaplanmadı'), { timeout: 10_000 });
  const costText = await text();
  assert.match(costText, /Eksik/);
  assert.match(costText, /Hesaplanmadı/);
  assert.doesNotMatch(costText, /Genel Toplam \(KDV Hariç\)\s*0,00/);
  assert.doesNotMatch(costText, /BYOL|snapshot|Calm İcmalinden|Ardıl/);
  const costGrid = await page.evaluateHandle(() => {
    const heading = [...document.querySelectorAll('h3')].find(element => element.textContent?.includes('Birim Fiyat ve Maliyet Cetveli'));
    return heading?.closest('.lg\\:col-span-7')?.parentElement ?? null;
  });
  const costElement = costGrid.asElement();
  assert.ok(costElement, 'cost grid');
  await (costElement as Awaited<ReturnType<typeof page.$>>)!.screenshot({ path: `${output}/3-cost-missing-prices.png` });

  step = 'create quote';
  // M-12.3: closed selects show labels, not raw values.
  await page.goto(`${base}/app/quotes/new`, { waitUntil: 'networkidle0' });
  const triggers = await page.$$eval('[id^="quote-"]', elements => elements.map(element => element.textContent?.trim() ?? ''));
  for (const raw of ['residential', 'none', 'standard']) assert.ok(!triggers.includes(raw), `closed select shows raw "${raw}"`);
  assert.doesNotMatch(await text(), /piyasa verilerine göre AI asistanı tarafından hesaplanır|%5-8/);
  await page.screenshot({ path: `${output}/4-create-quote.png` });

  step = 'billing';
  // M-18.2: no USD processing cost on the usage screen.
  await page.goto(`${base}/app/billing`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => (document.body.textContent ?? '').includes('Teklif PDF Çıktısı'), { timeout: 10_000 });
  assert.doesNotMatch(await text(), /Tahmini işlem maliyeti|USD/);
  await page.screenshot({ path: `${output}/5-billing-usage.png` });

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, screenshots: output, summary: summary.slice(0, 400) }));
} catch (error) {
  const pages = await browser?.pages();
  const last = pages?.at(-1);
  if (last) {
    await last.screenshot({ path: `${output}/failure.png` }).catch(() => undefined);
    console.error(`FAILED at step "${step}"`, (await last.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 1500));
  }
  throw error;
} finally {
  try { await browser?.close(); } finally {
    try {
      if (server) await new Promise<void>(resolve => { server!.close(() => resolve()); server!.closeAllConnections(); });
      await vite?.close();
    } finally {
      try {
        await import('../src/db/control-plane').then(({ closeControlDatabase }) => closeControlDatabase());
        await import('../src/db').then(({ db }) => db.$client.end());
      } finally { await isolation.cleanup(); }
    }
  }
}
