import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AuthService } from '../../services/auth/authService';
import { createAuthenticate } from '../middleware/auth';
import { hashActionToken } from './security';

test('enrolled admin cannot use old tokens, bearer or impersonation without current MFA epoch', async () => {
  const adminId = randomUUID(), tenantId = randomUUID(), epoch = randomUUID(), targetId = randomUUID();
  const user = { email: 'a@example.test', emailVerified: new Date(), passwordChangedAt: null, isSuperAdmin: true, mfaEpoch: epoch, passwordHash: 'old-bcrypt-hash' };
  const version = hashActionToken(user.passwordHash);
  const target = { ...user, isSuperAdmin: false, mfaEpoch: null };
  const auth = createAuthenticate({ findUser: async id => id === adminId ? user : target, findMembership: async () => ({ role: 'owner' }), isSessionRevoked: async () => false, isImpersonationRevoked: async () => false });
  async function result(token: string) {
    let status = 200, reached = false;
    await auth({ method: 'GET', headers: { authorization: `Bearer ${token}` } }, { status(s: number) { status = s; return this; }, json() {} }, () => { reached = true; });
    return { status, reached };
  }
  assert.equal((await result(AuthService.generateToken({ userId: adminId, companyId: null, role: null }))).status, 401);
  assert.equal((await result(AuthService.generateToken({ userId: adminId, companyId: null, role: null, mfaEpoch: epoch, mfaCredentialVersion: version }))).reached, true);
  assert.equal((await result(AuthService.generateImpersonationToken({ userId: targetId, companyId: tenantId, impersonatedBy: adminId }))).status, 401);
  assert.equal((await result(AuthService.generateImpersonationToken({ userId: targetId, companyId: tenantId, impersonatedBy: adminId, mfaEpoch: epoch, mfaCredentialVersion: version }))).reached, true);
  user.passwordHash = 'new-bcrypt-hash';
  assert.equal((await result(AuthService.generateToken({ userId: adminId, companyId: null, role: null, mfaEpoch: epoch, mfaCredentialVersion: version }))).status, 401, 'password change revokes a late-issued MFA session');
});
