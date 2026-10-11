import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';
import { canonicalPlans } from '../src/services/billing/plan-catalog';

// Rendered UI contracts; data is intercepted and never written to any database.
const vite = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false }, appType: 'spa' });
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
try {
 await vite.listen();
 const addr = vite.httpServer!.address();
 assert.ok(addr && typeof addr === 'object');
 const base = `http://127.0.0.1:${addr.port}`;
 browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH });
 const page = await browser.newPage();
 const errors: string[] = [];
 let mode = 'empty';
 page.on('pageerror', error => errors.push(String(error)));
 await page.evaluateOnNewDocument(() => localStorage.setItem('token', 'isolated-admin-ui-fixture'));
 await page.setRequestInterception(true);
 page.on('request', request => {
  const url = new URL(request.url());
  if (!url.pathname.startsWith('/api/')) { void request.continue(); return; }
  const respond = (body: unknown, status = 200) => request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
  if (url.pathname === '/api/auth/me') { void respond({user:{id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.test',fullName:'Test Admin',isSuperAdmin:true,emailVerified:'2026-10-11'},company:{id:'11111111-1111-4111-8111-111111111111',name:'UI fixture'},role:'owner',accountType:'workspace'}); return; }
  if (mode === 'error') { void respond({error:'unavailable'},503); return; }
  if (url.pathname === '/api/admin/plans') { void respond(mode === 'empty' ? [] : canonicalPlans); return; }
  if (url.pathname === '/api/admin/dashboard') { void respond({totalTenants:1,statusCounts:{active:1},totalMRR:390,totalQuotesThisMonth:3,totalIfcThisMonth:2,planDistribution:[],queueStats:{queued:7,running:2,failed24h:1,succeeded24h:3}}); return; }
  void respond([]);
 });
 await mkdir('/tmp/bimmetraj-admin-ui', {recursive:true});
 for (const width of [1440,390]) {
  await page.setViewport({width,height:900});
  mode='empty';
  await page.goto(`${base}/admin/plans`,{waitUntil:'networkidle0'});
  await page.waitForFunction(() => document.body.innerText.includes('Henüz paket tanımlanmamış'));
  mode='error';
  await page.reload({waitUntil:'networkidle0'});
  await page.waitForSelector('[role="alert"]');
  assert.ok(!(await page.evaluate(() => document.body.innerText)).includes('Henüz paket tanımlanmamış'));
  mode='populated';
  await page.click('[role="alert"] button');
  await page.waitForFunction(() => document.body.innerText.includes('Kurumsal Taahhüt'));
  await page.screenshot({path:`/tmp/bimmetraj-admin-ui/plans-${width}.png`,fullPage:true});
  await page.goto(`${base}/admin`,{waitUntil:'networkidle0'});
  await page.waitForFunction(() => document.body.innerText.includes('Bekleyen: 7'));
  mode='error';
  await page.reload({waitUntil:'networkidle0'});
  await page.waitForSelector('[role="alert"]');
  assert.ok(!(await page.evaluate(() => document.body.innerText)).includes('₺0'));
  await page.screenshot({path:`/tmp/bimmetraj-admin-ui/dashboard-error-${width}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);
 console.log('PASS admin plans empty/error/retry/catalog and dashboard queue/error at desktop/mobile');
} finally { await browser?.close(); await vite.close(); }
