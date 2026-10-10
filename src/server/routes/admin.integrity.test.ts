import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import dotenv from 'dotenv';
import { eq, sql } from 'drizzle-orm';
import { useTestIsolation } from './test-isolation';

dotenv.config({ path: '.env.local', quiet: true });
useTestIsolation();

test('admin changes are bounded, partial and audited atomically', async t => {
  const [{ db }, schema, { createApiApp }, { AuthService }] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('../app'), import('../../services/auth/authService'),
  ]);
  const [admin] = await db.insert(schema.users).values({ email: 'admin-boundary@example.test', fullName: 'Admin', isSuperAdmin: true }).returning();
  const [company] = await db.insert(schema.companies).values({ name: 'Admin Target' }).returning();
  const [plan] = await db.insert(schema.plans).values({ name: 'Existing', monthlyQuoteLimit: 7, monthlyPrice: 10 }).returning();
  await db.insert(schema.subscriptions).values({ companyId: company.id, planId: plan.id, bonusQuoteLimit: 3, status: 'past_due' });
  const token = AuthService.generateToken({ userId: admin.id, companyId: null, role: null });
  const server = createServer(createApiApp());
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const request = (path: string, body: unknown, method = 'PATCH') => fetch(`http://127.0.0.1:${address.port}${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  await t.test('invalid values are rejected before persistence', async () => {
    assert.equal((await request('/api/admin/plans', { name: 'Bad', monthlyQuoteLimit: -1, monthlyPrice: 0 }, 'POST')).status, 400);
    assert.equal((await request(`/api/admin/plans/${plan.id}`, {})).status, 400);
    assert.equal((await request(`/api/admin/tenants/${company.id}`, { status: 'suspended' })).status, 400);
    assert.equal((await request('/api/admin/plans/not-a-uuid', { name: 'Bad' })).status, 400);
  });
  await t.test('partial patch preserves status and plan, accepts zero and records before/after', async () => {
    assert.equal((await request(`/api/admin/tenants/${company.id}`, { bonusQuoteLimit: 0 })).status, 200);
    const current = await db.query.subscriptions.findFirst({ where: eq(schema.subscriptions.companyId, company.id) });
    assert.equal(current?.status, 'past_due');
    assert.equal(current?.planId, plan.id);
    assert.equal(current?.bonusQuoteLimit, 0);
    const audit = await db.query.adminAuditLogs.findFirst({ where: eq(schema.adminAuditLogs.targetCompanyId, company.id) });
    assert.equal(audit?.adminId, admin.id);
    assert.equal((audit?.details as any).before.bonusQuoteLimit, 3);
    assert.equal((audit?.details as any).after.bonusQuoteLimit, 0);
  });
  await t.test('missing targets and unavailable plans cannot create phantom subscriptions', async () => {
    assert.equal((await request('/api/admin/tenants/00000000-0000-4000-8000-000000000001', { status: 'active' })).status, 404);
    assert.equal((await request(`/api/admin/tenants/${company.id}`, { planId: '00000000-0000-4000-8000-000000000001' })).status, 400);
    const [inactive] = await db.insert(schema.plans).values({ name: 'Inactive', monthlyQuoteLimit: 0, monthlyPrice: 0, isActive: false }).returning();
    assert.equal((await request(`/api/admin/tenants/${company.id}`, { planId: inactive.id })).status, 400);
  });
  await t.test('unchanged inactive plan permits unrelated updates but cannot be newly assigned', async () => {
    await db.update(schema.plans).set({ isActive: false }).where(eq(schema.plans.id, plan.id));
    assert.equal((await request(`/api/admin/tenants/${company.id}`, { planId: plan.id, status: 'active', bonusQuoteLimit: 2 })).status, 200);
    const current = await db.query.subscriptions.findFirst({ where: eq(schema.subscriptions.companyId, company.id) });
    assert.equal(current?.planId, plan.id);
    assert.equal(current?.status, 'active');
    assert.equal(current?.bonusQuoteLimit, 2);
    const [otherCompany] = await db.insert(schema.companies).values({ name: 'No inactive assignment' }).returning();
    assert.equal((await request(`/api/admin/tenants/${otherCompany.id}`, { planId: plan.id })).status, 400);
    assert.equal(await db.query.subscriptions.findFirst({ where: eq(schema.subscriptions.companyId, otherCompany.id) }), undefined);
  });
  await t.test('audit failure rolls back the plan write', async () => {
    await db.execute(sql`CREATE FUNCTION fail_admin_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected audit failure'; END $$`);
    await db.execute(sql`CREATE TRIGGER fail_admin_audit BEFORE INSERT ON admin_audit_logs FOR EACH ROW EXECUTE FUNCTION fail_admin_audit()`);
    try {
      assert.equal((await request(`/api/admin/plans/${plan.id}`, { name: 'Must Roll Back' })).status, 500);
      assert.equal((await db.query.plans.findFirst({ where: eq(schema.plans.id, plan.id) }))?.name, 'Existing');
    } finally {
      await db.execute(sql`DROP TRIGGER fail_admin_audit ON admin_audit_logs`);
      await db.execute(sql`DROP FUNCTION fail_admin_audit()`);
    }
  });
});
