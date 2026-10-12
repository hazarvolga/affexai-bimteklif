import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateProductionEnvironment, validateSmartcheckStorageEnvironment } from './production';

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

  it('accepts complete authenticated SMTP and rejects partial SMTP configuration', () => {
    const base = { NODE_ENV: 'production', DATABASE_URL: 'postgres://db', JWT_SECRET: 'j'.repeat(48), PUBLIC_APP_URL: 'https://bimmetraj.com', TRUST_PROXY_HOPS: '1', AUTH_EMAIL_DELIVERY_MODE: 'smtp', AUTH_EMAIL_SMTP_HOST: 'mail.affexai.tr', AUTH_EMAIL_SMTP_PORT: '465', AUTH_EMAIL_SMTP_USER: 'info@bimmetraj.com', AUTH_EMAIL_SMTP_PASSWORD: 's'.repeat(48), AUTH_EMAIL_FROM: 'info@bimmetraj.com' };
    assert.equal(validateProductionEnvironment(base).valid, true);
    assert.equal(validateProductionEnvironment({ ...base, AUTH_EMAIL_SMTP_PASSWORD: '' }).valid, false);
    assert.equal(validateProductionEnvironment({ ...base, AUTH_EMAIL_SMTP_PORT: '25' }).valid, false);
  });

  it('validates S3-compatible storage credentials as a paired, explicit boundary', () => {
    assert.equal(validateSmartcheckStorageEnvironment({ SMARTCHECK_S3_BUCKET: 'teklifpro-pilot', SMARTCHECK_S3_REGION: 'eu-central-1', SMARTCHECK_S3_ACCESS_KEY_ID: 'key' }).valid, false);
    assert.equal(validateSmartcheckStorageEnvironment({ SMARTCHECK_S3_BUCKET: 'teklifpro-pilot', SMARTCHECK_S3_REGION: 'eu-central-1', SMARTCHECK_S3_ACCESS_KEY_ID: 'key', SMARTCHECK_S3_SECRET_ACCESS_KEY: 'secret', SMARTCHECK_S3_ENDPOINT: 'https://s3.example.com', SMARTCHECK_S3_FORCE_PATH_STYLE: 'true' }).valid, true);
    assert.equal(validateSmartcheckStorageEnvironment({ SMARTCHECK_S3_BUCKET: 'teklifpro-pilot', SMARTCHECK_S3_REGION: 'eu-central-1', SMARTCHECK_S3_ENDPOINT: 'http://s3.example.com' }).valid, false);
  });

  it('requires explicit credentials when the deployment disables ambient S3 credentials', () => {
    const base = { SMARTCHECK_S3_BUCKET: 'production-bucket', SMARTCHECK_S3_REGION: 'auto', SMARTCHECK_S3_REQUIRE_STATIC_CREDENTIALS: 'true' };
    assert.equal(validateSmartcheckStorageEnvironment(base).valid, false);
    assert.equal(validateSmartcheckStorageEnvironment({ ...base, SMARTCHECK_S3_ACCESS_KEY_ID: '', SMARTCHECK_S3_SECRET_ACCESS_KEY: '' }).valid, false);
    assert.equal(validateSmartcheckStorageEnvironment({ ...base, SMARTCHECK_S3_ACCESS_KEY_ID: 'access', SMARTCHECK_S3_SECRET_ACCESS_KEY: 'secret' }).valid, true);
    const production = { ...base, NODE_ENV: 'production', DATABASE_URL: 'postgres://db', JWT_SECRET: 'j'.repeat(48), PUBLIC_APP_URL: 'https://app.example.test', AUTH_EMAIL_DELIVERY_MODE: 'disabled' };
    assert.equal(validateProductionEnvironment(production).valid, false, 'static credential deployment must fail even before import enablement');
    assert.equal(validateProductionEnvironment({ ...production, SMARTCHECK_S3_ACCESS_KEY_ID: 'access', SMARTCHECK_S3_SECRET_ACCESS_KEY: 'secret' }).valid, true);
    assert.equal(validateProductionEnvironment({ ...production, SMARTCHECK_S3_ACCESS_KEY_ID: 'access', SMARTCHECK_S3_SECRET_ACCESS_KEY: 'secret', JWT_SECRET: '' }).valid, false);
  });
});

it('explicit disabled email permits production startup while default webhook remains fail closed', () => {
  const base = { NODE_ENV: 'production', DATABASE_URL: 'postgres://db', JWT_SECRET: 'j'.repeat(48), PUBLIC_APP_URL: 'https://app.example.test' };
  assert.equal(validateProductionEnvironment({ ...base, AUTH_EMAIL_DELIVERY_MODE: 'disabled' }).valid, true);
  assert.equal(validateProductionEnvironment(base).valid, false);
  assert.equal(validateProductionEnvironment({ ...base, AUTH_EMAIL_DELIVERY_MODE: 'typo' }).valid, false);
});
