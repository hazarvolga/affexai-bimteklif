import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { connect, disposableNames, requireEmpty, type Target } from './safety';

const exec = promisify(execFile);
type Container = { id: string; name: string; image: string; running: boolean;
  ports: Record<string, Array<{ HostIp: string; HostPort: string }>> };

export function verifiedContainerId(value: Container, port: number, major: number) {
  if (major !== 16 || value.name !== '/teklifpro-postgres' || value.image !== 'postgres:16'
    || !value.running || !/^[a-f0-9]{64}$/.test(value.id)
    || !value.ports?.['5432/tcp']?.some((binding) => binding.HostPort === String(port)
      && ['127.0.0.1', '0.0.0.0', '::', '::1'].includes(binding.HostIp))) {
    throw new Error('Docker backup requires the verified dedicated teklifpro-postgres PostgreSQL16 container');
  }
  return value.id;
}

const dockerPrefix = (id: string, interactive = false) => ['exec', ...(interactive ? ['-i'] : []),
  '-e', 'PGPASSWORD', id, 'env', '-u', 'PGHOSTADDR', '-u', 'PGSERVICE', '-u', 'PGSERVICEFILE',
  '-u', 'PGOPTIONS', '-u', 'PGHOST', '-u', 'PGPORT', '-u', 'PGUSER', '-u', 'PGDATABASE',
  'PGSSLMODE=disable', 'PGCONNECT_TIMEOUT=3', 'PGPASSFILE=/dev/null'];
const connectionArgs = (target: Target) => ['--host=/var/run/postgresql', '--port=5432', '--username', target.user, '--dbname', target.database];

async function verifyCluster(id: string, target: Target, requireEmptyTarget: boolean) {
  const client = await connect(target);
  try {
    if (requireEmptyTarget) await requireEmpty(client);
    const query = "select json_build_object('database',current_database(),'user',current_user,'system',system_identifier::text,'version',current_setting('server_version_num')) from pg_control_system()";
    const expected = (await client.query(query)).rows[0].json_build_object;
    const { stdout } = await exec('docker', [...dockerPrefix(id), 'psql', '--no-psqlrc', ...connectionArgs(target),
      '--tuples-only', '--no-align', '--set=ON_ERROR_STOP=1', '--command', query],
    { env: { ...process.env, PGPASSWORD: target.password }, timeout: 10_000 });
    const actual = JSON.parse(stdout.trim());
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Docker and local PostgreSQL identities differ');
    if (Math.floor(Number(actual.version) / 10000) !== 16) throw new Error('Unexpected Docker PostgreSQL server version');
  } finally { await client.end(); }
}

export async function restoreViaVerifiedContainer(source: Target, target: Target, major: number) {
  if (process.env.RELEASE_POSTGRES_CONTAINER !== 'teklifpro-postgres') throw new Error('Explicit RELEASE_POSTGRES_CONTAINER=teklifpro-postgres required');
  if (!(disposableNames as readonly string[]).includes(source.database) || !(disposableNames as readonly string[]).includes(target.database)
    || source.database === target.database || source.host !== target.host || source.port !== target.port
    || !['127.0.0.1', '::1'].includes(source.host)) throw new Error('Docker backup requires distinct approved local disposable databases');
  // Inspect selected fields only, never container environment/secrets.
  const format = '{"id":{{json .Id}},"name":{{json .Name}},"image":{{json .Config.Image}},"running":{{json .State.Running}},"ports":{{json .NetworkSettings.Ports}}}';
  const inspected = await exec('docker', ['inspect', '--format', format, 'teklifpro-postgres'], { timeout: 5_000 });
  const id = verifiedContainerId(JSON.parse(inspected.stdout), source.port, major);
  for (const tool of ['pg_dump', 'pg_restore']) {
    const { stdout } = await exec('docker', ['exec', id, tool, '--version'], { timeout: 5_000 });
    if (!stdout.includes('PostgreSQL) 16.')) throw new Error(`Container ${tool} is not PostgreSQL16`);
  }
  await verifyCluster(id, source, false);
  await verifyCluster(id, target, true);
  const { stdout: archive } = await exec('docker', [...dockerPrefix(id), 'pg_dump', ...connectionArgs(source),
    '--format=custom', '--no-owner', '--no-privileges'],
  { env: { ...process.env, PGPASSWORD: source.password }, encoding: 'buffer', maxBuffer: 32 * 1024 * 1024, timeout: 30_000 });
  if (archive.subarray(0, 5).toString() !== 'PGDMP') throw new Error('Invalid PostgreSQL backup archive');
  await new Promise<void>((resolve, reject) => {
    const child = execFile('docker', [...dockerPrefix(id, true), 'pg_restore', ...connectionArgs(target),
      '--no-owner', '--no-privileges', '--exit-on-error', '--single-transaction'],
    { env: { ...process.env, PGPASSWORD: target.password }, timeout: 30_000 }, (error) => error ? reject(error) : resolve());
    child.stdin!.on('error', reject);
    child.stdin!.end(archive);
  });
  return { status: 'restored', transport: 'verified-docker-exec', container: 'teklifpro-postgres', archiveBytes: archive.length } as const;
}
