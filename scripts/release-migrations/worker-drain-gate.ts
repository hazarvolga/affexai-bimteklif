import type pg from 'pg';

export async function assertSmartCheckWorkersDrained(
  client: Pick<pg.Client, 'query'>,
  env: Record<string, string | undefined> = process.env,
) {
  if (env.RELEASE_WORKERS_DRAINED !== 'true') {
    throw new Error('Release apply requires RELEASE_WORKERS_DRAINED=true after both SmartCheck workers are stopped');
  }
  const schema = env.GRAPHILE_WORKER_SCHEMA || 'teklifpro_queue';
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) throw new Error('Invalid GRAPHILE_WORKER_SCHEMA for release drain gate');

  const runTable = await client.query<{ relation: string | null }>("SELECT to_regclass('public.document_processing_runs')::text AS relation");
  if (runTable.rows[0]?.relation) {
    const running = await client.query<{ count: number }>("SELECT count(*)::int AS count FROM public.document_processing_runs WHERE status='running'");
    if ((running.rows[0]?.count ?? 0) !== 0) throw new Error('Release blocked: SmartCheck running runs must be zero');
  }

  const queueTable = `${schema}._private_jobs`;
  const jobTable = await client.query<{ relation: string | null }>('SELECT to_regclass($1)::text AS relation', [queueTable]);
  if (jobTable.rows[0]?.relation) {
    const locked = await client.query<{ count: number }>(`SELECT count(*)::int AS count FROM "${schema}"._private_jobs WHERE locked_at IS NOT NULL`);
    if ((locked.rows[0]?.count ?? 0) !== 0) throw new Error('Release blocked: locked Graphile jobs must be zero');
  }
}
