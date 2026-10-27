/**
 * Faz 1 smoke testi (marka.md C-1/C-2, M-11.4, M-12.1, M-14.3): gerçek sunucu + Vite + gerçek tarayıcı.
 *
 *   giriş -> "Nereden başlayacaksınız?" dört seçenek -> Excel seçeneği Yeni Teklif'i Excel alanına açar ->
 *   .xlsx şablonu iner (ZIP imzası) -> .xls yüklemesi dönüştürme talimatı verir -> örnek proje seçeneği
 *   SmartCheck örneğini açar -> örnekten teklif oluşturulamayacağı maliyet adımında açıkça yazılır
 *
 * İzole PostgreSQL şeması kullanır. Kullanım:
 *   PUPPETEER_EXECUTABLE_PATH=<chrome> pnpm exec tsx scripts/faz1-excel-flow-smoke.ts [ekran-görüntüsü-klasörü]
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
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

const output = process.argv[2] ?? '/tmp/bimmetraj-faz1';
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
let step = 'setup';
let server: ReturnType<typeof createServer> | undefined;
let vite: Awaited<ReturnType<typeof createViteServer>> | undefined;
try {
  const [{ createApiApp }, { db }, schema, { AuthService }] = await Promise.all([
    import('../src/server/app'), import('../src/db'), import('../src/db/schema'), import('../src/services/auth/authService'),
  ]);
  const password = 'Faz1-fixture-pass-123';
  const [company] = await db.insert(schema.companies).values({ name: 'Faz 1 Yapı A.Ş.' }).returning();
  const [owner] = await db.insert(schema.users).values({
    email: 'faz1@example.test', fullName: 'Faz Bir', emailVerified: new Date(), passwordHash: await AuthService.hashPassword(password),
  }).returning();
  await db.insert(schema.memberships).values({ userId: owner.id, companyId: company.id, role: 'owner' });
  const [plan] = await db.insert(schema.plans).values({ name: 'Faz 1', monthlyQuoteLimit: 20, monthlyPrice: 0, monthlyPdfLimit: 20, monthlyIfcLimit: 5 }).returning();
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
  await page.type('input[type="email"]', 'faz1@example.test');
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname.startsWith('/app'), { timeout: 20_000 });

  step = 'start chooser';
  // M-11.4 / M-12.1: one entry question, four sources, each opening its flow directly.
  await page.goto(`${base}/app`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="contractor-workflow-hub"]', { timeout: 15_000 });
  const options = await page.$$eval('[data-start-option]', elements => elements.map(element => [element.getAttribute('data-start-option'), element.getAttribute('href')]));
  assert.deepEqual(options, [
    ['excel', '/app/quotes/new?kaynak=excel'],
    ['ifc', '/app/smartcheck'],
    ['manual', '/app/quotes/new?kaynak=elle'],
    ['sample', '/app/smartcheck?ornek=mm-mimari-tablo-9-1'],
  ]);
  assert.match(await text(), /Nereden başlayacaksınız\?/);
  await (await page.$('[data-testid="contractor-workflow-hub"]'))!.screenshot({ path: `${output}/1-start-chooser.png` });

  step = 'excel entry';
  await page.click('[data-start-option="excel"]');
  await page.waitForFunction(() => location.pathname === '/app/quotes/new', { timeout: 10_000 });
  await page.waitForFunction(() => (document.body.textContent ?? '').includes('Excel Şablonu İndir (.xlsx)'), { timeout: 10_000 });
  await page.screenshot({ path: `${output}/2-excel-entry.png` });
  // M-12.4: risk and delivery assumptions start in a closed "Gelişmiş" section with a value summary.
  assert.equal(await page.$eval('[data-testid="quote-advanced"]', element => (element as HTMLDetailsElement).open), false);
  assert.match(await page.$eval('[data-testid="quote-advanced-summary"]', element => element.textContent ?? ''), /ay · %/);

  step = 'xlsx template download';
  // C-1: the primary template is a real .xlsx workbook, CSV stays as a secondary link.
  const downloads = `${output}/downloads`;
  await mkdir(downloads, { recursive: true });
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await clickByText('Excel Şablonu İndir (.xlsx)');
  let template = '';
  for (let attempt = 0; attempt < 40 && !template; attempt += 1) {
    template = (await readdir(downloads)).find(name => name.endsWith('.xlsx')) ?? '';
    if (!template) await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(template, 'xlsx template downloaded');
  const templateBytes = await readFile(`${downloads}/${template}`);
  assert.deepEqual([...templateBytes.subarray(0, 2)], [0x50, 0x4b], 'template is a ZIP-based .xlsx');

  step = 'legacy xls';
  // C-2: an old .xls gets a conversion instruction instead of a parser error.
  const legacy = `${output}/eski-metraj.xls`;
  await writeFile(legacy, Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]));
  const input = await page.$('input[type="file"][accept*=".xls"]');
  assert.ok(input, 'quote import input');
  await (input as Awaited<ReturnType<typeof page.$>> & { uploadFile(path: string): Promise<void> }).uploadFile(legacy);
  await page.waitForFunction(() => (document.body.textContent ?? '').includes('Farklı Kaydet'), { timeout: 10_000 });
  await page.screenshot({ path: `${output}/3-legacy-xls-message.png` });

  step = 'sample entry';
  await page.goto(`${base}/app`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-start-option="sample"]', { timeout: 15_000 });
  await page.click('[data-start-option="sample"]');
  await page.waitForSelector('[data-testid="result-summary"]', { timeout: 60_000 });
  assert.equal(await page.evaluate(() => new URLSearchParams(location.search).get('ornek')), null, 'sample param is consumed once');

  step = 'sample cannot become a quotation';
  // A quota-free sample carries no IFC evidence, so the server would refuse a transfer. The cost step says so up
  // front instead of offering a target; the new quotation / revision choice is covered by faz1-price-gap-smoke.
  await clickByText('3. Maliyet');
  await page.waitForSelector('[data-testid="calm-transfer-unavailable"]', { timeout: 10_000 });
  assert.match(await page.$eval('[data-testid="calm-transfer-unavailable"]', element => element.textContent ?? ''), /Örnek projeden teklif oluşturulmaz/);
  assert.equal(await page.$('[data-testid="calm-transfer-target"]'), null);
  assert.doesNotMatch(await text(), /Aktarım için önce mevcut bir teklif oluşturulmalıdır/);
  await (await page.$('[data-testid="calm-transfer-unavailable"]'))!.screenshot({ path: `${output}/4-sample-transfer-note.png` });

  step = 'public tender tools';
  // M-14.5: KİK and 4735 tools appear only for a public tender; the choice is remembered in this browser.
  await page.$eval('[data-testid="cost-tools"]', element => { (element as HTMLDetailsElement).open = true; });
  assert.doesNotMatch(await text(), /4734 KİK m\.38/);
  await page.click('[data-testid="public-tender-toggle"]');
  await page.waitForFunction(() => (document.body.textContent ?? '').includes('4734 KİK m.38'), { timeout: 10_000 });
  assert.match(await text(), /4735 FİYAT FARKI/);
  await (await page.$('[data-testid="cost-tools"]'))!.screenshot({ path: `${output}/5-public-tender-tools.png` });

  step = 'retired demo route';
  // M-15.2: the fixed-price demo is gone; old links land on the single IFC entry.
  await page.goto(`${base}/app/dosyadan-teklif-demo`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => location.pathname === '/app/smartcheck', { timeout: 10_000 });

  step = 'browser preview';
  await page.goto(`${base}/app/ifc-parser`, { waitUntil: 'networkidle0' });
  assert.doesNotMatch(await text(), /İcmal nereye aktarılsın/);

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, screenshots: output, template }));
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
