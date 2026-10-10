import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Target } from './safety';
import { restoreViaVerifiedContainer } from './backup-docker';

const exec = promisify(execFile);

async function binary(name: string, major: number) {
  const override = process.env[name === 'pg_dump' ? 'PG_DUMP' : 'PG_RESTORE'];
  const candidates = [override, name, `/opt/homebrew/opt/postgresql@${major}/bin/${name}`,
    `/usr/local/opt/postgresql@${major}/bin/${name}`, `/usr/lib/postgresql/${major}/bin/${name}`].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const { stdout } = await exec(candidate, ['--version'], { timeout: 5_000 });
      if (Number(stdout.match(/PostgreSQL\)?\s+(\d+)/)?.[1]) === major) return candidate;
    } catch { /* Try the next installed PostgreSQL client. */ }
  }
  return null;
}

export async function restoreSyntheticBackup(source: Target, target: Target, major: number) {
  const dump = await binary('pg_dump', major);
  const restore = await binary('pg_restore', major);
  if ((!dump || !restore) && process.env.RELEASE_POSTGRES_CONTAINER) return restoreViaVerifiedContainer(source, target, major);
  if (!dump || !restore) return { status: 'unavailable', reason: `PostgreSQL ${major} pg_dump/pg_restore not found; set PG_DUMP and PG_RESTORE to matching installed binaries` } as const;
  const directory = await mkdtemp(join(tmpdir(), 'teklifpro-release-backup-'));
  const file = join(directory, 'synthetic.dump');
  // Do not inherit PGHOST/PGSERVICE/PGOPTIONS or implicit connection targets.
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, PGPASSWORD: source.password, PGCONNECT_TIMEOUT: '3' };
  const args = (db: Target) => ['--host', db.host, '--port', String(db.port), '--username', db.user, '--dbname', db.database];
  try {
    await exec(dump, [...args(source), '--format=custom', '--no-owner', '--no-privileges', '--file', file], { env, timeout: 30_000 });
    await exec(restore, [...args(target), '--no-owner', '--no-privileges', '--exit-on-error', '--single-transaction', file],
      { env: { ...env, PGPASSWORD: target.password }, timeout: 30_000 });
    return { status: 'restored' } as const;
  } finally { await rm(directory, { recursive: true, force: true }); }
}
