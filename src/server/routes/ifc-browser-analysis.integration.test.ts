import assert from 'node:assert/strict';
import test from 'node:test';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { useTestIsolation } from './test-isolation';
dotenv.config({ path: '.env.local' });
useTestIsolation();

test('browser IFC pre-analysis consumes the monthly IFC quota and stops at the package limit', async () => {
  const [{ db }, schema, { registerIfcBrowserAnalysisRoutes }, { AuthService }, expressModule] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('./ifc-browser-analysis'), import('../../services/auth/authService'), import('express'),
  ]);
  const [company] = await db.insert(schema.companies).values({ name: 'Browser IFC' }).returning();
  const [user] = await db.insert(schema.users).values({ email: 'browser-ifc@example.test', fullName: 'Browser IFC', emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values({ companyId: company.id, userId: user.id, role: 'owner' });
  const [plan] = await db.insert(schema.plans).values({ name: 'One IFC', monthlyQuoteLimit: 1, monthlyPrice: 10, monthlyIfcLimit: 1 }).returning();
  await db.insert(schema.subscriptions).values({ companyId: company.id, planId: plan.id, currentPeriodStart: new Date('2020-01-01') });
  const app = expressModule.default();
  app.use(expressModule.default.json());
  registerIfcBrowserAnalysisRoutes(app, (_req: unknown, _res: unknown, next: () => void) => next());
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const token = AuthService.generateToken({ userId: user.id, companyId: company.id, role: 'owner' });
  const analyse = () => fetch(`${base}/api/ifc/browser-analyses`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  try {
    const first = await analyse();
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { current: 1, limit: 1, period: new Date().toISOString().slice(0, 7) });
    const second = await analyse();
    assert.equal(second.status, 403);
    assert.equal((await second.json()).code, 'IFC_QUOTA_EXCEEDED');
    const counters = await db.select().from(schema.usageRecords).where(eq(schema.usageRecords.companyId, company.id));
    assert.equal(counters.reduce((sum, row) => sum + row.ifcCount, 0), 1);
    assert.equal((await fetch(`${base}/api/ifc/browser-analyses`, { method: 'POST' })).status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
