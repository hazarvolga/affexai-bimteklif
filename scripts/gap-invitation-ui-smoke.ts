import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import dotenv from 'dotenv';
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
  AUTH_EMAIL_WEBHOOK_URL: '',
  NODE_ENV: 'test',
});
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
let server: ReturnType<typeof createServer> | undefined;
let vite: Awaited<ReturnType<typeof createViteServer>> | undefined;
let database: typeof import('../src/db').db | undefined;
const output = '/tmp/teklifpro-gap-ui';
try {
  const [{ createApiApp }, { db }, schema, { AuthService }] = await Promise.all([
    import('../src/server/app'), import('../src/db'), import('../src/db/schema'),
    import('../src/services/auth/authService'),
  ]);
  database = db;
  const [company] = await db.insert(schema.companies).values({ name: 'Isolated UI Test' }).returning();
  const [owner] = await db.insert(schema.users).values({ email: 'owner@example.test', fullName: 'Test Owner', emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values({ userId: owner.id, companyId: company.id, role: 'owner' });
  const ownerToken = AuthService.generateToken({ userId: owner.id, companyId: company.id, role: 'owner' });
  const app = createApiApp();
  vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' });
  app.use(vite.middlewares);
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  process.env.PUBLIC_APP_URL = base;
  browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await mkdir(output, { recursive: true });
  const invite = async (email: string, token = ownerToken, role = 'viewer') => {
    const response = await fetch(`${base}/api/invitations`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    assert.ok(response.ok, `Invitation issuance failed: ${response.status}`);
    const result = await response.json();
    assert.equal(result.delivery.status, 'development');
    return result.delivery.devInvitationUrl as string;
  };
  const password = 'Isolated-fixture-pass-123';
  // Browser sessions are HttpOnly cookies set by the server; the smoke test installs the same cookies and the non-secret UI hint.
  const signIn = async (token: string, options: { admin?: boolean } = {}) => {
    const host = new URL(base).hostname;
    const cookies = [{ name: 'bm_session', value: token, domain: host, path: '/api', httpOnly: true, sameSite: 'Strict' as const }];
    if (options.admin) cookies.push({ name: 'bm_admin', value: token, domain: host, path: '/api', httpOnly: true, sameSite: 'Strict' as const });
    await page.setCookie(...cookies);
    await page.evaluate(() => localStorage.setItem('bm_authed', '1'));
  };
  for (const width of [1440, 390]) {
    const email = `new-${width}@example.test`;
    await page.setViewport({ width, height: 900 });
    await page.goto(await invite(email), { waitUntil: 'networkidle0' });
    await page.waitForSelector('#invite-name');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `${output}/invite-${width}.png`, fullPage: true });
    await page.type('#invite-name', 'Test Member');
    await page.type('#invite-password', password);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => document.body.innerText.includes('Kayıt Alındı!'));
    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
    });
    assert.equal(login.status, 200);
    await page.screenshot({ path: `${output}/accepted-${width}.png`, fullPage: true });
  }
  await page.goto(await invite('new-1440@example.test'), { waitUntil: 'networkidle0' });
  await page.waitForSelector('#invite-password');
  assert.equal(await page.$('#invite-name'), null);
  await page.type('#invite-password', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.body.innerText.includes('Kayıt Alındı!'));
  const [secondCompany] = await db.insert(schema.companies).values({ name: 'Invited Company B' }).returning();
  await db.insert(schema.memberships).values({ userId: owner.id, companyId: secondCompany.id, role: 'owner' });
  const secondOwnerToken = AuthService.generateToken({ userId: owner.id, companyId: secondCompany.id, role: 'owner' });
  await page.goto(await invite('new-1440@example.test', secondOwnerToken, 'manager'), { waitUntil: 'networkidle0' });
  await page.waitForSelector('#invite-password');
  await page.type('#invite-password', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.body.innerText.includes('Kayıt Alındı!'));
  const profile = () => page.evaluate(async () => {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
    return response.json();
  });
  assert.equal((await profile()).company.id, secondCompany.id);
  assert.equal((await profile()).role, 'manager');
  // P1-5: the session must not be readable by page scripts (no token in storage, cookies are HttpOnly).
  const exposed = await page.evaluate(() => ({ storage: Object.keys(localStorage).filter(key => /token|session_backup/i.test(key)), cookie: document.cookie }));
  assert.deepEqual(exposed.storage, []);
  assert.equal(/bm_(session|admin)/.test(exposed.cookie), false);
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${base}/app`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal((await profile()).company.id, secondCompany.id);
  assert.equal((await profile()).role, 'manager');
  await page.waitForFunction(() => document.body.innerText.includes('Invited Company B'));
  await signIn(ownerToken);
  await page.goto(`${base}/app/settings`, { waitUntil: 'networkidle0' });
  await page.$$eval('[role="tab"]', tabs => (tabs.find(tab => tab.textContent?.includes('EKİP')) as HTMLElement).click());
  await page.waitForSelector('input[aria-label="Davet e-posta adresi"]');
  await page.type('input[aria-label="Davet e-posta adresi"]', 'settings-invite@example.test');
  await page.select('select[aria-label="Davet rolü"]', 'manager');
  await page.click('form button[type="submit"]');
  await page.waitForFunction(() => document.body.innerText.includes('e-posta gönderilmedi'));
  const link = await page.$eval('[role="status"] a', element => (element as HTMLAnchorElement).href);
  assert.ok(link.startsWith(`${base}/accept-invite/`));
  await page.screenshot({ path: `${output}/settings-invitation.png`, fullPage: true });
  if (process.env.GAP_ADMIN_SMOKE === 'true') {
    const [admin] = await db.insert(schema.users).values({ email: 'ui-admin@example.test', fullName: 'UI Admin', emailVerified: new Date(), isSuperAdmin: true }).returning();
    const [plan] = await db.insert(schema.plans).values({ name: 'Zero Limit', monthlyQuoteLimit: 0, monthlyPrice: 0 }).returning();
    const adminToken = AuthService.generateToken({ userId: admin.id, companyId: null, role: null });
    await signIn(adminToken, { admin: true });
    await page.goto(`${base}/admin/tenants`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Firmalar (Tenants)'));
    await page.$$eval('tr', rows => {
      const row = rows.find(candidate => candidate.textContent?.includes('Isolated UI Test'));
      const editButton = Array.from(row?.querySelectorAll('button') ?? [])
        .find(button => button.textContent?.trim() === 'Hızlı Düzenle');
      if (!editButton) throw new Error('Tenant quick-edit button not found');
      editButton.click();
    });
    await page.waitForFunction(() => document.body.innerText.includes('Isolated UI Test Yönetimi'));
    await page.waitForSelector('select');
    const selects = await page.$$('select');
    await selects[0].select(plan.id);
    await selects[1].select('past_due');
    await page.$$eval('button', buttons => buttons.find(button => button.textContent?.includes('Değişiklikleri Kaydet'))!.click());
    await page.waitForFunction(() => !document.body.innerText.includes('Isolated UI Test Yönetimi'));
    const { eq } = await import('drizzle-orm');
    const saved = await db.query.subscriptions.findFirst({ where: eq(schema.subscriptions.companyId, company.id) });
    assert.equal(saved?.planId, plan.id);
    assert.equal(saved?.status, 'past_due');
    assert.equal(saved?.bonusQuoteLimit, 0);
    await page.screenshot({ path: `${output}/admin-tenants.png`, fullPage: true });
    await page.setViewport({ width: 390, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'admin viewport must not overflow');
    assert.ok(await page.$eval('main', main => main.getBoundingClientRect().width) >= 374, 'mobile admin content must use the viewport');
    await page.screenshot({ path: `${output}/admin-tenants-mobile.png`, fullPage: true });
    const menuTrigger = 'button[aria-label="Yönetim menüsü"]';
    await page.focus(menuTrigger);
    await page.keyboard.press('Enter');
    await page.waitForSelector('[role="dialog"]', { visible: true });
    await page.waitForFunction(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
    for (let index = 0; index < 10; index++) {
      await page.keyboard.press('Tab');
      await page.waitForFunction(() => Boolean(document.activeElement?.closest('[role="dialog"]')), { timeout: 2000 });
    }
    await page.keyboard.down('Shift');
    for (let index = 0; index < 10; index++) {
      await page.keyboard.press('Tab');
      await page.waitForFunction(() => Boolean(document.activeElement?.closest('[role="dialog"]')), { timeout: 2000 });
    }
    await page.keyboard.up('Shift');
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog && !dialog.hasAttribute('data-starting-style') && getComputedStyle(dialog).opacity === '1';
    });
    await page.$eval('[role="dialog"]', async dialog => {
      await Promise.all(dialog.getAnimations().map(animation => animation.finished));
    });
    await page.screenshot({ path: `${output}/admin-drawer-mobile.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="dialog"]', { hidden: true });
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Yönetim menüsü');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[role="dialog"] nav a[href="/admin/plans"]', { visible: true });
    await page.click('[role="dialog"] nav a[href="/admin/plans"]');
    await page.waitForFunction(() => location.pathname === '/admin/plans');
    await page.waitForSelector('[role="dialog"]', { hidden: true });
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Yönetim menüsü');
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, viewports: [1440, 390], newAccountLogin: true, existingAccountAcceptance: true, invitedTenantAfterReload: true, settingsDeliveryState: true, adminDrawer: process.env.GAP_ADMIN_SMOKE === 'true', screenshots: output }));
} finally {
  try { await browser?.close(); } finally {
    try {
      if (server) await new Promise<void>(resolve => { server!.close(() => resolve()); server!.closeAllConnections(); });
      await vite?.close();
    } finally {
      try {
        await import('../src/db/control-plane').then(({ closeControlDatabase }) => closeControlDatabase());
        await database?.$client.end();
      } finally { await isolation.cleanup(); }
    }
  }
}
