import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authenticate, checkRole } from '../middleware/auth';
import { registerCompanyRoutes } from './company';

function getCompanyRouteHandlers() {
  let getProfileHandler: any = null;
  let patchProfileHandler: any = null;
  const app: any = {
    get(path: string, ...route: any[]) {
      if (path === '/api/company/profile') getProfileHandler = route;
    },
    post() {},
    patch(path: string, ...route: any[]) {
      if (path === '/api/company/profile') patchProfileHandler = route;
    },
  };
  registerCompanyRoutes(app);
  return { getProfileHandler, patchProfileHandler };
}

function mockResponse() {
  return {
    statusCode: 200,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; }
  };
}

test('company profile routes are registered with proper authentication and authorization', () => {
  const { getProfileHandler, patchProfileHandler } = getCompanyRouteHandlers();
  assert.ok(getProfileHandler, 'GET /api/company/profile should be registered');
  assert.ok(patchProfileHandler, 'PATCH /api/company/profile should be registered');

  // GET route has [authenticate, handler]
  assert.equal(getProfileHandler[0], authenticate);

  // PATCH route has [authenticate, checkRole(['owner', 'admin']), handler]
  assert.equal(patchProfileHandler[0], authenticate);
  assert.equal(typeof patchProfileHandler[1], 'function');
  assert.equal(typeof patchProfileHandler[2], 'function');
});

test('PATCH /api/company/profile rejects empty update body', async () => {
  const { patchProfileHandler } = getCompanyRouteHandlers();
  const handler = patchProfileHandler[2];
  const res = mockResponse();

  await handler({
    user: { companyId: '11111111-1111-4111-8111-111111111111' },
    body: {}
  }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'No valid fields provided for update' });
});
