import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import {createServer} from 'vite';
const vite=await createServer({server:{port:0,host:'127.0.0.1',hmr:false},appType:'spa'});
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
try {
 await vite.listen(); const addr=vite.httpServer!.address(); assert.ok(addr && typeof addr==='object');
 browser=await puppeteer.launch({headless:true, executablePath:process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}); const page=await browser.newPage(); page.setDefaultTimeout(5000);
 let mode='valid'; let listMode='valid'; let requested=0;
 await page.evaluateOnNewDocument(()=>localStorage.setItem('bm_authed','1'));
 await page.setRequestInterception(true);
 page.on('request', req=>{ const url=new URL(req.url()); if(!url.pathname.startsWith('/api/')) {void req.continue();return;}
 const respond=(body:unknown,status=200)=>req.respond({status,contentType:'application/json',body:JSON.stringify(body)});
 if(url.pathname==='/api/auth/me') { void respond({user:{id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.test',fullName:'Test',emailVerified:'2026-10-11'},company:{id:'11111111-1111-4111-8111-111111111111',name:'Fixture'},role:'owner',accountType:'workspace'});return;}
 if(url.pathname==='/api/market-intelligence/supplier-quotes') { if(listMode==='error') { void respond({error:'fail'},503); return; } if(listMode==='invalid') { void respond({unexpected:true}); return; } if(listMode==='nestedInvalid') { void respond([{id:'test',supplierName:'Test',documentId:null,sourceDocumentIdentifier:'TEST',quoteNumber:null,region:null,deliveryTerms:null,status:'draft',confidence:'0.5',entries:[null]}]); return; } if(listMode==='populated') { void respond([{id:'test',supplierName:'Deneme tedarikçi',documentId:null,sourceDocumentIdentifier:'TEST',quoteNumber:null,region:null,deliveryTerms:null,status:'draft',confidence:'0.5',entries:[]}]); return; } void respond([]); return; }
 if(url.pathname==='/api/market-intelligence/price-memory') { assert.ok(url.searchParams.get('positionCode')); assert.ok(url.searchParams.get('unit')); requested++; if(mode==='error') {void respond({error:'fail'},503);return;} void respond({summary: mode==='empty'?{count:0,median:null,min:null,max:null}:{count:3,median:0,min:0,max:50}});return; }
 void respond([]);
 });
 for(const width of [1440,320]) {
 await page.setViewport({width,height:900}); mode='valid'; listMode='error'; await page.goto(`http://127.0.0.1:${addr.port}/app/market-intelligence`,{waitUntil:'networkidle0'});
 await page.waitForFunction(()=>document.body.innerText.toLocaleLowerCase('tr').includes('firma fiyat hafızası'), {timeout:5000}).catch(async e=>{console.log('PAGE',await page.evaluate(()=>document.body.innerText)); throw e;}); const button=await page.$('button'); assert.ok(button);
 await page.waitForFunction(()=>document.body.innerText.includes('Tedarikçi teklifleri yüklenemedi'),{timeout:3000});
 assert.equal(await page.evaluate(()=>document.body.innerText.includes('Henüz tedarikçi teklifi yok')),false);
 listMode='invalid'; await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent?.includes('Tekrar dene'))?.click()); await page.waitForFunction(()=>document.body.innerText.includes('Tedarikçi teklifleri yüklenemedi'));
 listMode='nestedInvalid'; await Promise.all([page.waitForResponse(response=>response.url().includes('/api/market-intelligence/supplier-quotes')), page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent?.includes('Tekrar dene'))?.click())]); await page.waitForFunction(()=>document.body.innerText.includes('Tedarikçi teklifleri yüklenemedi'));
 listMode='populated'; await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent?.includes('Tekrar dene'))?.click()); await page.waitForFunction(()=>document.body.innerText.includes('Deneme tedarikçi'));
 listMode='error'; await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent?.trim()==='Yenile')?.click()); await page.waitForFunction(()=>document.body.innerText.includes('Gösterilen kayıtlar güncel olmayabilir'));
 assert.ok((await page.evaluate(()=>document.body.innerText)).includes('Deneme tedarikçi'));
 listMode='valid'; await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent?.includes('Tekrar dene'))?.click()); await page.waitForFunction(()=>document.body.innerText.includes('Henüz tedarikçi teklifi yok'));
 assert.equal(await page.evaluate(()=>document.body.innerText.toLocaleLowerCase('tr').includes('medyan')),false); assert.equal(requested,0);
 await page.locator('input').wait(); const position=await page.$('label input'); assert.ok(position);
 const inputs=await page.$$('label input'); assert.ok(inputs.length>=3); await inputs[0].type('M-001'); await inputs[1].type('adet');
 const compare = await page.$('button:not([disabled])'); assert.ok(compare); await inputs[1].press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.body.innerText.toLocaleLowerCase('tr').includes('medyan')); assert.ok((await page.evaluate(()=>document.body.innerText)).includes('0 ₺'));
 mode='empty'; await inputs[0].focus(); await page.keyboard.down('Meta'); await page.keyboard.press('A'); await page.keyboard.up('Meta'); await inputs[0].type('M-002'); await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent?.includes('Fiyatları karşılaştır'))?.click()); await page.waitForFunction(()=>document.body.innerText.includes('Bu kapsamda onaylı fiyat kaydı bulunamadı'));
 mode='error'; await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent?.includes('Fiyatları karşılaştır'))?.click()); await page.waitForSelector('[role=alert]');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 requested=0;
 }
 console.log('PASS local synthetic market UI: desktop/320px, scoped request, zero, empty, error');
} finally {await browser?.close();await vite.close();}
