import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptMfaSecret } from './mfa-crypto';
import { areMfaSecretsReadable } from './mfa-readiness';

test('enrolled admin requires working key, absent MFA accounts keep optional setup', () => {
  const key = Buffer.alloc(32, 1).toString('base64'), other = Buffer.alloc(32, 2).toString('base64');
  const rows = [{ userId: 'u', ciphertext: encryptMfaSecret(Buffer.alloc(20), key, 'u') }];
  assert.equal(areMfaSecretsReadable([], ''), true);
  assert.equal(areMfaSecretsReadable(rows, key), true);
  assert.equal(areMfaSecretsReadable(rows, ''), false);
  assert.equal(areMfaSecretsReadable(rows, other), false);
  assert.equal(areMfaSecretsReadable([{ userId: 'u', ciphertext: null }], key), false);
});
