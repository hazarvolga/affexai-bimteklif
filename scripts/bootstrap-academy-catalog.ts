import { pathToFileURL } from 'node:url';
import { connect } from './release-migrations/safety';
import { catalogTarget } from '../src/services/billing/catalog-target';
import { bootstrapAcademyCatalog } from '../src/services/billing/academy-catalog';

export async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || (args[0] && !['--plan', '--apply'].includes(args[0]))) throw new Error('Usage: bootstrap-academy-catalog.ts [--plan|--apply]');
  const target = catalogTarget(process.env.CATALOG_DATABASE_URL ?? '');
  const client = await connect(target);
  try {
    const result = await bootstrapAcademyCatalog(client, process.env.CATALOG_ACTOR_ID ?? '', args[0] === '--apply');
    console.log(JSON.stringify({ target: { host: target.host, database: target.database, user: target.user }, ...result }, null, 2));
  } finally { await client.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('Catalog bootstrap failed. Check explicit target, superadmin actor and existing catalog conflicts. No partial changes committed.'); process.exitCode = 1; });
}
