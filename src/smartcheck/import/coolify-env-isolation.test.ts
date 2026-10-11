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
    const override = path.join(directory, 'override.json');
    writeFileSync(override, JSON.stringify({ services: Object.fromEntries(services.map(service => [service, { env_file: [envFile] }])) }));
    const output = execFileSync('docker', ['compose', '--env-file', envFile, '-f', path.resolve('compose.coolify.yaml'), '-f', override, 'config', '--format', 'json'], {
      encoding: 'utf8', timeout: 15_000, env: { ...process.env, ...fixtures },
    });
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
