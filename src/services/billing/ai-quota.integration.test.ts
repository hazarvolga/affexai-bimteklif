import assert from 'node:assert/strict';
import test from 'node:test';
import dotenv from 'dotenv';
import { and, eq, sql } from 'drizzle-orm';
import { useTestIsolation } from '../../server/routes/test-isolation';
dotenv.config({ path: '.env.local' });
useTestIsolation();

test('AI last monthly slot is atomic across concurrent requests in isolated PostgreSQL', async () => {
  const [{ db }, schema, { reserveAiUsage }] = await Promise.all([import('../../db'), import('../../db/schema'), import('./ai-quota')]);
  assert.match(String((await db.execute(sql`SELECT current_schema() AS schema`)).rows[0].schema), /^teklifpro_test_[a-f0-9]{32}$/);
  const [company] = await db.insert(schema.companies).values({ name: 'AI quota isolation' }).returning();
  const [user] = await db.insert(schema.users).values({ email: 'ai-quota@example.test', fullName: 'AI tester' }).returning();
  const now = new Date();
  await db.insert(schema.subscriptions).values({ companyId: company.id, plan: 'starter', currentPeriodStart: new Date('2020-01-01') });
  await db.insert(schema.usageLogs).values({ companyId: company.id, userId: user.id, feature: 'AI_QUOTATION_GENERATED', count: 19, date: now });
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => reserveAiUsage(company.id, user.id)));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  for (const result of results) if (result.status === 'rejected') assert.equal(result.reason.code, 'AI_QUOTA_EXCEEDED');
  const rows = await db.select().from(schema.usageLogs).where(and(eq(schema.usageLogs.companyId, company.id), eq(schema.usageLogs.feature, 'AI_QUOTATION_GENERATED')));
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 20);
  await db.update(schema.subscriptions).set({ status: 'canceled' }).where(eq(schema.subscriptions.companyId, company.id));
  await assert.rejects(reserveAiUsage(company.id, user.id), (error: any) => error.code === 'SUBSCRIPTION_INACTIVE');
});

test('AI HTTP validates before reservation and retains failed provider attempts without duplicate audit', async () => {
  const [{ db }, schema, { registerAiRoutes }, { AuthService }, expressModule] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('../../server/routes/ai'), import('../auth/authService'), import('express'),
  ]);
  const [company] = await db.insert(schema.companies).values({ name: 'AI HTTP test' }).returning();
  const [user] = await db.insert(schema.users).values({ email: 'ai-http@example.test', fullName: 'AI HTTP tester' }).returning();
  await db.insert(schema.memberships).values({ companyId: company.id, userId: user.id, role: 'owner' });
  await db.insert(schema.subscriptions).values({ companyId: company.id, currentPeriodStart: new Date('2020-01-01') });
  const app = expressModule.default();
  app.use(expressModule.default.json());
  let providerCalls = 0;
  registerAiRoutes(app, { generateQuotation: async () => { providerCalls++; return { lineItems: [] }; },
    improveQuotation: async () => { providerCalls++; throw new Error('provider unavailable'); },
  } as any, (_req: unknown, _res: unknown, next: () => void) => next());
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const token = AuthService.generateToken({ userId: user.id, companyId: company.id, role: 'owner' });
  const request = (path: string, body: unknown) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const count = async () => (await db.select().from(schema.usageLogs).where(eq(schema.usageLogs.companyId, company.id))).reduce((sum, row) => sum + row.count, 0);
  try {
    assert.equal((await request('/api/ai/generate-quotation', { description: '' })).status, 400);
    assert.equal(await count(), 0);
    assert.equal(providerCalls, 0);
    assert.equal((await request('/api/ai/generate-quotation', { description: 'test' })).status, 200);
    assert.equal((await request('/api/ai/improve-quotation', { items: [], instructions: 'test' })).status, 500);
    assert.equal(providerCalls, 2);
    assert.equal(await count(), 2);
    const report = await import('./usage-report').then(module => module.readBillingUsage(company.id));
    const ai = report.usage.find(row => row.feature === 'AI_QUOTATION_GENERATED');
    assert.equal(ai?.enforced, true);
    assert.equal(ai?.remaining, 18);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('CRM and regulation paid HTTP routes share the monthly AI budget', async () => {
  const [{ db }, schema, { registerCrmRoutes }, { registerRegulationRoutes }, { AuthService }, expressModule] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('../../server/routes/crm'), import('../../server/routes/regulations'), import('../auth/authService'), import('express'),
  ]);
  const [company] = await db.insert(schema.companies).values({ name: 'Shared AI budget' }).returning();
  const [user] = await db.insert(schema.users).values({ email: 'ai-shared@example.test', fullName: 'Shared AI' }).returning();
  await db.insert(schema.memberships).values({ companyId: company.id, userId: user.id, role: 'owner' });
  await db.insert(schema.subscriptions).values({ companyId: company.id, currentPeriodStart: new Date('2020-01-01') });
  const [client] = await db.insert(schema.clients).values({ companyId: company.id, name: 'Client', type: 'corporate' }).returning();
  const [quote] = await db.insert(schema.quotations).values({ companyId: company.id, clientId: client.id, quoteNumber: 'AI-1', projectName: 'AI', expiryDate: new Date(), subtotal: '0', discountTotal: '0', vatTotal: '0', grandTotal: '0' }).returning();
  const [deal] = await db.insert(schema.deals).values({ companyId: company.id, clientId: client.id, quotationId: quote.id, name: 'Deal' }).returning();
  const [alert] = await db.insert(schema.regulationAlerts).values({ companyId: company.id, title: 'Alert', category: 'tax', effectiveDate: new Date(), impactLevel: 'low', summary: 'Test' }).returning();
  await db.insert(schema.usageLogs).values({ companyId: company.id, userId: user.id, feature: 'AI_QUOTATION_GENERATED', count: 20 });
  let providerCalls = 0;
  const app = expressModule.default();
  app.use(expressModule.default.json());
  const allow = (_req: unknown, _res: unknown, next: () => void) => next();
  registerCrmRoutes(app, { analyzeDeal: async () => { providerCalls++; return { probability: 0, riskLevel: 'low', insights: '' }; } } as any, allow);
  registerRegulationRoutes(app, {
    crawlAndAnalyze: async () => { providerCalls++; return []; },
    checkQuotationImpact: async () => { providerCalls++; return {}; },
  } as any, allow);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const token = AuthService.generateToken({ userId: user.id, companyId: company.id, role: 'owner' });
  const call = (path: string, body: unknown) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  try {
    for (const [path, body] of [['/api/crm/analyze-deal', { dealId: deal.id }], ['/api/regulations/sync', {}], ['/api/regulations/check-impact', { quotationId: quote.id, alertId: alert.id }]] as const) {
      const response = await call(path, body);
      assert.equal(response.status, 403);
      assert.equal((await response.json()).code, 'AI_QUOTA_EXCEEDED');
    }
    assert.equal(providerCalls, 0);
    await db.delete(schema.usageLogs).where(eq(schema.usageLogs.companyId, company.id));
    assert.equal((await call('/api/regulations/sync', {})).status, 200);
    assert.equal(providerCalls, 1);
    const rows = await db.select().from(schema.usageLogs).where(and(eq(schema.usageLogs.companyId, company.id), eq(schema.usageLogs.feature, 'AI_QUOTATION_GENERATED')));
    assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
