import test from 'node:test';
import assert from 'node:assert/strict';
import { formatUsagePeriodUtc } from './billing-period-display';

test('formats the exclusive UTC month boundary independently of local timezone', () => {
  assert.equal(formatUsagePeriodUtc('2026-11-01T00:00:00.000Z'), '01.11.2026 00:00 UTC');
  assert.equal(formatUsagePeriodUtc('2026-10-31T21:00:00-03:00'), '01.11.2026 00:00 UTC');
});

test('does not invent an end date for missing, malformed, or timezone-free data', () => {
  for (const input of [undefined, null, '', 'invalid', '2026-11-01', '2026-11-01T00:00:00', '2026-02-30T00:00:00Z', 123]) {
    assert.equal(formatUsagePeriodUtc(input), null);
  }
});
