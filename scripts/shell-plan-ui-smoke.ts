import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';
const vite = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false }, appType: 'spa' });
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
try {
  await vite.listen(); const address = vite.httpServer!.address(); assert.ok(address && typeof address === 'object');
  browser = await puppeteer.launch({headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, args:['--no-sandbox']});
  const page = await browser.newPage(); let response: {status:number; body:unknown} = {status:503,body:{error:'unavailable'}}; let delay = 0;
  await page.evaluateOnNewDocument(() => localStorage.setItem('bm_authed','1'));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url()); if (!url.pathname.startsWith('/api/')) { void request.continue(); return; }
    let body: unknown = []; let status = 200;
    if (url.pathname === '/api/auth/me') body = {user:{id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.test',fullName:'Test',emailVerified:'2026-10-11'},company:{id:'11111111-1111-4111-8111-111111111111',name:'Fixture'},role:'owner',accountType:'workspace'};
    if (url.pathname === '/api/billing/usage-stats') {body=response.body; status=response.status;}
    if (url.pathname === '/api/billing/usage-stats' && delay) { setTimeout(() => void request.respond({status,contentType:'application/json',body:JSON.stringify(body)}), delay); return; }
    void request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  const base = `http://127.0.0.1:${address.port}`;
  for (const width of [1440,390]) {
    await page.setViewport({width,height:900});
    await page.goto(`${base}/app/clients`, {waitUntil:'networkidle0'});
    if(width===390) await page.locator('button[aria-label="Menüyü aç"]').click();
    await page.waitForFunction(() => (document.body.textContent ?? "").includes('Paket bilgisi alınamadı'));
    assert.equal(await page.evaluate(() => document.querySelectorAll('#main-content').length),1);
    assert.ok(await page.evaluate(() => { const badge = [...document.querySelectorAll('[role=status]')].find(el => el.textContent?.includes('Paket bilgisi alınamadı')); return !!badge && badge.scrollWidth <= badge.clientWidth && badge.scrollHeight <= badge.clientHeight && getComputedStyle(badge).fontSize !== '10px'; }), 'plan status must be readable without clipping');
    assert.ok(!(await page.evaluate(() => document.body.textContent ?? "")).includes('14 Günlük Deneme'));
    if(width===390) await page.keyboard.press('Escape');
    await page.evaluate(() => { const link = [...document.querySelectorAll('a')].find(x => x.textContent?.trim() === 'İçeriğe geç'); (link as HTMLAnchorElement).focus(); });
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'main-content');
    assert.equal(new URL(page.url()).pathname,'/app/clients');
  }
  for (const width of [1440, 390]) {
    await page.setViewport({width,height:900});
    for (const path of ['/app/smartcheck/checks/demo', '/app/uzman-onizleme/yambis', '/app/uzman-onizleme/kat-karsiligi']) {
      await page.goto(`${base}${path}`, {waitUntil:'networkidle0'});
      assert.equal(await page.evaluate(() => document.querySelectorAll('#main-content').length), 1, path);
      assert.equal(await page.evaluate(() => document.querySelectorAll('main').length), 1, path);
      if (path.includes('uzman-onizleme')) { assert.equal(await page.$('[data-testid="expert-preview-notice"]'), null, path); assert.ok(!(await page.evaluate(() => document.body.textContent ?? '')).includes('YAYINDA DEĞİL'), path); }
      await page.evaluate(() => { const link = [...document.querySelectorAll('a')].find(x => x.textContent?.trim() === 'İçeriğe geç'); (link as HTMLAnchorElement).focus(); });
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'main-content', path);
      assert.equal(new URL(page.url()).pathname, path);
    }
  }
  for (const path of ['/hesaplayicilar/yambis-muteahhitlik-grubu', '/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum', '/smartcheck']) {
    await page.goto(`${base}${path}`, {waitUntil:'networkidle0'});
    assert.equal(await page.evaluate(() => document.querySelectorAll('#main-content').length), 1, path);
    assert.equal(await page.evaluate(() => document.querySelectorAll('main').length), 1, path);
    if (path.startsWith('/hesaplayicilar')) {
      await page.waitForSelector('[data-testid="calculator-disclaimer"]');
      await page.waitForSelector('link[rel="canonical"]');
      assert.equal(await page.$('[data-testid="expert-preview-notice"]'), null);
      assert.equal(await page.evaluate(() => new URL(document.querySelector<HTMLLinkElement>('link[rel=canonical]')!.href).pathname), path);
    }
  }
  response={status:200,body:{plan:'unavailable'}};
  await page.setViewport({width:1440,height:900}); await page.goto(`${base}/app/clients`, {waitUntil:'networkidle0'});
  await page.waitForFunction(() => (document.body.textContent ?? "").includes('Paket bilgisi bulunmuyor'));
  response={status:200,body:{plan:'Teknik Ofis'}}; await page.reload({waitUntil:'networkidle0'});
  await page.waitForFunction(() => (document.body.textContent ?? "").includes('Teknik Ofis'));
  response={status:200,body:{plan:'Firma A Planı'}}; await page.goto(`${base}/scripts/shell-plan-harness.html`, {waitUntil:'networkidle0'});
  await page.waitForFunction(() => (document.body.textContent ?? '').includes('Firma A Planı'));
  delay=800; response={status:200,body:{plan:'Firma B Planı'}}; await page.locator('[data-testid="switch-company"]').click();
  await page.waitForFunction(() => (document.body.textContent ?? '').includes('Paket bilgisi yükleniyor'));
  assert.ok(!(await page.evaluate(() => document.body.textContent ?? '')).includes('Firma A Planı'), 'previous company plan must disappear immediately');
  await page.waitForFunction(() => (document.body.textContent ?? '').includes('Firma B Planı'));
  response={status:200,body:{plan:'Eski Geciken Plan'}}; delay=1000;
  await page.goto(`${base}/scripts/shell-plan-harness.html`, {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => (document.body.textContent ?? '').includes('Paket bilgisi yükleniyor'));
  response={status:200,body:{plan:'Güncel Firma Planı'}}; delay=0; await page.locator('[data-testid="switch-company"]').click();
  await page.waitForFunction(() => (document.body.textContent ?? '').includes('Güncel Firma Planı'));
  await new Promise(resolve => setTimeout(resolve,1200));
  assert.ok(!(await page.evaluate(() => document.body.textContent ?? '')).includes('Eski Geciken Plan'), 'late response from old company must be ignored');
  console.log('PASS shell error/unknown/plan, tenant switch, stale response, skip focus at desktop/mobile');
} finally { await browser?.close(); await vite.close(); }
