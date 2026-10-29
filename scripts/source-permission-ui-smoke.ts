import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';

const vite=await createServer({server:{port:0,host:'127.0.0.1',hmr:false},appType:'spa'});
const id='11111111-1111-4111-8111-111111111111';
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
try {
  await vite.listen(); const address=vite.httpServer!.address(); assert.ok(address && typeof address==='object');
  const base=`http://127.0.0.1:${address.port}`;
  browser=await puppeteer.launch({headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH});
  const page=await browser.newPage(); const errors:string[]=[]; page.on('pageerror',error=>errors.push(String(error)));
  let role='owner'; let status='legacy_unverified'; let writes=0; let failReview=true;
  await page.evaluateOnNewDocument(()=>localStorage.setItem('bm_authed','1'));
  await page.setRequestInterception(true);
  page.on('request',request=>{
    const url=new URL(request.url()); if(!url.pathname.startsWith('/api/')) { void request.continue(); return; }
    const send=(body:unknown,code=200)=>request.respond({status:code,contentType:'application/json',body:JSON.stringify(body)});
    if(url.pathname==='/api/auth/me') { void send({user:{id,email:'fixture@example.test',fullName:'Test',emailVerified:'2026-10-01',isSuperAdmin:true},company:{id,name:'Test',defaultCurrency:'TRY'},role,accountType:'workspace'}); return; }
    if(url.pathname.endsWith('/permission-review')) {
      if(request.method()==='GET' && failReview) { failReview=false; void send({error:'unavailable'},503); return; }
      if(request.method()==='PATCH') { writes++; const body=JSON.parse(request.postData()??'{}'); status=body.action==='verify'?'verified':'revoked'; void send({success:true}); return; }
      void send({id,name:'Örnek kaynak',reviewStatus:status,reviewEvidenceReference:status==='verified'?'https://example.org/license':null,reviewScope:status==='verified'?'Ticari teklif':null,reviewAllowsQuotations:status==='verified',reviewedByUserId:status==='verified'?id:null,reviewedAt:status==='verified'?'2026-10-29T00:00:00Z':null}); return;
    }
    if(url.pathname==='/api/pricing/source-permission-reviews') { const second=url.searchParams.has('cursor'); const q=url.searchParams.get('q'); void send({items:[{id,name:second?'İkinci sayfa kaynağı':q?'Aranan kaynak':'Örnek kaynak',reviewStatus:'legacy_unverified'}],nextCursor:second||q?null:id}); return; }
    if(url.pathname==='/api/admin/pricing-sources') { void send([{id,name:'Örnek kaynak',code:'fixture',category:'market_commodity',sourceUrl:'https://example.org',status:'active',itemCount:1,versionTag:'1',syncFrequency:'monthly',pendingReviewCount:0}]); return; }
    if(url.pathname==='/api/market-intelligence/supplier-quotes' || url.pathname.endsWith('/staging') || url.pathname.endsWith('/official-catalogs')) { void send([]); return; }
    void send({});
  });
  await page.setViewport({width:390,height:844});
  await page.goto(`${base}/app/market-intelligence`,{waitUntil:'networkidle0'});
  await page.waitForSelector('[data-testid="source-permission-review"]');
  await (await page.waitForSelector('button ::-p-text(Sonraki)'))!.click();
  await page.waitForFunction(()=>document.body.textContent?.includes('İkinci sayfa kaynağı'));
  await (await page.waitForSelector('button ::-p-text(Önceki)'))!.click();
  await page.waitForFunction(()=>document.body.textContent?.includes('Örnek kaynak'));
  await page.type('#permission-source-search','aranan'); await (await page.waitForSelector('button ::-p-text(Ara)'))!.click();
  await page.waitForFunction(()=>document.body.textContent?.includes('Aranan kaynak'));
  await (await page.waitForSelector('button ::-p-text(Teklif kullanım iznini incele)'))!.click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="source-permission-review"]')?.textContent?.includes('İzin incelemesi yüklenemedi'));
  await (await page.waitForSelector('button ::-p-text(Yeniden yükle)'))!.click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="source-permission-review"]')?.textContent?.includes('İzin incelemesi bekliyor'));
  const panel=await page.$('[data-testid="source-permission-review"]'); assert.ok(panel);
  assert.equal(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await panel.$eval('input[type="url"]',(el:HTMLInputElement)=>{el.value='https://example.org/license';el.dispatchEvent(new Event('input',{bubbles:true}));});
  // React tracks native input setters; use real typing for reliable state transitions.
  const urlInput=await panel.$('input[type="url"]'); await urlInput!.click(); await page.keyboard.down('Meta'); await page.keyboard.press('A'); await page.keyboard.up('Meta'); await page.keyboard.press('Backspace'); await urlInput!.type('https://example.org/license');
  const scope=await panel.$('textarea'); await scope!.type('Ticari teklif'); await (await panel.$('input[type="checkbox"]'))!.click();
  await (await page.waitForSelector('button ::-p-text(İncelemeyi kaydet)'))!.click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="source-permission-review"]')?.textContent?.includes('Teklif kullanımı incelendi'));
  await (await page.waitForSelector('button ::-p-text(Teklif kullanım iznini iptal et)'))!.click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="source-permission-review"]')?.textContent?.includes('İzin iptal edildi'));
  assert.equal(writes,2);
  role='viewer'; await page.reload({waitUntil:'networkidle0'}); assert.equal(await page.$('[data-testid="source-permission-review"]'),null);
  role='owner'; await page.setViewport({width:1360,height:900}); await page.goto(`${base}/admin/pricing-sources`,{waitUntil:'networkidle0'});
  await page.waitForSelector('[data-testid="source-permission-review"]');
  await (await page.waitForSelector('button ::-p-text(Teklif kullanım iznini incele)'))!.click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="source-permission-review"]')?.textContent?.includes('İzin iptal edildi'));
  assert.deepEqual(errors,[]); console.log('source permission UI smoke passed: tenant mobile error/retry verify/revoke, viewer hidden, admin desktop');
} finally { await browser?.close(); await vite.close(); }
