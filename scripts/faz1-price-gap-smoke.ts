/**
 * Faz 1 fiyat eksikliği smoke testi (marka.md M-17.3, M-17.4, M-14.3): gerçek sunucu + Vite + gerçek tarayıcı.
 *
 *   boş katalog -> 5 adımlı sihirbaz (.xlsx, sütunlar, KDV, onay) -> IFC icmalini aç -> beton kataloğa otomatik
 *   eşleşir -> seramik "Katalogdaki fiyatı eşleştir" -> mermer "Firma fiyatı ekle" -> yeni teklif oluştur ->
 *   teklif Rev. 2'de üç fiyat kaydına bağlı kalemle ve %15 kâr ve genel gider satırıyla açılır
 *
 * Fikstür: işlenmiş, mühendis onaylı satırları ve IFC kanıtı olan bir doküman (worker çalıştırılmaz; satır
 * onayı bu dilimin dışındaki inceleme ekranında yapılır). İzole PostgreSQL şeması kullanır. Kullanım:
 *   PUPPETEER_EXECUTABLE_PATH=<chrome> pnpm exec tsx scripts/faz1-price-gap-smoke.ts [ekran-görüntüsü-klasörü]
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
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

const output = process.argv[2] ?? '/tmp/bimmetraj-faz1-fiyat';
const BETON = 'C30/37 Betonarme (Döşeme, Kolon, Perde, Kiriş)';
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
let step = 'setup';
let server: ReturnType<typeof createServer> | undefined;
let vite: Awaited<ReturnType<typeof createViteServer>> | undefined;

async function catalogueWorkbook(path: string) {
  const { buildPriceCatalogXlsxTemplate, PRICE_CATALOG_SHEET } = await import('../src/lib/spreadsheet-templates');
  const template = await buildPriceCatalogXlsxTemplate();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(template.buffer.slice(template.byteOffset, template.byteOffset + template.byteLength) as ArrayBuffer);
  const sheet = workbook.getWorksheet(PRICE_CATALOG_SHEET)!;
  sheet.getRow(2).values = ['15.150.1006', BETON, 'm³', 3450, 'TRY', null, 'Fatura 2026/118'];
  // Same poz and unit, different wording: the matcher must not bind it on its own.
  sheet.getRow(3).values = ['15.390.1002', 'Zemin seramiği 60x60 birinci sınıf', 'm2', 610, 'TRY', null, 'Fatura 2026/121'];
  await workbook.xlsx.writeFile(path);
}

try {
  const [{ createApiApp }, { db }, schema, { AuthService }, drizzle] = await Promise.all([
    import('../src/server/app'), import('../src/db'), import('../src/db/schema'), import('../src/services/auth/authService'), import('drizzle-orm'),
  ]);
  const password = 'Faz1-fiyat-pass-123';
  const [company] = await db.insert(schema.companies).values({ name: 'Fiyat Yapı A.Ş.' }).returning();
  const [owner] = await db.insert(schema.users).values({
    email: 'fiyat@example.test', fullName: 'Fiyat Sahibi', emailVerified: new Date(), passwordHash: await AuthService.hashPassword(password),
  }).returning();
  await db.insert(schema.memberships).values({ userId: owner.id, companyId: company.id, role: 'owner' });
  const [plan] = await db.insert(schema.plans).values({ name: 'Fiyat', monthlyQuoteLimit: 20, monthlyPrice: 0, monthlyPdfLimit: 20, monthlyIfcLimit: 5 }).returning();
  await db.insert(schema.subscriptions).values({ companyId: company.id, planId: plan.id, currentPeriodStart: new Date('2020-01-01') });

  const [ifcDocument] = await db.insert(schema.documents).values({
    companyId: company.id, uploadedByUserId: owner.id, originalFileName: 'konut-a-blok.ifc', displayName: 'Konut A Blok',
    mimeType: 'application/x-step', fileSizeBytes: 2048, storageKey: `${company.id}/konut-a-blok.ifc`, checksumSha256: 'a'.repeat(64), status: 'completed',
  }).returning();
  const [run] = await db.insert(schema.documentProcessingRuns).values({
    companyId: company.id, documentId: ifcDocument.id, status: 'succeeded', currentStage: 'completed', idempotencyKey: `fiyat-${ifcDocument.id}`,
    pipelineVersion: 5, provider: 'ifcopenshell', model: '0.8.5', progressPercent: 100, completedAt: new Date(),
  }).returning();
  await db.insert(schema.documentProcessingArtifacts).values({
    companyId: company.id, documentId: ifcDocument.id, processingRunId: run.id, artifactType: 'ifc_evidence',
    storageKey: `${company.id}/${run.id}/ifc-evidence.json`, checksumSha256: 'b'.repeat(64), schemaVersion: 1, contentType: 'application/json', sizeBytes: 128,
  });
  const row = (number: number, ifc: string, material: string, poz: string, unit: string, rawUnit: string, quantity: string, description: string) => ({
    companyId: company.id, documentId: ifcDocument.id, processingRunId: run.id, sheetName: 'IFC', sourceRowNumber: number, sourceCellRange: `${ifc}#${number}`,
    rawDescription: `${ifc} · ${material}`, rawPositionCode: poz, rawUnit, rawQuantity: quantity,
    normalizedDescription: description, normalizedPositionCode: poz, normalizedUnit: unit, normalizedQuantity: quantity,
    formulaJson: { materialLayers: JSON.stringify([material]) }, quantitySource: 'ifc_qto',
    reviewStatus: 'approved' as const, reviewerUserId: owner.id, reviewedAt: new Date(),
  });
  await db.insert(schema.normalizedQuantityRows).values([
    row(1, 'IfcSlab', 'Beton_C30', '15.150.1006', 'm³', 'm3', '12.5000', 'C30/37 Betonarme'),
    row(2, 'IfcCovering', 'Seramik_A1', '15.390.1002', 'm²', 'm2', '32.5000', 'Seramik zemin kaplama'),
    row(3, 'IfcCovering', 'Mermer_B1', '15.390.1101', 'm²', 'm2', '9.0000', 'Mermer zemin kaplama'),
  ]);

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
  const workbookPath = `${output}/firma-fiyatlari.xlsx`;
  await catalogueWorkbook(workbookPath);

  browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error instanceof Error ? error.message : String(error)));
  const text = () => page.evaluate(() => document.body.textContent ?? '');
  const waitText = (needle: string, timeout = 15_000) => page.waitForFunction((wanted: string) => (document.body.textContent ?? '').includes(wanted), { timeout }, needle);
  const clickByText = async (label: string, scope = 'button, a') => {
    const handle = await page.evaluateHandle((wanted: string, selector: string) =>
      [...document.querySelectorAll(selector)].find(element => element.textContent?.trim().includes(wanted)) ?? null, label, scope);
    const element = handle.asElement();
    assert.ok(element, `element containing "${label}"`);
    await (element as Awaited<ReturnType<typeof page.$>>)!.click();
  };

  await page.goto(`${base}/login`, { waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', 'fiyat@example.test');
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname.startsWith('/app'), { timeout: 20_000 });

  step = 'empty catalogue wizard';
  // M-17.3: an empty catalogue opens on the five-step first task.
  await page.goto(`${base}/app/fiyat-katalogu?kaynak=smartcheck`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="price-catalog-wizard"]', { timeout: 15_000 });
  assert.equal((await page.$$('[data-wizard-step]')).length, 5);
  await page.screenshot({ path: `${output}/1-wizard-empty.png` });
  await clickByText('Dosyam hazır');
  const fileInput = await page.waitForSelector('#price-catalog-file');
  await (fileInput as unknown as { uploadFile(path: string): Promise<void> }).uploadFile(workbookPath);
  await page.waitForSelector('[data-testid="price-catalog-columns"]', { timeout: 15_000 });
  const mapped = await page.$$eval('[data-column-field]', rows => rows.map(row => [row.getAttribute('data-column-field'), row.lastElementChild?.textContent?.trim()]));
  assert.deepEqual(mapped.slice(0, 4), [['positionCode', 'Poz No'], ['description', 'Açıklama'], ['unit', 'Birim'], ['amount', 'Birim Fiyat']]);
  await waitText('2 fiyat satırı okundu');
  await (await page.$('[data-testid="price-catalog-columns"]'))!.screenshot({ path: `${output}/2-columns.png` });
  await clickByText('Sütunlar doğru');
  await page.waitForSelector('[data-testid="price-catalog-review"]');
  await waitText('fiyatın geçerlilik tarihi yok');
  assert.ok(await page.$eval('[data-testid="price-catalog-review"] button:last-child', button => (button as HTMLButtonElement).disabled), 'VAT rate is required');
  await page.select('#price-catalog-vat', '20');
  await page.type('#price-catalog-valid-until', '31122026');
  await (await page.$('[data-testid="price-catalog-review"]'))!.screenshot({ path: `${output}/3-review.png` });
  await clickByText('İnceledim');
  await page.click('input[type="checkbox"]');
  await clickByText('Fiyatları onayla ve kaydet');
  await page.waitForSelector('[data-testid="price-catalog-imported"]', { timeout: 15_000 });
  await page.waitForSelector('[data-testid="price-catalog-list"]', { timeout: 15_000 });
  const listText = await page.$eval('[data-testid="price-catalog-list"]', element => element.textContent ?? '');
  assert.match(listText, /Onaylı fiyatlar \(2\)/);
  assert.match(listText, /Hariç · %20/);
  await page.screenshot({ path: `${output}/4-catalogue-saved.png` });

  step = 'open icmal';
  await clickByText("SmartCheck'e dön");
  await page.waitForFunction(() => location.pathname === '/app/smartcheck', { timeout: 10_000 });
  await waitText('konut-a-blok.ifc', 20_000);
  await clickByText('İcmali Aç');
  await waitText('3. Maliyet', 20_000);
  await clickByText('3. Maliyet');
  await waitText('Fiyatlandırılan kalem: 1/3', 20_000);

  step = 'bind same-poz catalogue price';
  // M-17.4: same poz and unit but different wording is offered, never applied silently.
  await waitText('Katalogdaki fiyatı eşleştir');
  await page.screenshot({ path: `${output}/5-missing-actions.png`, fullPage: false });
  await clickByText('Katalogdaki fiyatı eşleştir');
  await waitText('Fiyatlandırılan kalem: 2/3');

  step = 'add a company price inline';
  // The result summary also links "Firma fiyatı ekle" to the catalogue; click the action inside the mermer line.
  await page.evaluate(() => {
    const action = [...document.querySelectorAll('[data-missing-price-action="add_price"]')]
      .find(element => element.closest('.grid')?.textContent?.includes('Mermer_B1'));
    (action?.querySelector('button') as HTMLButtonElement | null)?.click();
  });
  const form = await page.waitForSelector('[data-testid="missing-price-form-cov-15-390-1101-mermer-b1"]');
  assert.ok(form);
  await page.type('[data-testid="missing-price-form-cov-15-390-1101-mermer-b1"] input[inputmode="decimal"]', '1.250,00');
  await page.select('[data-testid="missing-price-form-cov-15-390-1101-mermer-b1"] select', '20');
  await page.click('[data-testid="missing-price-form-cov-15-390-1101-mermer-b1"] input[type="checkbox"]');
  await clickByText('Kaydet', '[data-testid="missing-price-form-cov-15-390-1101-mermer-b1"] button');
  await waitText('Fiyatlandırılan kalem: 3/3', 20_000);
  assert.doesNotMatch(await text(), /Firma fiyatı ekle/);

  step = 'new quotation';
  await page.type('#calm-new-client', 'Yılmaz Yapı A.Ş.');
  await page.type('#calm-new-project', 'Konut A Blok');
  await (await page.$('[data-testid="calm-transfer-target"]'))!.scrollIntoView();
  await page.screenshot({ path: `${output}/6-ready-to-transfer.png` });
  // Toasts from the previous steps sit over the button's centre; click the element itself.
  await page.$eval('[data-testid="calm-transfer-submit"]', button => (button as HTMLButtonElement).click());
  await waitText('Oluşturulan teklifi aç', 20_000);

  const quotes = await db.select().from(schema.quotations).where(drizzle.eq(schema.quotations.companyId, company.id));
  const latest = quotes.find(quote => quote.isLatest)!;
  assert.equal(latest.revisionVersion, 2);
  assert.equal(latest.projectName, 'Konut A Blok');
  const items = await db.select().from(schema.quotationItems).where(drizzle.eq(schema.quotationItems.quotationId, latest.id));
  assert.equal(items.length, 3);
  assert.ok(items.every(item => item.priceSnapshotId && item.vatPercent === '20.00'), 'every line is bound to an approved, VAT-explicit price');
  assert.deepEqual(items.map(item => Number(item.unitPrice)).sort((a, b) => a - b), [610, 1250, 3450]);
  // Release 0029: the icmal's 15% profit and overhead is a separate quotation row; VAT applies to it as well.
  assert.deepEqual(
    [latest.overheadProfitPercent, latest.subtotal, latest.overheadProfitTotal, latest.vatTotal, latest.grandTotal],
    ['15.00', '74200.00', '11130.00', '17066.00', '102396.00'],
  );
  await page.screenshot({ path: `${output}/7-quotation-created.png` });

  step = 'quotation detail shows profit and overhead';
  await clickByText('Oluşturulan teklifi aç');
  await page.waitForSelector('[data-testid="quote-overhead-profit"]', { timeout: 20_000 });
  assert.match(await page.$eval('[data-testid="quote-overhead-profit"]', element => element.textContent ?? ''), /KÂR VE GENEL GİDER \(%15\).*11\.130/);
  await page.screenshot({ path: `${output}/8-quotation-detail.png` });

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, screenshots: output, quotation: { revision: latest.revisionVersion, grandTotal: latest.grandTotal } }));
} catch (error) {
  const pages = await browser?.pages();
  const last = pages?.at(-1);
  if (last) {
    await last.screenshot({ path: `${output}/failure.png` }).catch(() => undefined);
    console.error(`FAILED at step "${step}"`, (await last.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 2000));
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
