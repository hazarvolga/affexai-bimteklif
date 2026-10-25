/**
 * T43 coverage gate. Reads c8's json-summary (all src files, loaded or not),
 * checks the project floor and each critical scope against coverage-thresholds.json,
 * and prints a Markdown report (also appended to $GITHUB_STEP_SUMMARY in CI).
 *
 * Floors are a ratchet: they equal the measured baseline and may only go up.
 * The 80% project target is reported, not faked; see docs/audits/phase-7/.
 *
 *   pnpm exec tsx scripts/ci/coverage-gate.ts [summaryPath] [thresholdsPath]
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const METRICS = ['lines', 'branches', 'functions'] as const;
export type Metric = typeof METRICS[number];
type Floors = Record<Metric, number>;
interface Counter { total: number; covered: number }
export type CoverageSummary = Record<string, Record<Metric, Counter>>;

export interface ScopeThreshold extends Floors { name: string; paths: string[] }
export interface CoverageThresholds { target: number; project: Floors; critical: ScopeThreshold[] }
export interface ScopeResult { name: string; files: number; pct: Floors; floors: Floors; failures: Metric[] }
export interface GateResult { target: number; project: ScopeResult; critical: ScopeResult[]; passed: boolean }

const pct = (counter: Counter): number => counter.total === 0 ? 100 : Math.floor((10_000 * counter.covered) / counter.total) / 100;

function measure(name: string, files: Array<Record<Metric, Counter>>, floors: Floors): ScopeResult {
  const sums = Object.fromEntries(METRICS.map(metric => [metric, files.reduce<Counter>(
    (sum, file) => ({ total: sum.total + file[metric].total, covered: sum.covered + file[metric].covered }), { total: 0, covered: 0 },
  )])) as Record<Metric, Counter>;
  const measured = Object.fromEntries(METRICS.map(metric => [metric, pct(sums[metric])])) as Floors;
  return { name, files: files.length, pct: measured, floors, failures: METRICS.filter(metric => measured[metric] < floors[metric]) };
}

/** Pure evaluation; `root` turns c8's absolute keys into repo-relative paths. */
export function evaluateCoverage(summary: CoverageSummary, thresholds: CoverageThresholds, root: string): GateResult {
  const files = Object.entries(summary)
    .filter(([key]) => key !== 'total')
    .map(([key, value]) => ({ path: relative(root, key).split('\\').join('/'), value }));
  if (files.length === 0) throw new Error('Coverage summary has no files; did c8 run with "all": true?');
  const project = measure('project (src/**)', files.map(file => file.value), thresholds.project);
  const critical = thresholds.critical.map(scope => {
    const matched = files.filter(file => scope.paths.some(prefix => file.path.startsWith(prefix)));
    if (matched.length === 0) throw new Error(`Critical scope "${scope.name}" matched no files`);
    return measure(scope.name, matched.map(file => file.value), scope);
  });
  return { target: thresholds.target, project, critical, passed: [project, ...critical].every(scope => scope.failures.length === 0) };
}

export function renderReport(result: GateResult): string {
  const cell = (scope: ScopeResult, metric: Metric) => `${scope.pct[metric].toFixed(2)}% (≥${scope.floors[metric]})${scope.failures.includes(metric) ? ' ❌' : ''}`;
  const row = (scope: ScopeResult) => `| ${scope.name} | ${scope.files} | ${METRICS.map(metric => cell(scope, metric)).join(' | ')} |`;
  const gap = (result.target - result.project.pct.lines).toFixed(2);
  return [
    '## Coverage (T43)',
    '',
    `Project line coverage ${result.project.pct.lines.toFixed(2)}% against the ${result.target}% target (gap ${gap} points). Floors are the measured ratchet baseline.`,
    '',
    '| Scope | Files | Lines | Branches | Functions |',
    '|---|---:|---:|---:|---:|',
    row(result.project),
    ...result.critical.map(row),
    '',
    result.passed ? 'Result: PASS (no scope below its floor)' : 'Result: FAIL (coverage dropped below a ratchet floor)',
    '',
  ].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const summaryPath = resolve(process.argv[2] ?? 'coverage/coverage-summary.json');
  const thresholdsPath = resolve(process.argv[3] ?? 'coverage-thresholds.json');
  try {
    const result = evaluateCoverage(
      JSON.parse(readFileSync(summaryPath, 'utf8')) as CoverageSummary,
      JSON.parse(readFileSync(thresholdsPath, 'utf8')) as CoverageThresholds,
      process.cwd(),
    );
    const report = renderReport(result);
    process.stdout.write(report);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
    process.exitCode = result.passed ? 0 : 1;
  } catch (error) {
    console.error('Coverage gate could not evaluate the report:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
