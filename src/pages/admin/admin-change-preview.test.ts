import test from 'node:test';
import assert from 'node:assert/strict';
import { previewChanges, previewBanks, affectedCount, planIdentity } from './admin-change-preview';

test('change preview compares known values and never invents affected count', () => {
  assert.match(previewChanges({ monthlyPrice: 10 }, { monthlyPrice: 20 }, ['monthlyPrice']), /10 → 20/);
  assert.equal(affectedCount(undefined), 'Bilinmiyor');
  assert.equal(affectedCount(0), '0');
  assert.notEqual(planIdentity('Aynı ad', 'id-1'), planIdentity('Aynı ad', 'id-2'));
});

test('bank preview masks account numbers in both old and new configurations', () => {
  const text = previewBanks([{ bankName: 'Banka', iban: 'TR330006100519786457841326', isActive: true }], [{ bankName: 'Banka', iban: 'TR560006400000112345678901', isActive: false }]);
  assert.doesNotMatch(text, /TR330006100519786457841326|TR560006400000112345678901/);
  assert.match(text, /1326/); assert.match(text, /8901/);
  const sameSuffix = previewBanks([{ bankName: 'Banka', iban: 'TR000000000000000000001326', isActive: true }], [{ bankName: 'Banka', iban: 'TR111111111111111111111326', isActive: true }]);
  assert.match(sameSuffix, /IBAN değişti/);
  assert.doesNotMatch(sameSuffix, /TR000000000000000000001326|TR111111111111111111111326/);
});
