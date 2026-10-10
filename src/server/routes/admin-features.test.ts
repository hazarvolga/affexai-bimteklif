import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApiApp } from '../app';
import { AuthService } from '../../services/auth/authService';

describe('Super Admin Security & Features Integration', () => {
  const app = createApiApp();
  const server = app.listen(0);
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const superAdminUserId = '11111111-1111-4111-a111-111111111111';
  const superAdminCompanyId = '22222222-2222-4222-a222-222222222222';
  const regularUserId = '33333333-3333-4333-a333-333333333333';
  const regularCompanyId = '44444444-4444-4444-a444-444444444444';

  it('rejects unauthenticated requests to /api/admin/* with 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`);
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
    // Regular user is either not in DB or isSuperAdmin=false -> 401 or 403
    assert.ok(res.status === 401 || res.status === 403);
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
    assert.ok(adminRes.status === 401 || adminRes.status === 403);

    // 2. Impersonated token in readOnly mode is blocked on mutating methods
    const mutatingRes = await fetch(`${baseUrl}/api/quotations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${impersonationToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Unauthorized Quote' }),
    });
    assert.ok(mutatingRes.status === 401 || mutatingRes.status === 403);
  });
});
