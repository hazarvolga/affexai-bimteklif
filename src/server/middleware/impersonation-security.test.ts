import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthenticate } from './auth';
import { AuthService } from '../../services/auth/authService';

const userId = '11111111-1111-4111-8111-111111111111';
const companyId = '22222222-2222-4222-8222-222222222222';
const adminId = '33333333-3333-4333-8333-333333333333';
async function request(path: string, revoked = false, activeAdmin = true, method = 'POST') {
  const token = AuthService.generateImpersonationToken({ userId, companyId, impersonatedBy: adminId, readOnly: true });
  const req: any = { method, path, originalUrl: path, headers: { authorization: `Bearer ${token}` } };
  let status = 200, passed = false;
  const res: any = { status(value: number) { status = value; return this; }, json() { return this; } };
  await createAuthenticate({
    isSessionRevoked: async () => false,
    findUser: async (id) => ({ email: 'test@example.test', emailVerified: new Date(), passwordChangedAt: null, isSuperAdmin: id === adminId && activeAdmin }),
    findMembership: async () => ({ role: 'owner' }),
    isImpersonationRevoked: async () => revoked,
  } as any)(req, res, (error?: unknown) => { if (error) throw error; passed = true; });
  return { status, passed };
}
test('read-only impersonation can exit but cannot mutate other routes', async () => {
  assert.deepEqual(await request('/api/auth/impersonate/exit'), { status: 200, passed: true });
  assert.deepEqual(await request('/api/quotations'), { status: 403, passed: false });
});
test('revoked impersonation and removed source admin authority fail closed', async () => {
  assert.deepEqual(await request('/api/auth/me', true, true, 'GET'), { status: 401, passed: false });
  assert.deepEqual(await request('/api/auth/me', false, false, 'GET'), { status: 401, passed: false });
});
