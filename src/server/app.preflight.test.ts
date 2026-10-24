import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApiApp } from './app';

test('every API app performs production preflight and applies trust proxy without starting a server', async (t) => {
  const keys = ['NODE_ENV', 'DATABASE_URL', 'CONTROL_DATABASE_URL', 'JWT_SECRET', 'PUBLIC_APP_URL', 'AUTH_EMAIL_WEBHOOK_URL', 'AUTH_EMAIL_WEBHOOK_SECRET', 'TRUST_PROXY_HOPS', 'SMARTCHECK_IMPORT_ENABLED'] as const;
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => { for (const key of keys) { const value = original[key]; if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  Object.assign(process.env, {
    NODE_ENV: 'production', DATABASE_URL: 'postgresql://bimmetraj_app:unused@127.0.0.1:1/teklifpro_test_unused',
    CONTROL_DATABASE_URL: 'postgresql://bimmetraj_control:unused@127.0.0.1:1/teklifpro_test_unused',
    JWT_SECRET: '', PUBLIC_APP_URL: 'https://app.example.test',
    AUTH_EMAIL_WEBHOOK_URL: 'https://mail.example.test/auth', AUTH_EMAIL_WEBHOOK_SECRET: 'w'.repeat(48),
    TRUST_PROXY_HOPS: '2', SMARTCHECK_IMPORT_ENABLED: 'false',
  });
  assert.throws(() => createApiApp(), /JWT_SECRET/);
  process.env.JWT_SECRET = 'j'.repeat(48);
  assert.equal(createApiApp().get('trust proxy'), 2);
  const entrypoint = await import('../../api/index');
  assert.equal(entrypoint.default.get('trust proxy'), 2);
  process.env.TRUST_PROXY_HOPS = '99';
  assert.throws(() => createApiApp(), /TRUST_PROXY_HOPS/);
  process.env.NODE_ENV = 'development';
  delete process.env.JWT_SECRET;
  assert.equal(createApiApp().get('trust proxy'), false);
});
