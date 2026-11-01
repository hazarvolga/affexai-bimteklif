import assert from 'node:assert/strict';
import test from 'node:test';
import dotenv from 'dotenv';
import { useTestIsolation } from '../../server/routes/test-isolation';
dotenv.config({ path: '.env.local' });
useTestIsolation();

test('bootstrap is atomic, idempotent, audited and preserves existing tenant entitlement and usage', async () => {
  const [{ pool }, { bootstrapPlanCatalog }, { canonicalPlans }] = await Promise.all([
    import('../../db'), import('./catalog-bootstrap'), import('./plan-catalog'),
  ]);
  const client = await pool.connect();
  try {
    const { rows: [actor] } = await client.query("INSERT INTO users (email,full_name,is_super_admin) VALUES ('catalog@example.test','Catalog admin',true) RETURNING id");
    const { rows: [company] } = await client.query("INSERT INTO companies (name) VALUES ('Unchanged tenant') RETURNING id");
    await client.query("INSERT INTO subscriptions (company_id,plan,bonus_quote_limit) VALUES ($1,'starter',7)", [company.id]);
    await client.query("INSERT INTO usage_records (company_id,period,quote_count,ifc_count) VALUES ($1,'2026-10',3,1)", [company.id]);
    const before = (await client.query('SELECT row_to_json(s) AS value FROM subscriptions s')).rows;
    const beforeUsage = (await client.query('SELECT row_to_json(u) AS value FROM usage_records u')).rows;
    assert.equal((await bootstrapPlanCatalog(client, actor.id)).insertedCount, 0);
    assert.equal((await client.query('SELECT count(*)::int AS count FROM plans')).rows[0].count, 0);
    const other = await pool.connect();
    try {
      const concurrent = await Promise.all([bootstrapPlanCatalog(client, actor.id, true), bootstrapPlanCatalog(other, actor.id, true)]);
      assert.deepEqual(concurrent.map(result => result.insertedCount).sort(), [0, 5]);
    } finally { other.release(); }
    assert.equal((await bootstrapPlanCatalog(client, actor.id, true)).insertedCount, 0);
    assert.equal((await client.query('SELECT count(*)::int AS count FROM admin_audit_logs')).rows[0].count, 1);
    assert.deepEqual((await client.query('SELECT row_to_json(s) AS value FROM subscriptions s')).rows, before);
    assert.deepEqual((await client.query('SELECT row_to_json(u) AS value FROM usage_records u')).rows, beforeUsage);
    await client.query('DELETE FROM plans WHERE id=$1', [canonicalPlans[4].id]);
    await client.query('UPDATE plans SET monthly_price=1 WHERE id=$1', [canonicalPlans[0].id]);
    const tuned = await bootstrapPlanCatalog(client, actor.id, true);
    assert.equal(tuned.insertedCount, 1);
    assert.deepEqual(tuned.preserved, [{ id: canonicalPlans[0].id, name: canonicalPlans[0].name, fields: ['monthlyPrice'] }]);
    assert.equal((await client.query('SELECT monthly_price AS price FROM plans WHERE id=$1', [canonicalPlans[0].id])).rows[0].price, 1, 'panel price survives bootstrap');
    await client.query('UPDATE users SET is_super_admin=false WHERE id=$1', [actor.id]);
    await assert.rejects(bootstrapPlanCatalog(client, actor.id, true), /CATALOG_SUPERADMIN_REQUIRED/);
  } finally { client.release(); }
});

test('bootstrap backfills limits on catalog plans created before limit columns existed', async () => {
  const [{ pool }, { bootstrapPlanCatalog }, { canonicalPlans }] = await Promise.all([
    import('../../db'), import('./catalog-bootstrap'), import('./plan-catalog'),
  ]);
  const client = await pool.connect();
  try {
    const { rows: [actor] } = await client.query("INSERT INTO users (email,full_name,is_super_admin) VALUES ('limits@example.test','Limits admin',true) RETURNING id");
    await client.query('DELETE FROM plans');
    const legacy = canonicalPlans[3];
    await client.query(`INSERT INTO plans (id,name,monthly_price,monthly_quote_limit,monthly_ifc_limit,ifc_max_file_mb,ifc_max_concurrent,is_active,is_published,is_featured,display_order,marketing_badge,marketing_description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [legacy.id, legacy.name, legacy.monthlyPrice, legacy.monthlyQuoteLimit, legacy.monthlyIfcLimit, legacy.ifcMaxFileMb, legacy.ifcMaxConcurrent, legacy.isActive, legacy.isPublished, legacy.isFeatured, legacy.displayOrder, legacy.marketingBadge, legacy.marketingDescription]);
    const result = await bootstrapPlanCatalog(client, actor.id, true);
    assert.equal(result.insertedCount, 4);
    assert.equal(result.limitBackfilledCount, 1);
    const { rows } = await client.query('SELECT id, monthly_ai_limit AS ai, storage_max_bytes::float8 AS storage, is_trial AS trial FROM plans ORDER BY display_order');
    assert.deepEqual(rows.map(row => [row.ai, row.storage, row.trial]), canonicalPlans.map(p => [p.monthlyAiLimit, p.storageMaxBytes, p.isTrial]));
    await client.query('UPDATE plans SET monthly_ai_limit=7 WHERE id=$1', [legacy.id]);
    assert.equal((await bootstrapPlanCatalog(client, actor.id, true)).limitBackfilledCount, 0);
    assert.equal((await client.query('SELECT monthly_ai_limit AS ai FROM plans WHERE id=$1', [legacy.id])).rows[0].ai, 7, 'admin-set limits survive bootstrap');
  } finally { client.release(); }
});
