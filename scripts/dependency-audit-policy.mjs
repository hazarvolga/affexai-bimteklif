import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// No exceptions: every high or critical production finding blocks CI.
// The former extract-zip exception ended with Puppeteer 25 (2026-10-13).
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

export function evaluateAudit(report) {
  const blocked = validatedFindings(report)
    .filter(finding => ['high', 'critical'].includes(finding.severity))
    .map(finding => ({ module: finding.module_name, severity: finding.severity, url: finding.url }));
  return { blocked };
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
