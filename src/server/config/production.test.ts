import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateProductionEnvironment } from './production';

describe('production environment preflight', () => {
  it('does not block local development', () => {
    assert.deepEqual(validateProductionEnvironment({ NODE_ENV: 'development' }), { valid: true, errors: [], trustProxyHops: 0 });
  });

  it('rejects missing, placeholder and insecure production settings', () => {
    const result = validateProductionEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'postgres://db', JWT_SECRET: 'change-me', PUBLIC_APP_URL: 'http://example.com', AUTH_EMAIL_WEBHOOK_URL: 'http://example.com/hook', AUTH_EMAIL_WEBHOOK_SECRET: 'secret', TRUST_PROXY_HOPS: '9' });
    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 5);
  });

  it('accepts a complete Coolify-style production environment', () => {
    const result = validateProductionEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'postgres://db', JWT_SECRET: 'j'.repeat(48), PUBLIC_APP_URL: 'https://academy.example.com', AUTH_EMAIL_WEBHOOK_URL: 'https://n8n.example.com/webhook/auth', AUTH_EMAIL_WEBHOOK_SECRET: 'w'.repeat(48), TRUST_PROXY_HOPS: '1' });
    assert.equal(result.valid, true);
    assert.equal(result.trustProxyHops, 1);
  });
});
