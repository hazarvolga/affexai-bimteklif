import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Registry checked 2026-10-08: extract-zip 2.0.2 is not published.
// Only the disabled Puppeteer browser-download path is temporarily admitted.
const temporary = new Set([
  'https://github.com/advisories/GHSA-jmr9-qjv8-65gv',
  'https://github.com/advisories/GHSA-7pqw-9j4j-h8q3',
]);
const expires = new Date('2026-10-22T00:00:00Z');
const severities = ['info', 'low', 'moderate', 'high', 'critical'];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = value => typeof value === 'string' && value.trim().length > 0;

function validatedFindings(report) {
  if (!isRecord(report) || 'error' in report || !isRecord(report.metadata)
      || !isRecord(report.metadata.vulnerabilities) || !isRecord(report.advisories)) {
    throw new Error('Audit report unavailable or unsupported');
  }
  const summary = report.metadata.vulnerabilities;
  if (Object.keys(summary).some(key => !severities.includes(key))
      || severities.some(key => !Number.isSafeInteger(summary[key]) || summary[key] < 0)) {
    throw new Error('Invalid audit vulnerability summary');
  }
  const findings = Object.values(report.advisories);
  for (const finding of findings) {
    if (!isRecord(finding) || !severities.includes(finding.severity)
        || !isText(finding.module_name) || !isText(finding.url) || !Array.isArray(finding.findings)
        || finding.findings.some(entry => !isRecord(entry) || !Array.isArray(entry.paths) || !entry.paths.every(isText))) {
      throw new Error('Invalid or unsupported audit advisory');
    }
  }
  // pnpm's advisory-format summary counts advisories, not dependency paths.
  if (severities.some(severity => summary[severity] !== findings.filter(finding => finding.severity === severity).length)) {
    throw new Error('Audit summary does not match advisory counts');
  }
  return findings;
}

export function evaluateAudit(report, now = new Date()) {
  const findings = validatedFindings(report);
  const accepted = [];
  const blocked = [];
  for (const finding of findings) {
    if (!['high', 'critical'].includes(finding.severity)) continue;
    const paths = finding.findings.flatMap(entry => entry.paths);
    const downloadOnly = paths.length > 0 && paths.every(path => /^\.>puppeteer>(?:puppeteer-core>)?@puppeteer\/browsers>extract-zip$/.test(path));
    if (finding.severity === 'high' && finding.module_name === 'extract-zip' && temporary.has(finding.url) && downloadOnly && now < expires) {
      accepted.push(finding.url);
    } else blocked.push({ module: finding.module_name, severity: finding.severity, url: finding.url });
  }
  return { accepted, blocked, exceptionExpires: expires.toISOString() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = spawnSync('pnpm', ['audit', '--prod', '--json'], { encoding: 'utf8', timeout: 120000 });
    if (result.error || result.signal || ![0, 1].includes(result.status)) throw new Error('Dependency audit did not complete');
    const policy = evaluateAudit(JSON.parse(result.stdout));
    console.log(JSON.stringify(policy, null, 2));
    process.exitCode = policy.blocked.length ? 1 : 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Dependency audit failed');
    process.exitCode = 1;
  }
}
