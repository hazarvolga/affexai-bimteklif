import { pathToFileURL } from 'node:url';
import { connect, connectDeployment, parseTarget } from './safety';
import { adoptBaseline, applyMigrations, loadMigrations } from './runner';
import { catalog } from './catalog';

export async function main(args = process.argv.slice(2)) {
  const [mode, ...extra] = args;
  if (!['plan', 'apply', 'inspect', 'adopt-baseline'].includes(mode) || extra.length) throw new Error('Usage: cli.ts plan|apply|inspect|adopt-baseline');
  const migrations = await loadMigrations();
  if (mode === 'plan') {
    console.log(JSON.stringify(migrations.map(({ statements, ...entry }) => ({ ...entry, statements: statements.length })), null, 2));
    return;
  }
  const raw = process.env.RELEASE_DATABASE_URL ?? '';
  const client = process.env.RELEASE_ALLOW_PRODUCTION === 'true'
    ? await connectDeployment(raw)
    : await connect(parseTarget(raw, 'target'));
  try {
    if (mode === 'inspect') console.log(JSON.stringify(await catalog(client), null, 2));
    else if (mode === 'adopt-baseline') {
      await adoptBaseline(client, migrations, process.env.RELEASE_VERIFIED_BASELINE_SIGNATURE ?? '');
      console.log('Explicit baseline adoption recorded; no schema SQL executed');
    } else console.log(JSON.stringify({ applied: await applyMigrations(client, migrations) }));
  } finally { await client.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
