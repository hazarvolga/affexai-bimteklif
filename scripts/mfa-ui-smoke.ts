import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';

// All API responses are synthetic; the browser never contacts a real account.
const vite = await createServer({ server: { port: 0, host: '127.0.0.1', hmr: false }, appType: 'spa' });
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
try {
  await vite.listen();
  const addr = vite.httpServer!.address(); assert.ok(addr && typeof addr === 'object');
  const base = `http://127.0.0.1:${addr.port}`;
  browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH });
  const page = await browser.newPage();
  const errors: string[] = []; page.on('pageerror', error => errors.push(String(error)));
  let verified = false; let enabled = false; let enrollmentAttempts = 0; let requireMfa = true;
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'admin@example.test', fullName: 'Test Admin', isSuperAdmin: true, emailVerified: '2026-10-11' };
  const session = { user, company: { id: '11111111-1111-4111-8111-111111111111', name: 'UI fixture' }, role: 'owner', accountType: 'workspace' };
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) { void request.continue(); return; }
    const respond = (body: unknown, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/auth/login') { if (requireMfa) { void respond({ mfaRequired: true, challenge: 'synthetic-challenge' }, 202); } else { verified = true; void respond({ ...session, user: { ...user, isSuperAdmin: false } }); } return; }
    if (url.pathname === '/api/auth/mfa/verify') {
      const body = JSON.parse(request.postData() ?? '{}');
      assert.equal(body.challenge, 'synthetic-challenge');
      if (body.code !== 'RECOVERY-ONE') { void respond({ error: 'Kod geçersiz.' }, 401); return; }
      verified = true; void respond(session); return;
    }
    if (url.pathname === '/api/auth/me') { void respond(verified ? session : { error: 'Unauthorized' }, verified ? 200 : 401); return; }
    if (url.pathname === '/api/auth/mfa/status') { void respond({ enabled }); return; }
    if (url.pathname === '/api/auth/mfa/enroll/start') { enrollmentAttempts++; if (enrollmentAttempts === 1) { void respond({ error: 'Şifre geçersiz.' }, 401); return; } void respond({ secret: 'SYNTHETIC-SECRET', otpauthUrl: 'otpauth://totp/example', recoveryCodes: ['RECOVERY-ONE', 'RECOVERY-TWO', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'] }); return; }
    if (url.pathname === '/api/auth/mfa/enroll/confirm') { assert.equal(JSON.parse(request.postData() ?? '{}').recoverySaved, true); enabled = true; void respond({ success: true }); return; }
    void respond([]);
  });
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${base}/login`, { waitUntil: 'networkidle0' });
  await page.type('#login-email', 'admin@example.test'); await page.type('#login-password', 'test-password');
  await page.click('button[type=submit]');
  await page.waitForSelector('#login-mfa-code');
  assert.equal(await page.evaluate(() => localStorage.getItem('bm_authed')), null, 'challenge alone must not start a session');
  await page.type('#login-mfa-code', 'BAD'); await page.click('button[type=submit]');
  await page.waitForFunction(() => document.body.innerText.includes('Kod geçersiz.'));
  await page.$eval('#login-mfa-code', input => (input as HTMLInputElement).select()); await page.keyboard.press('Backspace'); await page.type('#login-mfa-code', 'RECOVERY-ONE');
  await page.click('button[type=submit]'); await page.waitForFunction(() => location.pathname === '/admin');
  assert.equal(await page.evaluate(() => localStorage.getItem('bm_authed')), '1');
  await page.goto(`${base}/admin/security`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#mfa-password'); await page.type('#mfa-password', 'test-password'); await page.click('[data-testid="mfa-start"]');
  await page.waitForFunction(() => document.body.innerText.includes('Şifre geçersiz.'));
  assert.equal(new URL(page.url()).pathname, '/admin/security', 'wrong setup password must not end the session');
  await page.click('[data-testid="mfa-start"]');
  await page.waitForFunction(() => document.body.innerText.includes('SYNTHETIC-SECRET'));
  await page.waitForFunction(() => document.body.innerText.includes('RECOVERY-TWO'));
  assert.equal(await page.$eval('[data-testid="mfa-confirm"]', button => (button as HTMLButtonElement).disabled), true, 'activation must await recovery-code acknowledgement');
  await page.type('#mfa-enroll-code', '123456'); await page.click('#mfa-recovery-saved'); await page.click('[data-testid="mfa-confirm"]');
  await page.waitForFunction(() => document.body.innerText.includes('İki aşamalı doğrulama etkin'));
  assert.equal(enabled, true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'mobile page should not overflow');
  requireMfa = false; await page.evaluate(() => localStorage.removeItem('bm_authed'));
  await page.goto(`${base}/login`, { waitUntil: 'networkidle0' });
  await page.type('#login-email', 'admin@example.test'); await page.type('#login-password', 'test-password'); await page.click('button[type=submit]');
  await page.waitForFunction(() => location.pathname === '/app');
  assert.equal(await page.evaluate(() => localStorage.getItem('bm_authed')), '1', 'ordinary tenant login remains available');
  assert.deepEqual(errors, []);
  console.log('PASS MFA challenge, invalid code, recovery login, enrollment, ordinary login and 390px layout');
} finally { await browser?.close(); await vite.close(); }
