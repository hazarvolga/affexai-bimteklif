import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';

const vite = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false }, appType: 'spa' });
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
try {
  await vite.listen(); const address = vite.httpServer!.address(); assert.ok(address && typeof address === 'object');
  browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  let clientStatus = 500, leadStatus = 500;
  let raceMode = false, pipelineRequests = 0, postRequests = 0;
  await page.evaluateOnNewDocument(() => localStorage.setItem('bm_authed', '1'));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url()); if (!url.pathname.startsWith('/api/')) { void request.continue(); return; }
    let body: unknown = []; let status = 200;
    if (url.pathname === '/api/auth/me') body = { user: { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.test', fullName: 'Test', emailVerified: '2026-10-11' }, company: { id: '22222222-2222-4222-8222-222222222222', name: 'Fixture' }, role: 'owner', accountType: 'workspace' };
    if (url.pathname === '/api/crm/pipeline') {
      body = [{ id: 'd1', name: raceMode ? (++pipelineRequests === 1 ? 'Eski firma fırsatı' : 'Yeni firma fırsatı') : 'Bağımsız fırsat', stage: 'lead', value: '100', aiInsights: null }];
      if (raceMode && pipelineRequests === 1) { setTimeout(() => void request.respond({ status: 401, contentType: 'application/json', body: '{}' }).catch(() => {}), 1200); return; }
    }
    if (url.pathname === '/api/crm/leads') status = leadStatus;
    if (url.pathname === '/api/clients') {
      if (request.method() === 'POST') { postRequests++; setTimeout(() => void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'stale-client', name: 'Eski firma müşterisi' }) }).catch(() => {}), 1200); return; }
      status = clientStatus;
    }
    if (url.pathname === '/api/billing/usage-stats') body = { plan: 'unavailable' };
    void request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const base = `http://127.0.0.1:${address.port}`;
  for (const width of [1440, 390]) {
    clientStatus = 500; leadStatus = 500;
    await page.setViewport({ width, height: 900 });
    await page.goto(`${base}/app/crm`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Bağımsız fırsat'));
    assert.equal(await page.evaluate(() => document.body.innerText.includes('Müşteriler (0)')), false);
    await page.locator('button ::-p-text(Yeni fırsat)').click();
    await page.waitForFunction(() => document.body.innerText.includes('Fırsat oluşturmak için tekrar deneyin.'));
    assert.equal(await page.evaluate(() => document.body.innerText.includes('Müşteri kaydı bulunamadı.')), false);
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role=dialog]', { hidden: true });
    await page.locator('button[role=tab] ::-p-text(Lead havuzu)').click();
    await page.waitForFunction(() => document.body.innerText.includes('Lead kayıtları yüklenemedi.'));
    assert.ok(await page.evaluate(() => document.body.innerText.includes('Müşteriler yüklenemedi;')));
    assert.equal(await page.evaluate(() => document.body.innerText.includes('Henüz potansiyel müşteri yok.')), false);
    assert.equal(await page.evaluate(() => document.body.innerText.includes('Lead havuzu (0)')), false);
    leadStatus = 200; await page.locator('button ::-p-text(Lead kayıtlarını tekrar dene)').click();
    await page.waitForFunction(() => !document.body.innerText.includes('Lead kayıtları yüklenemedi.'));
    assert.equal(await page.evaluate(() => document.body.innerText.includes('Henüz potansiyel müşteri yok.')), false);
    clientStatus = 200; await page.locator('button ::-p-text(Müşterileri tekrar dene)').click();
    await page.waitForFunction(() => document.body.innerText.includes('Henüz potansiyel müşteri yok.'));
    assert.ok(await page.evaluate(() => document.body.innerText.includes('Lead havuzu (0)')));
  }
  raceMode = true; pipelineRequests = 0; clientStatus = 200; leadStatus = 200;
  await page.goto(`${base}/scripts/crm-partial-harness.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('[data-testid="switch-company"]') !== null);
  await page.waitForFunction(() => document.body.innerText.includes('Fırsatlar yükleniyor'));
  await page.locator('[data-testid="switch-company"]').click();
  await page.waitForFunction(() => document.body.innerText.includes('Yeni firma fırsatı'));
  await new Promise(resolve => setTimeout(resolve, 1400));
  assert.equal(await page.evaluate(() => document.body.innerText.includes('Eski firma fırsatı')), false);
  assert.equal(new URL(page.url()).pathname, '/scripts/crm-partial-harness.html', 'aborted old-company 401 must not log out new company');
  assert.equal(await page.evaluate(() => localStorage.getItem('bm_authed')), '1');
  raceMode = false;
  await page.goto(`${base}/scripts/crm-partial-harness.html`, { waitUntil: 'networkidle0' });
  await page.locator('button ::-p-text(Yeni fırsat)').click();
  await page.locator('button ::-p-text(Buradan Hızlı Müşteri Ekle)').click();
  await page.locator('#quick-client-name').fill('Eski firma müşterisi');
  await page.locator('button ::-p-text(Müşteriyi Kaydet)').click();
  await page.waitForFunction(() => document.body.innerText.includes('Ekleniyor'));
  assert.equal(postRequests, 1);
  await page.locator('[data-testid="switch-company"]').click();
  await page.waitForSelector('[role=dialog]', { hidden: true });
  await new Promise(resolve => setTimeout(resolve, 1400));
  assert.equal(await page.evaluate(() => document.body.innerText.includes('Eski firma müşterisi')), false);
  assert.equal(await page.evaluate(() => document.body.innerText.includes('Müşteri eklendi ve fırsat için seçildi.')), false);
  console.log('PASS CRM pipeline remains visible and partial failures, retries and verified empty states are distinct');
} finally { await browser?.close(); await vite.close(); }
