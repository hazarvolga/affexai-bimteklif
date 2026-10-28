import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AuthService } from '../../services/auth/authService';
import { collectRevocableTokens, createSessionRevoker } from './session-revocation';
import { createAuthenticate } from '../middleware/auth';

const userId = randomUUID();
const user = { email: 'owner@example.test', emailVerified: new Date(), passwordChangedAt: null, isSuperAdmin: false };

test('same-second tokens are distinct, and logout collects bearer and both browser cookies', () => {
  const first = AuthService.generateToken({ userId, companyId: null, role: null });
  const second = AuthService.generateToken({ userId, companyId: null, role: null });
  assert.notEqual(first, second);
  const records = collectRevocableTokens({ headers: { authorization: `Bearer ${first}`, cookie: `bm_session=${second}; bm_admin=${first}` } });
  assert.equal(records.length, 2);
  assert.ok(records.every(record => record.userId === userId && record.expiresAt.getTime() > Date.now()));
});

test('logout stores all validated tokens atomically and ignores invalid tokens', async () => {
  const token = AuthService.generateToken({ userId, companyId: null, role: null });
  const writes: unknown[] = [];
  const revoke = createSessionRevoker(async records => { writes.push(records); });
  await revoke({ headers: { authorization: `Bearer ${token}`, cookie: 'bm_session=invalid' } });
  assert.equal(writes.length, 1);
  assert.equal((writes[0] as unknown[]).length, 1);
  await assert.rejects(createSessionRevoker(async () => { throw new Error('db offline'); })({ headers: { authorization: `Bearer ${token}` } }), /db offline/);
});

test('authentication rejects revoked bearer tokens and propagates storage errors', async () => {
  const token = AuthService.generateToken({ userId, companyId: null, role: null });
  async function invoke(isSessionRevoked: () => Promise<boolean>) {
    let status = 200; let error: unknown;
    const auth = createAuthenticate({ findUser: async () => user, findMembership: async () => undefined, isSessionRevoked });
    await auth({ headers: { authorization: `Bearer ${token}` }, method: 'GET' }, { status(s: number) { status = s; return this; }, json() {} }, (e?: unknown) => { error = e; });
    return { status, error };
  }
  assert.equal((await invoke(async () => true)).status, 401);
  assert.equal((await invoke(async () => false)).status, 200);
  assert.match(String((await invoke(async () => { throw new Error('db offline'); })).error), /db offline/);
});

test('authentication fails closed if revocation dependency is missing', async () => {
  const token = AuthService.generateToken({ userId, companyId: null, role: null });
  let status = 200; let passed = false;
  const authenticate = createAuthenticate({ findUser: async () => user, findMembership: async () => undefined } as any);
  await authenticate({ headers: { authorization: `Bearer ${token}` }, method: 'GET' }, { status(value: number) { status = value; return this; }, json() {} }, () => { passed = true; });
  assert.equal(status, 401);
  assert.equal(passed, false);
});
