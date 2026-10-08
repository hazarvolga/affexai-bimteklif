import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
import { createServer as createViteServer } from 'vite';
import { createTestIsolation } from '../src/server/routes/test-isolation';

dotenv.config({ path: '.env.local', quiet: true });
const isolation = await createTestIsolation(process.env.DATABASE_URL!);
Object.assign(process.env, {
  DATABASE_URL: isolation.databaseUrl,
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
    const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    return response.json();
  });
  assert.equal((await profile()).company.id, secondCompany.id);
  assert.equal((await profile()).role, 'manager');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${base}/app`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal((await profile()).company.id, secondCompany.id);
  assert.equal((await profile()).role, 'manager');
  await page.waitForFunction(() => document.body.innerText.includes('Invited Company B'));
  await page.evaluate(token => localStorage.setItem('token', token), ownerToken);
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
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, viewports: [1440, 390], newAccountLogin: true, existingAccountAcceptance: true, invitedTenantAfterReload: true, settingsDeliveryState: true, screenshots: output }));
} finally {
  try { await browser?.close(); } finally {
    try {
      if (server) await new Promise<void>(resolve => { server!.close(() => resolve()); server!.closeAllConnections(); });
      await vite?.close();
    } finally {
      try { await database?.$client.end(); } finally { await isolation.cleanup(); }
    }
  }
}
