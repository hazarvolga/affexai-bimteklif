import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { db } from '../../db';
import { registerAuthRoutes, deliverAuthLink, issueAuthAction } from '../routes/auth';
import { issueInvitation, invitationErrorResponse } from './invitations';
import { EmailDeliveryError, assertAuthEmailAvailable } from './email-policy';

test('disabled email rejects new email actions before database access and keeps login available', async t => {
  const prior = process.env.AUTH_EMAIL_DELIVERY_MODE;
  process.env.AUTH_EMAIL_DELIVERY_MODE = 'disabled';
  t.after(() => { if (prior === undefined) delete process.env.AUTH_EMAIL_DELIVERY_MODE; else process.env.AUTH_EMAIL_DELIVERY_MODE = prior; });
  const failDb = () => { throw new Error('Unexpected database access before email guard'); };
  const transaction = t.mock.method(db, 'transaction', failDb as any);
  const select = t.mock.method(db, 'select', failDb as any);
  const insert = t.mock.method(db, 'insert', failDb as any);
  const remove = t.mock.method(db, 'delete', failDb as any);
  const app = express();
  app.use(express.json());
  registerAuthRoutes(app);
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const post = (path: string) => fetch(`http://127.0.0.1:${address.port}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a@example.test', password: 'Example-password-42' }) });
  for (const path of ['/api/auth/register', '/api/auth/resend-verification', '/api/auth/forgot-password']) {
    const response = await post(path);
    assert.equal(response.status, 503, path);
    const body = await response.json() as any;
    assert.equal(body.code, 'EMAIL_DELIVERY_DISABLED');
    assert.equal(body.message, undefined);
    assert.equal(body.devVerificationUrl, undefined);
    assert.equal(body.devResetUrl, undefined);
  }
  await assert.rejects(issueAuthAction('user', 'verify_email', 60000), { code: 'EMAIL_DELIVERY_DISABLED' });
  await assert.rejects(deliverAuthLink('reset_password', 'a@example.test', 'https://example.test/token'), { code: 'EMAIL_DELIVERY_DISABLED' });
  await assert.rejects(issueInvitation('tenant', 'owner', { email: 'a@example.test', role: 'viewer' }), { code: 'EMAIL_DELIVERY_DISABLED' });
  for (const spy of [transaction, select, insert, remove]) assert.equal(spy.mock.callCount(), 0);

  // Login still evaluates credentials; email availability is not an authentication gate.
  transaction.mock.mockImplementation(async () => ({ allowed: true, retryAfterSeconds: 0 }) as any);
  select.mock.mockImplementation(() => ({ from: () => ({ where: async () => [] }) }) as any);
  assert.equal((await post('/api/auth/login')).status, 401);
  assert.equal(transaction.mock.callCount(), 1);
  assert.equal(select.mock.callCount(), 1);
});

test('unconfigured production email is unavailable and invitation errors expose safe 503', () => {
  assert.throws(() => assertAuthEmailAvailable({ NODE_ENV: 'production' }), { code: 'EMAIL_DELIVERY_UNAVAILABLE' });
  let status = 0;
  let response: any;
  const res: any = { status(value: number) { status = value; return this; }, json(value: unknown) { response = value; return this; } };
  invitationErrorResponse(new EmailDeliveryError('EMAIL_DELIVERY_DISABLED'), res);
  assert.equal(status, 503);
  assert.equal(response.code, 'EMAIL_DELIVERY_DISABLED');
  assert.match(response.error, /henüz etkinleştirilmedi/);
});
