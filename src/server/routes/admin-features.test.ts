import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createApiApp } from '../app';
import { AuthService } from '../../services/auth/authService';
import { authDependencies, createAuthenticate } from '../middleware/auth';

describe('Super Admin Security & Features Integration', () => {
  const app = createApiApp();
  const server = app.listen(0);
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const superAdminUserId = '11111111-1111-4111-a111-111111111111';
  const superAdminCompanyId = '22222222-2222-4222-a222-222222222222';
  const regularUserId = '33333333-3333-4333-a333-333333333333';
  const regularCompanyId = '44444444-4444-4444-a444-444444444444';

  before(() => {
    mock.method(authDependencies, 'findUser', async (userId: string) => {
      if (userId === superAdminUserId) {
        return {
          email: 'superadmin@example.test',
          emailVerified: new Date(),
          passwordChangedAt: null,
          isSuperAdmin: true,
        };
      }
      if (userId === regularUserId) {
        return {
          email: 'regular@example.test',
          emailVerified: new Date(),
          passwordChangedAt: null,
          isSuperAdmin: false,
        };
      }
      return undefined;
    });

    mock.method(authDependencies, 'findMembership', async (userId: string, companyId: string) => {
      if (userId === regularUserId && companyId === regularCompanyId) return { role: 'owner' };
      if (userId === superAdminUserId && companyId === superAdminCompanyId) return { role: 'owner' };
      return undefined;
    });

    mock.method(authDependencies, 'isImpersonationRevoked', async () => false);
    mock.method(authDependencies, 'findSubscription', async () => ({ status: 'active' }));
  });

  after(() => {
    mock.restoreAll();
    server.close();
  });

  it('rejects unauthenticated requests to /api/admin/* with 401 and sets SEC-8 headers', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`);
    assert.equal(res.status, 401);
    assert.equal(res.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=(), payment=()');
    assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin');
  });

  it('rejects unauthenticated PDF import before running the 50MB JSON body parser (SEC-2)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/pricing-sources/${regularCompanyId}/import-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{malformed-json-that-must-not-be-parsed-before-auth',
    });
    assert.equal(res.status, 401);
  });

  it('rejects regular non-super-admin users with 403', async () => {
    const regularToken = AuthService.generateToken({
      userId: regularUserId,
      companyId: regularCompanyId,
      role: 'owner',
    });

    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${regularToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('generates a 15-minute read-only impersonation token and enforces read-only guard', async () => {
    const impersonationToken = AuthService.generateImpersonationToken({
      userId: regularUserId,
      companyId: regularCompanyId,
      impersonatedBy: superAdminUserId,
      readOnly: true,
    });

    // 1. Impersonated token cannot access admin routes (403)
    const adminRes = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${impersonationToken}` },
    });
    assert.equal(adminRes.status, 403);

    // 2. Impersonated token in readOnly mode is blocked on mutating methods (403 IMPERSONATION_READ_ONLY)
    const mutatingRes = await fetch(`${baseUrl}/api/quotations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${impersonationToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Unauthorized Quote' }),
    });
    assert.equal(mutatingRes.status, 403);
    const body = await mutatingRes.json();
    assert.equal(body.code, 'IMPERSONATION_READ_ONLY');
  });

  it('fails closed on impersonation tokens when isImpersonationRevoked dependency is omitted (SEC-7)', async () => {
    const impersonationToken = AuthService.generateImpersonationToken({
      userId: regularUserId,
      companyId: regularCompanyId,
      impersonatedBy: superAdminUserId,
      readOnly: true,
    });

    const customAuth = createAuthenticate({
      findUser: authDependencies.findUser,
      findMembership: authDependencies.findMembership,
      // isImpersonationRevoked intentionally omitted
    });

    let statusCode = 200;
    const req: any = { method: 'GET', headers: { authorization: `Bearer ${impersonationToken}` } };
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json() { return this; },
    };
    let nextCalled = false;
    await customAuth(req, res, () => { nextCalled = true; });
    assert.equal(statusCode, 401);
    assert.equal(nextCalled, false);
  });
});

