import assert from 'node:assert/strict';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../services/auth/authService';
import { authDependencies, createAuthenticate, checkRole, checkSuperAdmin, requireVerifiedEmail } from './auth';
import { db } from '../../db';
import { memberships, users } from '../../db/schema';
import { PgDialect } from 'drizzle-orm/pg-core';

const userId = '11111111-1111-4111-8111-111111111111';
const companyId = '22222222-2222-4222-8222-222222222222';
const user = { email: 'learner@example.test', emailVerified: new Date(), passwordChangedAt: null, isSuperAdmin: false };
const token = (payload = { userId, companyId, role: 'owner' }) => AuthService.generateToken(payload);

async function request(options: { membership?: { role: 'owner' | 'viewer' }; superAdmin?: boolean; fail?: 'user' | 'membership'; authorization?: string; noUser?: boolean; passwordChangedAt?: Date } = {}) {
  let status = 200;
  let body: unknown;
  let passed = false;
  let error: unknown;
  const lookups: unknown[] = [];
  const req: any = { headers: { authorization: options.authorization ?? `Bearer ${token()}` } };
  const res: any = { status(code: number) { status = code; return this; }, json(value: unknown) { body = value; return this; } };
  const authenticate = createAuthenticate({
    async findUser(id) {
      assert.equal(id, userId);
      if (options.fail === 'user') throw new Error('private database details');
      return options.noUser ? undefined : { ...user, isSuperAdmin: options.superAdmin ?? false, passwordChangedAt: options.passwordChangedAt ?? null };
    },
    async findMembership(id, tenant) {
      lookups.push([id, tenant]);
      if (options.fail === 'membership') throw new Error('private database details');
      return options.membership;
    },
  });
  await authenticate(req, res, (err?: unknown) => { if (err) error = err; else passed = true; });
  return { req, res, status, body, passed, error, lookups };
}

test('tenant membership is required, including removed membership and tenant super-admin tokens', async () => {
  for (const superAdmin of [false, true]) {
    const result = await request({ superAdmin });
    assert.equal(result.status, 403);
    assert.equal(result.passed, false);
    assert.equal(result.req.user, undefined);
    assert.deepEqual(result.lookups, [[userId, companyId]]);
  }
});

test('demotion replaces stale token role before downstream authorization', async () => {
  const result = await request({ membership: { role: 'viewer' } });
  assert.equal(result.passed, true);
  assert.equal(result.req.user.role, 'viewer');
  let allowed = false;
  checkRole(['owner', 'admin'])(result.req, result.res, () => { allowed = true; });
  assert.equal(allowed, false);
});

test('learner membership remains usable and no-tenant sessions have no tenant role', async () => {
  assert.equal((await request({ membership: { role: 'owner' } })).passed, true);
  for (const superAdmin of [true, false]) {
    const result = await request({ superAdmin, authorization: `Bearer ${AuthService.generateToken({ userId, companyId: null, role: 'owner' })}` });
    assert.equal(result.passed, true);
    assert.equal(result.req.user.companyId, null);
    assert.equal(result.req.user.role, null);
    assert.equal(result.req.user.isSuperAdmin, superAdmin);
    assert.deepEqual(result.lookups, []);
    let allowed = false;
    checkSuperAdmin()(result.req, result.res, () => { allowed = true; });
    assert.equal(allowed, superAdmin);
  }
});

test('forged signatures, malformed claims and non-Bearer headers fail before DB lookup', async () => {
  const forged = jwt.sign({ userId, companyId, role: 'owner', isSuperAdmin: true }, 'attacker-secret');
  for (const authorization of [`Bearer ${forged}`, `Basic ${token()}`, 'Bearer', `Bearer ${AuthService.generateToken({ userId: 'invalid', companyId, role: 'owner' })}`]) {
    const result = await request({ authorization });
    assert.equal(result.status, 401);
    assert.equal(result.passed, false);
    assert.deepEqual(result.lookups, []);
  }
});

test('missing users and changed passwords fail closed, same-second sessions survive', async () => {
  assert.equal((await request({ noUser: true })).status, 401);
  assert.equal((await request({ passwordChangedAt: new Date(Date.now() + 5000) })).status, 401);
  assert.equal((await request({ passwordChangedAt: new Date(), membership: { role: 'owner' } })).passed, true);
});

test('database errors reach Express error handling without authorizing or leaking a response', async () => {
  for (const fail of ['user', 'membership'] as const) {
    const result = await request({ fail });
    assert.ok(result.error instanceof Error);
    assert.equal(result.passed, false);
    assert.equal(result.req.user, undefined);
    assert.equal(result.body, undefined);
  }
});

test('membership authority scopes both keys and refreshes membership on every request', async (t) => {
  let role: 'owner' | 'viewer' | null = 'owner';
  let membershipReads = 0;
  t.mock.method(db, 'select', (() => ({ from(table: unknown) {
    return { async where(condition: any) {
      const sql = new PgDialect().sqlToQuery(condition);
      if (table === users) { assert.deepEqual(sql.params, [userId]); return [user]; }
      assert.equal(table, memberships);
      assert.deepEqual(sql.params, [userId, companyId]);
      assert.equal(sql.sql, '("memberships"."user_id" = $1 and "memberships"."company_id" = $2)');
      membershipReads++;
      return role ? [{ role }] : [];
    } };
  } })) as any);
  const authenticate = createAuthenticate({
    findUser: authDependencies.findUser,
    findMembership: async (candidateUserId, candidateCompanyId) => {
      assert.equal(candidateUserId, userId);
      assert.equal(candidateCompanyId, companyId);
      membershipReads++;
      return role ? { role } : undefined;
    },
  });
  const authorization = `Bearer ${token()}`;
  for (const nextRole of ['owner', 'viewer', null] as const) {
    role = nextRole;
    const req: any = { headers: { authorization } };
    let status = 200;
    let allowed = false;
    const res: any = { status(code: number) { status = code; return this; }, json() { return this; } };
    await authenticate(req, res, () => { allowed = true; });
    assert.equal(allowed, role !== null);
    assert.equal(status, role ? 200 : 403);
    if (role) assert.equal(req.user.role, role);
  }
  assert.equal(membershipReads, 3);
});

test('signed privilege claims cannot override DB super-admin and email verification', async () => {
  const signed = AuthService.generateToken({ userId, companyId, role: 'owner', isSuperAdmin: true } as any);
  const result = await request({ authorization: `Bearer ${signed}`, membership: { role: 'owner' } });
  assert.equal(result.req.user.isSuperAdmin, false);
  let allowed = 0;
  checkRole(['owner'])(result.req, result.res, () => { allowed++; });
  requireVerifiedEmail(result.req, result.res, () => { allowed++; });
  requireVerifiedEmail({ user: { emailVerified: null } }, result.res, () => { allowed++; });
  assert.equal(allowed, 2);
});
