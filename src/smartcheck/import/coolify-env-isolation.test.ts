import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('Coolify shared env_file cannot expose backup credentials to other services', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'bimmetraj-compose-env-'));
  const services = ['app', 'worker', 'ifc-worker', 'migrate', 'postgres', 'backup'];
  const backupKeys = ['BACKUP_S3_BUCKET', 'BACKUP_S3_ENDPOINT', 'BACKUP_S3_ACCESS_KEY_ID', 'BACKUP_S3_SECRET_ACCESS_KEY'];
  const appSecrets = ['SMARTCHECK_S3_ACCESS_KEY_ID', 'SMARTCHECK_S3_SECRET_ACCESS_KEY', 'JWT_SECRET', 'SERVICE_HEX_64_JWT', 'OPENAI_API_KEY', 'GEMINI_API_KEY'];
  const fixtures = Object.fromEntries([...backupKeys, ...appSecrets].map(key => [key, `fixture-${key}`]));
  try {
    const envFile = path.join(directory, 'runtime.env');
    writeFileSync(envFile, Object.entries(fixtures).map(([key, value]) => `${key}=${value}`).join('\n'));
    const commandOptions = { encoding: 'utf8' as const, timeout: 15_000, env: { ...process.env, ...fixtures, BIMMETRAJ_EMPTY_ENV: '' } };
    const raw = JSON.parse(execFileSync('docker', ['compose', '--env-file', envFile, '-f', path.resolve('compose.coolify.yaml'), 'config', '--no-interpolate', '--no-env-resolution', '--format', 'json'], commandOptions));
    // Installed Coolify applicationParser (parsers.php:1958): literal empty
    // values are replaced by same-key nonempty database env values. References
    // remain intact until Compose interpolation; all services receive .env.
    const transformedServices = Object.fromEntries(services.map(service => {
      const source = raw.services[service];
      const environment = Object.fromEntries(Object.entries(source.environment as Record<string, string>).map(([key, value]) => [
        key, value === '' && fixtures[key] ? fixtures[key] : value,
      ]));
      return [service, { ...source, environment, env_file: [envFile] }];
    }));
    const generated = path.join(directory, 'generated.json');
    writeFileSync(generated, JSON.stringify({ ...raw, services: transformedServices }));
    const output = execFileSync('docker', ['compose', '--env-file', envFile, '-f', generated, 'config', '--format', 'json'], commandOptions);
    const rendered = JSON.parse(output).services as Record<string, { environment: Record<string, string> }>;
    for (const service of services) {
      for (const key of backupKeys) {
        assert.equal(rendered[service].environment[key], service === 'backup' ? fixtures[key] : '', `${service}: ${key} scope`);
      }
    }
    for (const key of appSecrets) assert.equal(rendered.backup.environment[key], '', `backup must not receive ${key}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
