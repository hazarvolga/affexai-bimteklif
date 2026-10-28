import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import express from 'express';
import { useTestIsolation } from './test-isolation';
useTestIsolation();

test('suspended billing recovery is restricted by tenant role and CSRF; unverified super-admin and impersonation are denied', async () => {
  const [{ db }, schema, { AuthService }, { authenticate, checkSuperAdmin }, { registerBillingRoutes }, { eq }] = await Promise.all([import('../../db'), import('../../db/schema'), import('../../services/auth/authService'), import('../middleware/auth'), import('./billing'), import('drizzle-orm')]);
  const [company, other] = await db.insert(schema.companies).values([{ name: 'Suspended' }, { name: 'Other' }]).returning();
  const [owner, viewer, admin] = await db.insert(schema.users).values(['owner', 'viewer', 'admin'].map(name => ({ email: `${name}-${crypto.randomUUID()}@example.test`, fullName: name, emailVerified: name === 'admin' ? null : new Date(), isSuperAdmin: name === 'admin' }))).returning();
  await db.insert(schema.memberships).values([{ companyId: company.id, userId: owner.id, role: 'owner' }, { companyId: company.id, userId: viewer.id, role: 'viewer' }]);
  await db.insert(schema.subscriptions).values({ companyId: company.id, status: 'past_due', currentPeriodStart: new Date() });
  const [paidPlan] = await db.insert(schema.plans).values({ name: 'Paid', monthlyPrice: 1000, monthlyQuoteLimit: 5, isActive: true, isPublished: true }).returning();
  const app = express(); app.use(express.json());
  const handler = (_req: unknown, res: any) => res.json({ ok: true });
  registerBillingRoutes(app);
  app.post('/api/billing/payment-requests/other', authenticate, handler);
  app.get('/api/admin/probe', authenticate, checkSuperAdmin(), handler);
  app.post('/api/ordinary', authenticate, handler);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const makeToken = (userId: string, companyId: string | null, role: string) => AuthService.generateToken({ userId, companyId, role });
  const ownerToken = makeToken(owner.id, company.id, 'owner');
  const viewerToken = makeToken(viewer.id, company.id, 'viewer');
  const request = (path: string, token: string, method = 'POST') => fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, ...(method === 'POST' ? { body: JSON.stringify({ planId: paidPlan.id }) } : {}) });
  try {
    let orderId = '';
    for (const path of ['/api/billing/payment-requests/init', '/api/billing/payment-requests']) {
      const ownerResponse = await request(path, ownerToken);
      assert.equal(ownerResponse.status, path.endsWith('/init') ? 201 : 400);
      if (path.endsWith('/init')) orderId = (await ownerResponse.json() as { requestId: string }).requestId;
      assert.equal((await request(path, viewerToken)).status, 403);
      assert.equal((await request(path, makeToken(owner.id, other.id, 'owner'))).status, 403);
      assert.equal((await fetch(`${base}${path}`, { method: 'POST', headers: { Cookie: `bm_session=${ownerToken}`, Origin: 'https://attacker.example' } })).status, 403);
    }
    const notification = await fetch(`${base}/api/billing/payment-requests`, { method: 'POST', headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ requestId: orderId, planId: paidPlan.id, billingCycle: 'monthly', bankAccountId: null, senderName: 'Test owner', receiptNumber: 'TEST-RECEIPT-123' }) });
    assert.equal(notification.status, 201);
    assert.equal((await request('/api/billing/payment-requests/other', ownerToken)).status, 403);
    assert.equal((await request('/api/ordinary', ownerToken)).status, 403);
    assert.equal((await request('/api/admin/probe', makeToken(admin.id, null, ''), 'GET')).status, 403);
    const impersonation = AuthService.generateImpersonationToken({ userId: owner.id, companyId: company.id, impersonatedBy: admin.id });
    assert.equal((await request('/api/admin/probe', impersonation, 'GET')).status, 401);
    await db.update(schema.users).set({ emailVerified: new Date() }).where(eq(schema.users.id, admin.id));
    assert.equal((await request('/api/admin/probe', makeToken(admin.id, null, ''), 'GET')).status, 200);
    const writableImpersonation = AuthService.generateImpersonationToken({ userId: owner.id, companyId: company.id, impersonatedBy: admin.id, readOnly: false });
    assert.equal((await request('/api/billing/payment-requests/init', writableImpersonation)).status, 403);
    await db.update(schema.subscriptions).set({ status: 'canceled' }).where(eq(schema.subscriptions.companyId, company.id));
    assert.notEqual((await request('/api/billing/payment-requests/init', ownerToken)).status, 403);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('registration without trial or free plan fails without partial users or companies', async () => {
  const [{ db }, schema, { eq }, { registerAuthRoutes }] = await Promise.all([import('../../db'), import('../../db/schema'), import('drizzle-orm'), import('./auth')]);
  const app = express(); app.use(express.json()); registerAuthRoutes(app);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const email = `${crypto.randomUUID()}@example.test`, companyName = `no-plan-${crypto.randomUUID()}`;
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as any).port}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'test-password-123', fullName: 'Test User', companyName, termsAccepted: true, privacyAccepted: true }) });
    assert.equal(response.status, 503);
    assert.equal((await response.json() as { code?: string }).code, 'TRIAL_PLAN_UNAVAILABLE');
    assert.equal((await db.select().from(schema.users).where(eq(schema.users.email, email))).length, 0);
    assert.equal((await db.select().from(schema.companies).where(eq(schema.companies.name, companyName))).length, 0);
    const [trial] = await db.insert(schema.plans).values({ name: 'Trial available', monthlyPrice: 0, monthlyQuoteLimit: 5, isActive: true, isTrial: true }).returning();
    const registered = await fetch(`http://127.0.0.1:${(server.address() as any).port}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'test-password-123', fullName: 'Test User', companyName, termsAccepted: true, privacyAccepted: true }) });
    assert.equal(registered.status, 201);
    const registeredBody = await registered.json() as { company: { id: string } };
    const [subscription] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.companyId, registeredBody.company.id));
    assert.equal(subscription.planId, trial.id);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('login and me expose effective super-admin and expert authority only after email verification', async () => {
  const [{ db }, schema, { eq }, { registerAuthRoutes }, { AuthService }] = await Promise.all([import('../../db'), import('../../db/schema'), import('drizzle-orm'), import('./auth'), import('../../services/auth/authService')]);
  const email = `admin-${crypto.randomUUID()}@example.test`, password = 'admin-test-password';
  const [user] = await db.insert(schema.users).values({ email, fullName: 'Admin', passwordHash: await AuthService.hashPassword(password), isSuperAdmin: true, emailVerified: null }).returning();
  const app = express(); app.use(express.json()); registerAuthRoutes(app);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const login = async () => fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const unverified = await login(); assert.equal(unverified.status, 200);
    const body = await unverified.json() as { user: { isSuperAdmin: boolean; isExpertReviewer: boolean } };
    assert.equal(body.user.isSuperAdmin, false); assert.equal(body.user.isExpertReviewer, false);
    const token = AuthService.generateToken({ userId: user.id, companyId: null, role: null });
    const me = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const meBody = await me.json() as { user: { isSuperAdmin: boolean; isExpertReviewer: boolean } };
    assert.equal(meBody.user.isSuperAdmin, false); assert.equal(meBody.user.isExpertReviewer, false);
    await db.update(schema.users).set({ emailVerified: new Date() }).where(eq(schema.users.id, user.id));
    const verified = await login(); const verifiedBody = await verified.json() as { user: { isSuperAdmin: boolean; isExpertReviewer: boolean } };
    assert.equal(verifiedBody.user.isSuperAdmin, true); assert.equal(verifiedBody.user.isExpertReviewer, true);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
