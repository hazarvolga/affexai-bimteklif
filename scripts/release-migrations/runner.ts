import { readFile } from 'node:fs/promises';
import type pg from 'pg';
import { releaseDirectory, ledgerSchema } from './config';
import { catalog, sha256 } from './catalog';
import { requireMigrationTarget, requireEmpty } from './safety';
import { pinnedSignature } from './stage-signatures';

export interface Migration { idx: number; tag: string; sha256: string; snapshotSha256: string; statements: string[] }

export async function loadMigrations(): Promise<Migration[]> {
  const manifest = JSON.parse(await readFile(`${releaseDirectory}/manifest.json`, 'utf8'));
  const journal = JSON.parse(await readFile(`${releaseDirectory}/meta/_journal.json`, 'utf8'));
  if (manifest.version !== 1 || manifest.migrations.length !== journal.entries.length) throw new Error('Release manifest/journal mismatch');
  const migrations: Migration[] = [];
  for (const [idx, item] of manifest.migrations.entries()) {
    if (item.idx !== idx || item.tag !== journal.entries[idx].tag || !/^\d{4}_[a-z_]+$/.test(item.tag)) throw new Error('Invalid release migration order');
    const sql = await readFile(`${releaseDirectory}/${item.tag}.sql`, 'utf8');
    const snapshot = await readFile(`${releaseDirectory}/meta/${String(idx).padStart(4, '0')}_snapshot.json`, 'utf8');
    if (sha256(sql) !== item.sha256 || sha256(snapshot) !== item.snapshotSha256) throw new Error('Release artifact checksum mismatch');
    const statements = sql.split('--> statement-breakpoint').map((text) => text.trim()).filter(Boolean);
    if (statements.length !== item.statements) throw new Error('Release statement count mismatch');
    migrations.push({ ...item, statements });
  }
  return migrations;
}

async function createLedger(client: pg.Client) {
  await client.query(`create schema ${ledgerSchema}`);
  await client.query(`create table ${ledgerSchema}.migrations (
    idx integer primary key, tag text not null unique, hash text not null,
    catalog_hash text not null, mode text not null check (mode in ('applied','adopted')),
    recorded_at timestamptz not null default now())`);
}

async function history(client: pg.Client, migrations: Migration[]) {
  const { rows: [exists] } = await client.query("select to_regclass('teklifpro_release.migrations') as table_name");
  if (!exists.table_name) return null;
  const { rows } = await client.query(`select idx,tag,hash,catalog_hash from ${ledgerSchema}.migrations order by idx`);
  if (!rows.length) throw new Error('Empty release ledger is not an approved baseline');
  for (const [idx, row] of rows.entries()) {
    if (row.idx !== idx || row.tag !== migrations[idx]?.tag || row.hash !== migrations[idx]?.sha256) throw new Error('Unknown or modified migration history');
    if (row.catalog_hash !== pinnedSignature(migrations[idx])) throw new Error('Ledger differs from pinned release signature');
  }
  if ((await catalog(client)).signature !== pinnedSignature(migrations[rows.length - 1])) throw new Error('Schema drift from pinned release signature');
  return rows;
}

async function transaction<T>(client: pg.Client, action: () => Promise<T>) {
  await requireMigrationTarget(client);
  await client.query('begin');
  try {
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='30s'");
    await client.query("set local search_path=public,pg_catalog");
    await client.query("select pg_advisory_xact_lock(707071)");
    const result = await action();
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

export async function applyMigrations(client: pg.Client, migrations: Migration[], through = migrations.length - 1) {
  for (const migration of migrations) pinnedSignature(migration);
  return transaction(client, async () => {
    const rows = await history(client, migrations);
    if (!rows) { await requireEmpty(client); await createLedger(client); }
    const applied: string[] = [];
    for (const migration of migrations.slice(rows?.length ?? 0, through + 1)) {
      for (const statement of migration.statements) await client.query(statement);
      const { signature } = await catalog(client);
      const expectedSignature = pinnedSignature(migration);
      if (signature !== expectedSignature) throw new Error(`Applied catalog differs from pinned release signature at ${migration.tag}: expected ${expectedSignature}, received ${signature}`);
      await client.query(`insert into ${ledgerSchema}.migrations (idx,tag,hash,catalog_hash,mode) values ($1,$2,$3,$4,'applied')`,
        [migration.idx, migration.tag, migration.sha256, signature]);
      applied.push(migration.tag);
    }
    return applied;
  });
}

// Operator confirmation cannot override the independently verified release pin.
export async function adoptBaseline(client: pg.Client, migrations: Migration[], expectedSignature: string) {
  if (!/^[a-f0-9]{64}$/.test(expectedSignature)) throw new Error('Explicit verified baseline signature required');
  const baseline = migrations[0];
  if (!baseline || baseline.idx !== 0 || expectedSignature !== pinnedSignature(baseline)) throw new Error('Adoption signature mismatch with pinned release baseline');
  return transaction(client, async () => {
    const { rows: [exists] } = await client.query("select to_regnamespace('teklifpro_release') as name");
    if (exists.name) throw new Error('Adoption refuses existing release metadata');
    if ((await catalog(client)).signature !== expectedSignature) throw new Error('Adoption signature mismatch');
    await createLedger(client);
    await client.query(`insert into ${ledgerSchema}.migrations (idx,tag,hash,catalog_hash,mode) values (0,$1,$2,$3,'adopted')`,
      [baseline.tag, baseline.sha256, expectedSignature]);
  });
}
