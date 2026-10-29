import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';
const vite = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false }, appType: 'spa' });
const clientId='11111111-1111-4111-8111-111111111111';
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
try {
 await vite.listen(); const address=vite.httpServer!.address(); assert.ok(address && typeof address==='object');
 browser=await puppeteer.launch({headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH,args:['--no-sandbox']});
 const page=await browser.newPage(); const errors:string[]=[]; let role='owner', status='active'; const actions:string[]=[];
 page.on('pageerror',e=>errors.push(String(e))); page.on('dialog',d=>void d.accept());
 await page.evaluateOnNewDocument(()=>localStorage.setItem('bm_authed','1'));
 await page.setRequestInterception(true);
 page.on('request',req=>{
   const url=new URL(req.url()); if(!url.pathname.startsWith('/api/')) { void req.continue(); return; }
   const respond=(body:unknown,code=200)=>req.respond({status:code,contentType:'application/json',body:JSON.stringify(body)});
   if(url.pathname==='/api/auth/me') { void respond({user:{id:clientId,email:'fixture@example.test',fullName:'Test',emailVerified:'2026-10-11'},company:{id:clientId,name:'Test',defaultCurrency:'TRY'},role,accountType:'workspace'}); return; }
   if(url.pathname===`/api/clients/${clientId}`) { void respond({id:clientId,name:status==='masked'?'Maskelenmiş müşteri':'Örnek',type:'company',createdAt:'2026-10-01',pipelineStage:'lead',deals:[],quotations:[],privacyStatus:status}); return; }
   if(url.pathname===`/api/clients/${clientId}/privacy`) {
     if(req.method()==='POST') { const action=JSON.parse(req.postData()||'{}').action; actions.push(action); status=({request:'requested',hold:'hold',release:'requested',mask:'masked'} as Record<string,string>)[action]; }
     void respond({status}); return;
   }
   void respond([]);
 });
 await page.setViewport({width:390,height:844}); await page.goto(`http://127.0.0.1:${address.port}/app/clients/${clientId}`,{waitUntil:'networkidle0'});
 await page.waitForSelector('[data-testid="client-privacy-control"]');
 const text=await page.$eval('[data-testid="client-privacy-control"]',el=>el.textContent||'');
 assert.match(text,/önce indirilen PDF/); assert.match(text,/aynı kişiye ait bilgiler yeni bir kayıt/);
 assert.ok(await page.$eval('[data-testid="client-privacy-control"]',el=>el.scrollWidth<=el.clientWidth));
 for(const [button,expected] of [['İnceleme başlat','İnceleme bekliyor'],['Beklemeye al','Beklemeye alındı'],['Beklemeyi kaldır','İnceleme bekliyor'],['Kimlik alanlarını maskele','Kimlik alanları maskelendi']] as const) {
   const b=await page.waitForSelector(`button ::-p-text(${button})`); assert.ok(b); await b.click();
   await page.waitForFunction((expected)=>document.querySelector('[data-testid="client-privacy-control"]')?.textContent?.includes(expected),{},expected);
 }
 assert.deepEqual(actions,['request','hold','release','mask']);
 role='viewer'; await page.reload({waitUntil:'networkidle0'}); assert.equal(await page.$('[data-testid="client-privacy-control"]'),null);
 assert.deepEqual(errors,[]); console.log('PASS mobile owner request, hold, release, masking and viewer hidden (mock API)');
} finally { await browser?.close(); await vite.close(); }
