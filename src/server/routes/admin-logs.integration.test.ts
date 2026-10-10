import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import dotenv from 'dotenv';
import { eq, sql } from 'drizzle-orm';
import { useTestIsolation } from './test-isolation';

dotenv.config({ path: '.env.local', quiet: true });
useTestIsolation();

test('audit API reads isolated real data with stable microsecond pagination and live authorization', async t => {
  const [{ db }, schema, { createApiApp }, { AuthService }] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('../app'), import('../../services/auth/authService'),
  ]);
  const [admin] = await db.insert(schema.users).values({ email: 'audit-reader@example.test', fullName: 'Audit Reader', isSuperAdmin: true }).returning();
  const token = AuthService.generateToken({ userId: admin.id, companyId: null, role: null });
  const server = createServer(createApiApp());
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const request = (query = '') => fetch(`http://127.0.0.1:${address.port}/api/admin/logs${query}`, { headers: { Authorization: `Bearer ${token}` } });
  assert.deepEqual(await (await request()).json(), { items: [], nextCursor: null });
  const ids = [1, 2, 3].map(n => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`);
  for (const [index, id] of ids.entries()) {
    await db.execute(sql`insert into admin_audit_logs(id,admin_id,action,details,created_at)
      values (${id},${admin.id},'plan.updated',${JSON.stringify({ after: { monthlyPrice: 0, token: 'NEVER_EXPOSE' } })}::jsonb,
      ${index === 0 ? '2026-10-08T12:00:00.123455' : '2026-10-08T12:00:00.123456'}::timestamp)`);
  }
  const found: string[] = [];
  let cursor: string | null = null;
  do {
    const response = await request(`?limit=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(JSON.stringify(body).includes('NEVER_EXPOSE'), false);
    assert.equal(body.items[0].details.after.monthlyPrice, 0);
    found.push(body.items[0].id);
    cursor = body.nextCursor;
    assert.ok(found.length <= 3, 'cursor must make progress');
  } while (cursor);
  assert.deepEqual(found, [...ids].reverse());
  await db.execute(sql`alter table admin_audit_logs rename to unavailable_audit_test`);
  try {
    const response = await request();
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Audit logs could not be loaded' });
  } finally { await db.execute(sql`alter table unavailable_audit_test rename to admin_audit_logs`); }
  await db.update(schema.users).set({ isSuperAdmin: false }).where(eq(schema.users.id, admin.id));
  assert.equal((await request()).status, 403);
});
