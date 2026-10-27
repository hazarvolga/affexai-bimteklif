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
import { eq } from 'drizzle-orm';
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
  // M-12.6 fixture: one client and one approved, authorised company catalogue price.
  const [quoteClient] = await db.insert(schema.clients).values({ companyId: company.id, name: 'Faz 1 Müşteri', type: 'company' }).returning();
  const [catalogSource] = await db.insert(schema.priceSources).values({
    companyId: company.id, sourceType: 'supplier_quote', name: 'Firma kataloğu', sourceDocumentHash: 'c'.repeat(64),
    licenseStatus: 'verified', authorizationStatus: 'authorized',
    authorizationScope: JSON.stringify({ version: 1, capabilities: ['commercial_quotation'], tenantScope: 'own' }),
    authorizationEvidenceHash: 'd'.repeat(64), authorizedAt: new Date('2026-10-01T09:00:00Z'), authorizedByUserId: owner.id, createdByUserId: owner.id,
  }).returning();
  const [catalogSnapshot] = await db.insert(schema.priceSnapshots).values({
    companyId: company.id, priceSourceId: catalogSource.id, snapshotKey: 'faz1-catalog-beton', positionCode: '15.150.1006',
    description: 'C30/37 hazır beton', unit: 'm³', amount: '2500', currency: 'TRY', vatStatus: 'excluded', vatPercent: '20',
    validFrom: new Date('2026-01-01T00:00:00Z'), validUntil: new Date('2099-12-31T23:59:59Z'), sourceDocumentHash: 'e'.repeat(64),
    reviewStatus: 'approved', reviewedByUserId: owner.id, reviewedAt: new Date('2026-10-02T09:00:00Z'), createdByUserId: owner.id,
  }).returning();

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
  // M-12.5: the items table opens in the basic view; cost, waste, discount and VAT sit in each row's detail.
  const columnHeaders = () => page.$$eval('[data-testid="quote-items-table"] thead th', cells => cells.map(cell => cell.textContent?.trim()).filter(Boolean));
  assert.deepEqual(await columnHeaders(), ['İş Kalemi', 'Birim', 'Miktar', 'Birim Fiyat', 'Tutar (KDV hariç)', 'İşlemler']);
  await page.click('[data-row-detail-toggle]');
  await page.waitForSelector('[data-row-detail] input[aria-label="Maliyet birim fiyatı"]', { timeout: 5_000 });
  await (await page.$('[data-testid="quote-items-table"]'))!.screenshot({ path: `${output}/2b-table-basic-detail.png` });
  await page.click('[data-table-view="detailed"]');
  assert.equal((await columnHeaders()).length, 11);
  await page.click('[data-table-view="basic"]');

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

  step = 'parcel feasibility screen';
  // M-13.3/13.4: feasibility has its own screen; an untouched form shows a hint, checks start once typing begins.
  await page.goto(`${base}/app/smartcheck#pre-bim-feasibility`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => location.pathname === '/app/arsa-fizibilitesi', { timeout: 10_000 });
  await page.waitForSelector('[data-testid="feasibility-untouched"]', { timeout: 10_000 });
  assert.doesNotMatch(await text(), /Arsa alanı pozitif olmalı/);
  await page.type('[data-testid="pre-bim-feasibility"] input[placeholder="ad"]', 'Ada 101 Parsel 5');
  await page.waitForFunction(() => (document.body.textContent ?? '').includes('Arsa alanı pozitif olmalı'), { timeout: 5_000 });
  await page.screenshot({ path: `${output}/6-parcel-feasibility.png` });

  step = 'company catalogue in a manual quote';
  // M-12.6: a manual quote line picked from the company catalogue is saved bound to the approved price snapshot.
  await page.goto(`${base}/app/quotes/new?kaynak=elle`, { waitUntil: 'networkidle0' });
  await page.click('[data-testid="company-catalog-toggle"]');
  await page.waitForSelector(`[data-catalog-row="${catalogSnapshot.id}"]`, { timeout: 10_000 });
  await page.click(`[data-catalog-row="${catalogSnapshot.id}"] button`);
  await page.waitForSelector('[data-catalog-bound]', { timeout: 5_000 });
  assert.match(await page.$eval('[data-catalog-bound]', element => element.textContent ?? ''), /Firma kataloğu · 15\.150\.1006/);
  const quantity = (await page.$('[data-quote-row] input[aria-label="Miktar"]'))!;
  await quantity.evaluate(element => (element as HTMLInputElement).select());
  await quantity.type('24');
  await page.type('input[aria-label="Proje başlığı"]', 'Katalog Faz 1');
  await page.$eval('#quote-client', element => element.scrollIntoView({ block: 'center' }));
  await page.click('#quote-client');
  await page.waitForSelector('[role="option"]', { timeout: 5_000 });
  await page.evaluate(() => ([...document.querySelectorAll('[role="option"]')].find(option => option.textContent?.includes('Faz 1 Müşteri')) as HTMLElement | undefined)?.click());
  await (await page.$('[data-testid="company-catalog-picker"]'))!.screenshot({ path: `${output}/8-company-catalog.png` });
  await clickByText('Taslağı Kaydet');
  await page.waitForFunction(() => /^\/app\/quotes\/[0-9a-f-]{36}$/.test(location.pathname), { timeout: 15_000 });
  const savedQuoteId = await page.evaluate(() => location.pathname.split('/').pop()!);
  const savedItems = await db.select().from(schema.quotationItems).where(eq(schema.quotationItems.quotationId, savedQuoteId));
  assert.equal(savedItems.length, 1);
  assert.equal(savedItems[0].priceSnapshotId, catalogSnapshot.id);
  assert.equal(savedItems[0].priceSource, 'snapshot');
  assert.equal(Number(savedItems[0].quantity), 24);
  const savedEvidence = await db.select().from(schema.quotationItemEvidence).where(eq(schema.quotationItemEvidence.quotationId, savedQuoteId));
  assert.deepEqual(savedEvidence.map(record => [record.evidenceType, record.priceSnapshotId]), [['price', catalogSnapshot.id]]);
  assert.equal(quoteClient.id, (await db.select().from(schema.quotations).where(eq(schema.quotations.id, savedQuoteId)))[0].clientId);

  step = 'public SmartCheck demo';
  // M-10.2/10.4/10.6: a signed-out visitor sees the problem first, a quantity (not label) fix, and a sign-up exit.
  const visitor = await (await browser.createBrowserContext()).newPage();
  await visitor.setViewport({ width: 1440, height: 1000 });
  visitor.on('pageerror', error => errors.push(error instanceof Error ? error.message : String(error)));
  await visitor.goto(`${base}/smartcheck`, { waitUntil: 'networkidle0' });
  await visitor.waitForSelector('[data-testid="demo-intro"]', { timeout: 10_000 });
  const demoText = () => visitor.evaluate(() => document.body.textContent ?? '');
  assert.doesNotMatch(await demoText(), /Re-check|Yeniden Kontrolü Tetikleyin/);
  assert.match(await demoText(), /120,00 m² × 0,20 m = 24,00 m³/);
  await visitor.click('[data-testid="demo-apply-fix"]');
  await visitor.waitForSelector('[data-testid="demo-recheck"]', { timeout: 5_000 });
  await visitor.click('[data-testid="demo-recheck"]');
  await visitor.waitForFunction(() => (document.querySelector('[data-demo-finding="finding-a"]')?.textContent ?? '').includes('Çözüldü'), { timeout: 5_000 });
  assert.equal(await visitor.$eval('[data-testid="demo-back-link"]', element => element.getAttribute('href')), '/');
  assert.deepEqual(await visitor.$$eval('[data-testid="demo-try-own-file"] a', links => links.map(link => link.getAttribute('href'))), ['/register', '/']);
  await visitor.screenshot({ path: `${output}/7-public-demo.png`, fullPage: true });
  await visitor.close();

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
