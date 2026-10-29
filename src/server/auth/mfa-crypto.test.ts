import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptMfaSecret, decryptMfaSecret, totpForCounter, matchTotpCounter, generateRecoveryCodes, hashRecoveryCode } from './mfa-crypto';

test('RFC 6238 SHA-1 vectors and replay-aware counter matching', () => {
  const secret = Buffer.from('12345678901234567890');
  assert.equal(totpForCounter(secret, 1, 8), '94287082');
  assert.equal(totpForCounter(secret, 37037036, 8), '07081804');
  const code = totpForCounter(secret, 100);
  assert.equal(matchTotpCounter(secret, code, 3000, -1), 100);
  assert.equal(matchTotpCounter(secret, code, 3000, 100), null);
  assert.equal(matchTotpCounter(secret, 'xyz123', 3000, -1), null);
});

test('encrypted secrets are randomized, authenticated and bound to the user', () => {
  const key = Buffer.alloc(32, 7).toString('base64');
  const a = encryptMfaSecret(Buffer.from('12345678901234567890'), key, 'u1');
  const b = encryptMfaSecret(Buffer.from('12345678901234567890'), key, 'u1');
  assert.notEqual(a, b);
  assert.deepEqual(decryptMfaSecret(a, key, 'u1'), Buffer.from('12345678901234567890'));
  assert.throws(() => decryptMfaSecret(a, key, 'u2'));
  assert.throws(() => encryptMfaSecret(Buffer.alloc(20), 'bad', 'u1'));
});

test('recovery codes contain entropy and hash consistently', () => {
  const codes = generateRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  assert.ok(codes.every(c => /^[0-9A-F]{4}(-[0-9A-F]{4}){7}$/.test(c)));
  assert.equal(hashRecoveryCode(codes[0]), hashRecoveryCode(codes[0].toLowerCase()));
});

test('rejects malformed ciphertext, counters and noncanonical keys', () => {
  const key = Buffer.alloc(32, 7).toString('base64');
  const encrypted = encryptMfaSecret(Buffer.alloc(20), key, 'u');
  assert.throws(() => decryptMfaSecret('v2.x.y.z', key, 'u'));
  assert.throws(() => decryptMfaSecret('v1.eA.eQ.eg', key, 'u'));
  assert.throws(() => decryptMfaSecret(`${encrypted}.extra`, key, 'u'));
  assert.throws(() => encryptMfaSecret(Buffer.alloc(20), `${'A'.repeat(42)}B=`, 'u'));
  assert.throws(() => totpForCounter(Buffer.alloc(20), -1));
  assert.throws(() => totpForCounter(Buffer.alloc(20), 1, 7));
  assert.equal(matchTotpCounter(Buffer.alloc(20), '123456', -1, -1), null);
});
