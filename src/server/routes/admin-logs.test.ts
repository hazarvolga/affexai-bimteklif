import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import express from 'express';

process.env.DATABASE_URL ||= 'postgresql://test@127.0.0.1:5432/teklifpro_bootstrap_test';
const { registerAdminLogRoutes, parseAuditQuery, safeAuditDetails, safeAuditAction, safeAuditTarget } = await import('./admin-logs');
const { createAuthenticate } = await import('../middleware/auth');
const { AuthService } = await import('../../services/auth/authService');
const id = '11111111-1111-4111-8111-111111111111';

test('audit event code and target are bounded, typed and exclude raw secrets', () => {
  assert.equal(safeAuditAction('processing_retry_scheduled'), 'processing_retry_scheduled');
  assert.equal(safeAuditAction('future.event'), 'future.event');
  assert.equal(safeAuditAction('IBAN TR123456789'), 'other');
  assert.equal(safeAuditAction('sk_live_supersecretvalue'), 'other');
  assert.equal(safeAuditAction('password_reset_secret_value'), 'other');
  assert.equal(safeAuditAction('x'.repeat(120)), 'other');
  assert.deepEqual(safeAuditTarget({ runId: id, iban: 'SECRET', token: 'SECRET' }), { type: 'run', id });
  assert.deepEqual(safeAuditTarget({ after: { id, iban: 'SECRET' } }, 'plan.updated'), { type: 'plan', id });
  assert.equal(safeAuditTarget({ runId: 'SECRET', iban: id }), null);
});

test('audit pagination rejects malformed, repeated and oversized inputs', () => {
  assert.deepEqual(parseAuditQuery({}), { limit: 25 });
  assert.equal(parseAuditQuery({ limit: '100' }).limit, 100);
  for (const query of [{ limit: '101' }, { limit: '0' }, { limit: '-1' }, { limit: '1e2' }, { limit: ['1', '2'] }, { cursor: 'abc' }, { cursor: 'x'.repeat(513) }, { companyId: id }]) {
    assert.throws(() => parseAuditQuery(query));
  }
  const cursor = Buffer.from(JSON.stringify({ at: '2026-10-08T12:00:00.123456', id })).toString('base64url');
  assert.deepEqual(parseAuditQuery({ cursor }).cursor, { at: '2026-10-08T12:00:00.123456', id });
  for (const at of ['2026-02-31T12:00:00.123456', "2026-10-08';drop table users;--"]) {
    assert.throws(() => parseAuditQuery({ cursor: Buffer.from(JSON.stringify({ at, id })).toString('base64url') }));
  }
});

test('audit details expose only typed operational fields, never arbitrary nested secrets', () => {
  assert.deepEqual(safeAuditDetails({ before: null, after: { monthlyPrice: 0, bonusQuoteLimit: 3, status: 'active', password: 'SECRET', token: 'SECRET', name: 'SECRET', nested: { apiKey: 'SECRET' } }, authorization: 'SECRET' }),
    { before: null, after: { monthlyPrice: 0, bonusQuoteLimit: 3, status: 'active' } });
  assert.deepEqual(safeAuditDetails({ before: 'SECRET', after: { monthlyPrice: 'SECRET', status: 'SECRET' } }), { before: null, after: {} });
});

test('audit API uses live super-admin authority and safe bounded responses', async t => {
  let superAdmin = false;
  let calls = 0;
  let fail = false;
  const app = express();
  const authenticate = createAuthenticate({
    isSessionRevoked: async () => false,
    async findUser() { return { email: 'reader@example.test', emailVerified: new Date(), passwordChangedAt: null, isSuperAdmin: superAdmin }; },
    async findMembership() { return { role: 'owner' }; },
  });
  registerAdminLogRoutes(app, { authenticate, read: async ({ limit }) => {
    calls++;
    if (fail) throw new Error('database password SECRET');
    return Array.from({ length: limit + 1 }, (_, n) => ({ id: `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`, adminId: id, targetCompanyId: null,
      action: n ? 'untrusted SECRET event' : 'plan.updated', createdAt: '2026-10-08T12:00:00.123456', details: { after: { monthlyPrice: 0, password: 'SECRET' } } }));
  } });
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const token = AuthService.generateToken({ userId: id, companyId: id, role: 'owner' });
  const request = (query = '', authorized = true) => fetch(`http://127.0.0.1:${address.port}/api/admin/logs${query}`, { headers: authorized ? { Authorization: `Bearer ${token}` } : {} });
  assert.equal((await request('', false)).status, 401);
  assert.equal((await request()).status, 403);
  assert.equal(calls, 0);
  superAdmin = true;
  assert.equal((await request('?limit=101')).status, 400);
  assert.equal(calls, 0);
  const response = await request('?limit=2');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.equal(body.items.length, 2);
  assert.equal(body.items[0].createdAt, '2026-10-08T12:00:00.123456', 'timezone-naive timestamps must not acquire a UTC suffix');
  assert.ok(body.nextCursor);
  assert.equal(parseAuditQuery({ cursor: body.nextCursor }).cursor?.at, '2026-10-08T12:00:00.123456');
  assert.equal(JSON.stringify(body).includes('SECRET'), false);
  fail = true;
  const failed = await request();
  assert.equal(failed.status, 500);
  assert.equal((await failed.text()).includes('SECRET'), false);
  superAdmin = false;
  assert.equal((await request()).status, 403);
});
