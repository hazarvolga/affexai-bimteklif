import assert from 'node:assert/strict';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import { AuthService } from './authService';

test('JWT secret resolves at call time and never falls back in production', (t) => {
  const original = { NODE_ENV: process.env.NODE_ENV, JWT_SECRET: process.env.JWT_SECRET };
  t.after(() => { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  const payload = { userId: 'user', companyId: null, role: null };
  process.env.NODE_ENV = 'development';
  delete process.env.JWT_SECRET;
  const devToken = AuthService.generateToken(payload);
  assert.ok(AuthService.verifyToken(devToken));
  process.env.NODE_ENV = 'production';
  for (const secret of ['', 'short', 'super-secret-key-teklifpro', 'change-me'.repeat(8)]) {
    process.env.JWT_SECRET = secret;
    assert.throws(() => AuthService.generateToken(payload), /JWT_SECRET/);
    assert.equal(AuthService.verifyToken(devToken), null);
  }
  process.env.JWT_SECRET = 'test-only-production-key-'.repeat(3);
  const productionToken = AuthService.generateToken(payload);
  assert.ok(AuthService.verifyToken(productionToken));
  assert.equal(AuthService.verifyToken(devToken), null);
  assert.equal(AuthService.verifyToken(jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS384' })), null);
});
