import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiApp } from '../app';

test('app resilience: async errors are caught and return 500 JSON', async () => {
  const app = createApiApp({
    configureRoutes: (testApp) => {
      testApp.get('/api/test-async-error', async () => {
        throw new Error('Simulated async database failure');
      });
    },
  });

  const server = app.listen(0);
  const address = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${address.port}/api/test-async-error`);
    assert.equal(res.status, 500);
    const body = await res.json() as { error: string };
    assert.equal(body.error, 'Beklenmeyen bir sunucu hatası oluştu.');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});

test('app resilience: unknown /api/* endpoint returns 404 JSON', async () => {
  const app = createApiApp();
  const server = app.listen(0);
  const address = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${address.port}/api/nonexistent-route-endpoint`);
    assert.equal(res.status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});

test('app observability: /healthz probe returns 200 fast and X-Request-Id is set', async () => {
  const app = createApiApp();
  const server = app.listen(0);
  const address = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${address.port}/healthz`);
    assert.equal(res.status, 200);
    const body = await res.json() as { status: string };
    assert.equal(body.status, 'ok');
    assert.ok(res.headers.get('x-request-id'));
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});
