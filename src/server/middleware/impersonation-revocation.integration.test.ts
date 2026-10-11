import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { useTestIsolation } from '../routes/test-isolation';
dotenv.config({ path: '.env.local' });
useTestIsolation();

test('read-only exit persists revocation and rejects token replay across fresh authentication', async () => {
  const [{ db }, schema, { registerAuthRoutes }, { AuthService }] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('../routes/auth'), import('../../services/auth/authService'),
  ]);
  const [company] = await db.insert(schema.companies).values({ name: 'Revocation test' }).returning();
  const [user] = await db.insert(schema.users).values({ email: 'revocation-user@example.test', fullName: 'User' }).returning();
  const [admin] = await db.insert(schema.users).values({ email: 'revocation-admin@example.test', fullName: 'Admin', isSuperAdmin: true }).returning();
  await db.insert(schema.memberships).values({ companyId: company.id, userId: user.id, role: 'owner' });
  const issue = () => AuthService.generateImpersonationToken({ userId: user.id, companyId: company.id, impersonatedBy: admin.id });
  const token = issue(), independentToken = issue();
  assert.notEqual(token, independentToken, 'same-second sessions must have distinct revocation identities');
  const app = express();
  app.use(express.json());
  registerAuthRoutes(app);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  const request = (path: string, value: string, method = 'GET') => fetch(url + path, { method, headers: { Authorization: `Bearer ${value}` } });
  try {
    assert.equal((await request('/api/auth/me', token)).status, 200);
    assert.equal((await request('/api/auth/impersonate/exit', token, 'POST')).status, 200);
    assert.equal((await request('/api/auth/me', token)).status, 401);
    assert.equal((await request('/api/auth/me', independentToken)).status, 200);
    const [audit] = await db.select().from(schema.adminAuditLogs).where(eq(schema.adminAuditLogs.action, 'impersonation.ended'));
    assert.match((audit.details as any).tokenHash, /^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(audit).includes(token), false);
    await db.update(schema.users).set({ isSuperAdmin: false }).where(eq(schema.users.id, admin.id));
    assert.equal((await request('/api/auth/me', independentToken)).status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
