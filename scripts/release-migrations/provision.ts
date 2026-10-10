import { connect, disposableNames, identifier, parseTarget, type Target } from './safety';

export async function provision(rawControlUrl: string) {
  const controlTarget = parseTarget(rawControlUrl, 'control');
  const control = await connect(controlTarget);
  const owned: Array<{ name: string; oid: number }> = [];
  const cleanup = async () => {
    try {
      for (const database of [...owned].reverse()) {
        const { rows: [current] } = await control.query('select oid from pg_database where datname=$1', [database.name]);
        if (!current || current.oid !== database.oid) throw new Error(`Refusing cleanup: database ownership changed for ${database.name}`);
        await control.query(`drop database ${identifier(database.name)}`);
      }
    } finally { await control.end(); }
  };
  try {
    const existing = await control.query('select datname from pg_database where datname=any($1::text[])', [disposableNames]);
    if (existing.rowCount) throw new Error(`Refusing pre-existing disposable databases: ${existing.rows.map((r) => r.datname).join(', ')}`);
    for (const name of disposableNames) {
      await control.query(`create database ${identifier(name)} template template0`);
      const { rows: [row] } = await control.query('select oid from pg_database where datname=$1', [name]);
      owned.push({ name, oid: row.oid });
    }
    const targets = disposableNames.map((database): Target => ({ ...controlTarget, database }));
    return { targets, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
