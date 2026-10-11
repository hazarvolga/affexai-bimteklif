import type pg from 'pg';
import { pricingSourceCatalogChanges, type CatalogPricingSource } from './source-catalog';

export async function bootstrapPricingSourceCatalog(client: pg.Client | pg.PoolClient, actorId: string, apply = false) {
  if (!/^[a-f0-9-]{36}$/i.test(actorId)) throw new Error('SOURCE_CATALOG_ACTOR_REQUIRED');
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query('LOCK TABLE pricing_data_sources IN SHARE ROW EXCLUSIVE MODE');
    const actor = await client.query('SELECT id FROM users WHERE id=$1 AND is_super_admin=true FOR SHARE', [actorId]);
    if (!actor.rowCount) throw new Error('SOURCE_CATALOG_SUPERADMIN_REQUIRED');
    const { rows } = await client.query<CatalogPricingSource>(`SELECT id,code,name,authority,category,source_url AS "sourceUrl",
      country_code AS "countryCode",currency,status,sync_frequency AS "syncFrequency",item_count AS "itemCount",version_tag AS "versionTag"
      FROM pricing_data_sources`);
    const changes = pricingSourceCatalogChanges(rows);
    if (apply && changes.insert.length) {
      for (const source of changes.insert) await client.query(`INSERT INTO pricing_data_sources
        (id,code,name,authority,category,source_url,country_code,currency,status,sync_frequency,item_count,version_tag,crawler_config)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'{}'::jsonb)`,
        [source.id, source.code, source.name, source.authority, source.category, source.sourceUrl, source.countryCode, source.currency, source.status, source.syncFrequency, source.itemCount, source.versionTag]);
      await client.query('INSERT INTO admin_audit_logs (admin_id,action,details) VALUES ($1,$2,$3::jsonb)',
        [actorId, 'pricing_source_catalog.bootstrapped', JSON.stringify({ version: changes.version, insertedSourceIds: changes.insert.map(source => source.id), priceRowsInserted: 0 })]);
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    return { ...changes, applied: apply, insertedCount: apply ? changes.insert.length : 0, priceRowsInserted: 0 };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}
