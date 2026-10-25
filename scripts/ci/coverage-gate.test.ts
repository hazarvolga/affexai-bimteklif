import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateCoverage, renderReport, type CoverageSummary, type CoverageThresholds } from './coverage-gate';

const file = (lines: [number, number], branches: [number, number] = [0, 0], functions: [number, number] = [0, 0]) => ({
  lines: { total: lines[0], covered: lines[1] },
  branches: { total: branches[0], covered: branches[1] },
  functions: { total: functions[0], covered: functions[1] },
});
const summary: CoverageSummary = {
  total: file([0, 0]),
  '/repo/src/server/auth/session.ts': file([100, 90], [10, 9], [4, 4]),
  '/repo/src/pages/Landing.tsx': file([300, 0], [2, 0], [5, 0]),
};
const thresholds = (projectLines: number, authLines: number): CoverageThresholds => ({
  target: 80,
  project: { lines: projectLines, branches: 0, functions: 0 },
  critical: [{ name: 'auth', paths: ['src/server/auth/'], lines: authLines, branches: 80, functions: 100 }],
});

test('counts never-loaded files so the project number is not inflated', () => {
  const result = evaluateCoverage(summary, thresholds(22, 90), '/repo');
  assert.equal(result.project.pct.lines, 22.5);
  assert.equal(result.project.files, 2);
  assert.equal(result.passed, true);
});

test('tracks critical scopes separately from the project number', () => {
  const result = evaluateCoverage(summary, thresholds(22, 90), '/repo');
  assert.deepEqual(result.critical.map(scope => [scope.name, scope.files, scope.pct.lines, scope.pct.branches]), [['auth', 1, 90, 90]]);
});

test('fails when any scope drops below its ratchet floor', () => {
  const result = evaluateCoverage(summary, thresholds(22, 95), '/repo');
  assert.equal(result.passed, false);
  assert.deepEqual(result.critical[0].failures, ['lines']);
  assert.match(renderReport(result), /Result: FAIL/);
});

test('reports the honest gap to the 80% target', () => {
  assert.match(renderReport(evaluateCoverage(summary, thresholds(22, 90), '/repo')), /22\.50% against the 80% target \(gap 57\.50 points\)/);
});

test('refuses a scope that matches no files instead of passing vacuously', () => {
  const broken = { ...thresholds(0, 0), critical: [{ name: 'typo', paths: ['src/nope/'], lines: 0, branches: 0, functions: 0 }] };
  assert.throws(() => evaluateCoverage(summary, broken, '/repo'), /matched no files/);
});
