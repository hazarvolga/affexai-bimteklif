import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAudit } from '../../../scripts/dependency-audit-policy.mjs';

const finding = {
  module_name: 'extract-zip', severity: 'high', url: 'https://github.com/advisories/GHSA-jmr9-qjv8-65gv',
  findings: [{ paths: ['.>puppeteer>@puppeteer/browsers>extract-zip'] }],
};
const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
const report = (value = finding) => ({ metadata: { vulnerabilities: { ...counts, [value.severity]: 1 } }, advisories: { one: value } });

test('every high or critical finding blocks, with no exceptions', () => {
  for (const changed of [
    finding,
    { ...finding, severity: 'critical' },
    { ...finding, url: 'https://github.com/advisories/new-advisory' },
    { ...finding, module_name: 'other' },
    { ...finding, findings: [{ paths: ['.>extract-zip'] }] },
    { ...finding, findings: [] },
  ]) assert.equal(evaluateAudit(report(changed)).blocked.length, 1);
});

test('audit rejects unavailable reports instead of reporting a clean scan', () => {
  for (const malformed of [{}, { error: 'network unavailable' }, { metadata: { vulnerabilities: {} } }]) {
    assert.throws(() => evaluateAudit(malformed));
  }
});

test('audit rejects malformed containers, counts and advisory fields', () => {
  const valid = report();
  const malformed: unknown[] = [
    null, [], { ...valid, advisories: [] }, { ...valid, advisories: 'unsupported' },
    { ...valid, metadata: { vulnerabilities: {} } },
    ...[-1, 1.5, '1', NaN, Infinity, null].map(high => ({ ...valid, metadata: { vulnerabilities: { ...counts, high } } })),
    ...[null, {}, { ...finding, module_name: '' }, { ...finding, url: null },
      { ...finding, findings: {} }, { ...finding, findings: [null] },
      { ...finding, findings: [{}] }, { ...finding, findings: [{ paths: 'path' }] },
      { ...finding, findings: [{ paths: [null] }] },
    ].map(value => ({ ...valid, advisories: { one: value } })),
  ];
  for (const value of malformed) assert.throws(() => evaluateAudit(value));
});

test('audit rejects missing and unknown severity instead of silently skipping it', () => {
  for (const severity of [undefined, null, '', 'HIGH', 'unknown']) {
    assert.throws(() => evaluateAudit({ ...report(), advisories: { one: { ...finding, severity } } }));
  }
});

test('audit rejects summary and advisory count inconsistencies', () => {
  for (const high of [0, 2]) {
    assert.throws(() => evaluateAudit({ ...report(), metadata: { vulnerabilities: { ...counts, high } } }));
  }
  for (const severity of Object.keys(counts)) {
    assert.throws(() => evaluateAudit({ metadata: { vulnerabilities: { ...counts, [severity]: 1 } }, advisories: {} }));
  }
});

test('audit accepts a complete clean report and valid lower-severity findings', () => {
  assert.deepEqual(evaluateAudit({ metadata: { vulnerabilities: counts }, advisories: {} }).blocked, []);
  for (const severity of ['info', 'low', 'moderate']) {
    const result = evaluateAudit(report({ ...finding, severity }));
    assert.deepEqual(result.blocked, []);
  }
});
