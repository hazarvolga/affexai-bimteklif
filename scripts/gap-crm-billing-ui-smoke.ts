import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';

// Browser contract fixtures only: no imports of the app server or database.
const vite = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false }, appType: 'spa' });
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
const output = '/tmp/teklifpro-crm-billing-ui';
const clientId = '11111111-1111-4111-8111-111111111111';
const dealId = '22222222-2222-4222-8222-222222222222';
try {
  await vite.listen();
  const address = vite.httpServer!.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH });
  const page = await browser.newPage();
  const errors: string[] = [];
  const missingAuth: string[] = [];
  let role = 'owner';
  let unavailable = false;
  let rejectWrite = false;
  let billingMode = 'zero';
  let deal = { id: dealId, name: 'İzole CRM fırsatı', stage: 'lead', value: '2500', probability: '0.4', riskLevel: 'medium', aiInsights: 'Önceki kayıtlı analiz', quotationId: clientId };
  let activities: { id: string; type: string; description: string; createdAt: string }[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.evaluateOnNewDocument(() => localStorage.setItem('token', 'isolated-browser-fixture'));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) { void request.continue(); return; }
    if (request.headers().authorization !== 'Bearer isolated-browser-fixture') missingAuth.push(url.pathname);
    const respond = (body: unknown, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
    void (async () => {
      if (url.pathname === '/api/auth/me') return respond({ user: { id: clientId, email: 'fixture@example.test', fullName: 'Test Owner', emailVerified: '2026-10-08' }, company: { id: clientId, name: 'Isolated UI', defaultCurrency: 'TRY', defaultVatRate: 20 }, role, accountType: 'workspace' });
      if (url.pathname === '/api/crm/pipeline') return unavailable ? respond({ error: 'unavailable' }, 503) : respond([deal]);
      if (url.pathname === '/api/clients') return respond([{ id: clientId, name: 'Test Müşterisi' }]);
      if (url.pathname === '/api/crm/leads') return respond([{ id: clientId, name: 'Potansiyel müşteri', email: 'long-address-for-layout@example.test', phone: null, source: 'Web' }]);
      if (url.pathname === '/api/crm/analyze-deal') return respond({ error: 'Provider unavailable' }, 503);
      if (url.pathname === '/api/crm/deals' && request.method() === 'POST') {
        if (rejectWrite) return respond({ error: 'failed' }, 500);
        deal = { ...deal, ...JSON.parse(request.postData()!), quotationId: clientId };
        return respond(deal, 201);
      }
      if (url.pathname === '/api/crm/deals/update-stage') {
        if (rejectWrite) return respond({ error: 'failed' }, 500);
        deal = { ...deal, stage: JSON.parse(request.postData()!).stage };
        return respond(deal);
      }
      if (url.pathname === '/api/crm/activities') {
        if (rejectWrite) return respond({ error: 'failed' }, 500);
        const activity = { id: String(activities.length + 1), type: 'note', description: JSON.parse(request.postData()!).description, createdAt: new Date().toISOString() };
        activities = [activity, ...activities]; return respond(activity, 201);
      }
      if (url.pathname === `/api/crm/deals/${dealId}`) return unavailable ? respond({ error: 'missing' }, 404) : respond(deal);
      if (url.pathname.endsWith('/activities')) return respond(activities);
      if (url.pathname === '/api/billing/usage-stats') {
        if (unavailable) return respond({ error: 'unavailable' }, 503);
        return respond({ plan: 'Pilot', totalMonthlyCost: 0, period: { start: '2026-10-01', end: '2026-11-01', timezone: 'UTC' }, usage: [
          { feature: 'QUOTATION_CREATED', current: billingMode === 'near' ? 8 : 0, limit: billingMode === 'null' ? null : billingMode === 'near' ? 10 : 0, cost: 0, enforced: true, available: billingMode === 'near', reason: billingMode === 'null' ? 'SUBSCRIPTION_REQUIRED' : billingMode === 'zero' ? 'QUOTA_EXCEEDED' : null },
          { feature: 'AI_GENERATION', current: 90, limit: 100, cost: 0, enforced: false },
          { feature: 'PDF_GENERATED', current: 1, limit: null, cost: 0, enforced: false },
        ] });
      }
      return respond([]);
    })().catch(error => errors.push(String(error)));
  });
  await mkdir(output, { recursive: true });
  const clickText = async (text: string) => {
    const button = await page.waitForSelector(`::-p-text(${text})`);
    await button!.click();
  };
  const visibleText = () => page.evaluate(() => document.body.innerText);
  const snapshot = async (name: string) => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name} overflows viewport`);
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  };
  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: 900 });
    await page.goto(`${base}/app/crm`, { waitUntil: 'networkidle0' });
    await page.waitForSelector(`a[href="/app/crm/deals/${dealId}"]`);
    assert.doesNotMatch(await visibleText(), /U1|U2|FIRSATA DÖNÜŞTÜR/);
    await snapshot(`crm-${width}`);
    await page.click('button[aria-label="Lead: fırsat ekle"]');
    await page.waitForSelector('#deal-client');
    await page.select('#deal-client', clientId);
    await page.type('#deal-name', `Fırsat ${width}`);
    await page.type('#deal-value', '1200');
    await snapshot(`crm-create-${width}`);
    await page.click('form button[type="submit"]');
    await page.waitForSelector('#deal-note');
    await page.type('#deal-note', `Kalıcı not ${width}`);
    await clickText('Not ekle');
    await page.waitForFunction(text => document.querySelector('ol')?.textContent?.includes(text), {}, `Kalıcı not ${width}`);
    await page.select('#detail-stage', width === 1440 ? 'won' : 'lost');
    await clickText('Aşamayı kaydet');
    await page.waitForFunction(() => (document.querySelector('form select') as HTMLSelectElement)?.value !== 'lead');
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('#deal-note');
    assert.ok((await visibleText()).includes(`Kalıcı not ${width}`));
    assert.equal(await page.$eval('#detail-stage', el => (el as HTMLSelectElement).value), width === 1440 ? 'won' : 'lost');
    await clickText('Analiz et');
    await page.waitForFunction(() => document.body.innerText.includes('Analiz yapılamadı. Mevcut analiz değiştirilmedi.'));
    assert.ok((await visibleText()).includes('Önceki kayıtlı analiz'));
    assert.ok(!(await visibleText()).includes('Analiz güncellendi.'));
    await snapshot(`deal-${width}`);
    rejectWrite = true;
    await page.type('#deal-note', 'Kaydedilmemeli');
    await clickText('Not ekle');
    await page.waitForFunction(() => document.body.innerText.includes('İşlem tamamlanamadı.'));
    assert.ok(!activities.some(activity => activity.description === 'Kaydedilmemeli'));
    rejectWrite = false;
    for (const mode of ['zero', 'null', 'near']) {
      billingMode = mode;
      await page.goto(`${base}/app/billing`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('section[aria-label="Teklif"]');
      const text = await visibleText();
      assert.doesNotMatch(text, /NaN|Infinity|YÜKSELT/);
      assert.ok(text.includes('Online ödeme ve otomatik abonelik bağlı değil'));
      assert.ok(text.includes(mode === 'zero' ? 'Kota doldu.' : mode === 'null' ? 'Kullanım izni yok.' : '%80 seviyesinde'));
      assert.equal(await page.$$eval('section[aria-label="AI üretimi"] [role="status"]', items => items.length), 0);
      const percentages = await page.$$eval('progress', items => items.map(item => item.value));
      assert.ok(percentages.every(value => Number.isFinite(value) && value >= 0 && value <= 100));
      await snapshot(`billing-${mode}-${width}`);
    }
  }
  unavailable = true;
  for (const path of ['/app/crm', `/app/crm/deals/${dealId}`, '/app/billing']) {
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[role="alert"]');
    assert.ok(!(await visibleText()).includes('Bu aşamada fırsat yok.'));
  }
  unavailable = false; role = 'viewer';
  await page.goto(`${base}/app/crm`, { waitUntil: 'networkidle0' });
  await page.waitForSelector(`a[href="/app/crm/deals/${dealId}"]`);
  assert.equal(await page.$('button[aria-label="Lead: fırsat ekle"]'), null);
  await page.goto(`${base}/app/crm/deals/${dealId}`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.body.innerText.includes('Aktivite geçmişi'));
  assert.equal(await page.$('#deal-note'), null);
  assert.equal(await page.$('#detail-stage'), null);
  assert.deepEqual(missingAuth, []);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, database: 'not used; isolated API contract fixtures', viewports: [1440, 390], createNoteStageReload: true, aiFailurePreservesAnalysis: true, billingZeroNullEnforced: true, viewerReadOnly: true, screenshots: output }));
} finally {
  await browser?.close();
  await vite.close();
}
