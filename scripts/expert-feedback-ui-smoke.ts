/**
 * Uzman geri bildirimi smoke testi: gerçek sunucu + Vite + gerçek tarayıcı.
 *
 *   giriş -> KİK hesaplayıcısında sonuç -> "tutmuyor" geri bildirimi (açıklama + paylaşım onayı) -> 202 + referans
 *   -> uygulama içi "Geri Bildirim" paneli -> genel geri bildirim -> anonim ziyaretçi kartı görmez
 *
 * İzole PostgreSQL şeması kullanır. Kullanım:
 *   PUPPETEER_EXECUTABLE_PATH=<chrome> pnpm exec tsx scripts/expert-feedback-ui-smoke.ts [ekran-görüntüsü-klasörü]
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
  AUTH_EMAIL_WEBHOOK_URL: '',
  EXPERT_FEEDBACK_EMAIL: 'feedback-inbox@example.test',
  NODE_ENV: 'test',
});

const output = process.argv[2] ?? '/tmp/bimmetraj-expert-feedback';
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
let server: ReturnType<typeof createServer> | undefined;
let vite: Awaited<ReturnType<typeof createViteServer>> | undefined;
try {
  const [{ createApiApp }, { db }, schema, { AuthService }] = await Promise.all([
    import('../src/server/app'), import('../src/db'), import('../src/db/schema'), import('../src/services/auth/authService'),
  ]);
  const password = 'Feedback-fixture-pass-123';
  const [company] = await db.insert(schema.companies).values({ name: 'Uzman Önizleme Yapı A.Ş.' }).returning();
  const [owner] = await db.insert(schema.users).values({
    email: 'uzman@example.test', fullName: 'Uzman Mühendis', emailVerified: new Date(), passwordHash: await AuthService.hashPassword(password),
  }).returning();
  await db.insert(schema.memberships).values({ userId: owner.id, companyId: company.id, role: 'owner' });
  const [plan] = await db.insert(schema.plans).values({ name: 'Önizleme', monthlyQuoteLimit: 20, monthlyPrice: 0, monthlyPdfLimit: 20 }).returning();
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
  const anonymous = await browser.newPage();
  await anonymous.goto(`${base}/hesaplayicilar/kik-asiri-dusuk-teklif`, { waitUntil: 'networkidle0' });
  await anonymous.waitForSelector('[data-testid="kik-result"]');
  assert.equal(await anonymous.$('[data-testid="expert-feedback"]'), null, 'anonymous visitors must not see the feedback card');
  // Production sends anonymous visitors to /login (ProtectedRoute; route placement is guarded in registry.test.ts).
  // The Vite dev server instead enters the dev-only demo session, which must never be offered the feedback form.
  for (const calcPath of ['/hesaplayicilar/yambis-muteahhitlik-grubu', '/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum']) {
    await anonymous.goto(`${base}${calcPath}`, { waitUntil: 'networkidle0' });
    await anonymous.waitForSelector('[data-testid="calculator-disclaimer"]', { timeout: 10_000 });
    assert.equal(await anonymous.$('[data-testid="expert-feedback"]'), null, `${calcPath}: no feedback form without a real session`);
  }
  await anonymous.close();

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error instanceof Error ? error.message : String(error)));
  const feedbackResponses: { status: number; body: unknown }[] = [];
  page.on('response', async response => {
    if (response.url().endsWith('/api/expert-feedback')) feedbackResponses.push({ status: response.status(), body: await response.json().catch(() => null) });
  });

  await page.goto(`${base}/login`, { waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', 'uzman@example.test');
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname.startsWith('/app'), { timeout: 20_000 });

  await page.goto(`${base}/hesaplayicilar/kik-asiri-dusuk-teklif`, { waitUntil: 'networkidle0' });
  await page.type('input[aria-label="Yaklaşık maliyet"]', '100000000');
  await page.select('select[aria-label="İş grubu"]', 'ust_yapi');
  const bids = await page.$('textarea');
  assert.ok(bids, 'bid list textarea');
  await bids.type('95000000\n91500000\n88000000\n84000000');
  await page.waitForSelector('[data-testid="expert-feedback"]');
  const card = await page.$('[data-testid="expert-feedback"]');
  await card!.scrollIntoView();
  await page.screenshot({ path: `${output}/1-calculator-feedback-card.png` });

  const clickByText = async (text: string) => {
    const handle = await page.evaluateHandle((label: string) => [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === label) ?? null, text);
    const element = handle.asElement();
    assert.ok(element, `button "${text}"`);
    await (element as Awaited<ReturnType<typeof page.$>>)!.click();
  };
  await clickByText('Hayır, tutmuyor');
  await page.type('[data-testid="expert-feedback"] textarea', 'K katsayısı idarenin cetveliyle farklı çıktı.');
  await page.type('[data-testid="expert-feedback"] input:not([type="checkbox"])', '79.850.000,00');
  await page.click('[data-testid="expert-feedback"] input[type="checkbox"]');
  await page.screenshot({ path: `${output}/2-calculator-feedback-filled.png` });
  await clickByText('Geri bildirimi gönder');
  await page.waitForFunction(() => document.querySelector('[data-testid="expert-feedback"]')?.textContent?.includes('Referans'), { timeout: 10_000 });
  await page.screenshot({ path: `${output}/3-calculator-feedback-sent.png` });
  assert.equal(feedbackResponses[0]?.status, 202);
  assert.match(String((feedbackResponses[0]?.body as { reference?: string })?.reference), /^[0-9a-f-]{36}$/);

  await page.goto(`${base}/app`, { waitUntil: 'networkidle0' });
  await clickByText('Geri Bildirim');
  await page.waitForSelector('[data-testid="expert-feedback"]');
  await clickByText('Öneri / soru');
  await page.type('[data-testid="expert-feedback"] textarea', 'Gösterge panelinde son hesapların listesi faydalı olur.');
  await page.screenshot({ path: `${output}/4-general-feedback-panel.png` });
  await clickByText('Geri bildirimi gönder');
  await page.waitForFunction(() => document.querySelector('[data-testid="expert-feedback"]')?.textContent?.includes('Referans'), { timeout: 10_000 });
  assert.equal(feedbackResponses[1]?.status, 202);

  await page.goto(`${base}/app/uzman-onizleme`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('ul[aria-label="Önizleme görevleri"] li');
  assert.equal(await page.$$eval('ul[aria-label="Önizleme görevleri"] li', items => items.length), 6);
  await page.screenshot({ path: `${output}/5-expert-preview-index.png` });
  for (const [previewPath, shot] of [['/app/uzman-onizleme/yambis', '6-yambis-preview'], ['/app/uzman-onizleme/kat-karsiligi', '7-kat-karsiligi-preview']] as const) {
    await page.goto(`${base}${previewPath}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="expert-preview-notice"]');
    await page.waitForSelector('[data-testid="expert-feedback"]');
    assert.equal(await page.$('a[href="/register"]'), null, `${previewPath}: no public sign-up prompt inside the preview`);
    await page.screenshot({ path: `${output}/${shot}.png` });
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, anonymousHidden: true, calculatorFeedback: feedbackResponses[0], generalFeedback: feedbackResponses[1], screenshots: output }));
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
