import assert from 'node:assert/strict';
import test from 'node:test';
import { signAiLine, verifyAiLine, compareAiLine } from './quotation-provenance';

const actor = { companyId: 'company-a', userId: 'user-a' };
const line = { description: 'Beton', unit: 'm3', quantity: 4, unitPrice: 25 };
const secret = 'a'.repeat(48);

test('server-signed suggestion is scoped to tenant and actor and detects modifications', () => {
  const token = signAiLine(line, actor, secret, 1000);
  const original = verifyAiLine(token, actor, secret, 1001);
  assert.deepEqual(original.line, line);
  assert.deepEqual(compareAiLine(original.line, { ...line, quantity: 5 }), ['quantity']);
  assert.throws(() => verifyAiLine(token, { ...actor, companyId: 'company-b' }, secret, 1001));
  assert.throws(() => verifyAiLine(token, { ...actor, userId: 'user-b' }, secret, 1001));
  assert.throws(() => verifyAiLine(token + 'x', actor, secret, 1001));
  assert.throws(() => verifyAiLine(token, actor, secret, 1000 + 86401));
});

test('suggestion bounds reject invalid provider values', () => {
  assert.throws(() => signAiLine({ ...line, quantity: -1 }, actor, secret, 1000));
  assert.throws(() => signAiLine({ ...line, description: 'x'.repeat(1001) }, actor, secret, 1000));
});

test('provider numeric fields reject null, booleans and empty strings without coercing them to zero', () => {
  for (const field of ['quantity', 'unitPrice'] as const) {
    for (const value of [null, false, true, '', '   ', undefined]) {
      assert.throws(() => signAiLine({ ...line, [field]: value }, actor, secret, 1000), `${field}: ${String(value)}`);
    }
    assert.doesNotThrow(() => signAiLine({ ...line, [field]: 0 }, actor, secret, 1000));
    assert.doesNotThrow(() => signAiLine({ ...line, [field]: '0' }, actor, secret, 1000));
  }
});
