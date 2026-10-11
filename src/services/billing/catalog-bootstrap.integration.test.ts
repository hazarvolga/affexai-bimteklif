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
    await assert.rejects(bootstrapPlanCatalog(client, actor.id, true), /CATALOG_CONFLICT/);
    assert.equal((await client.query('SELECT count(*)::int AS count FROM plans')).rows[0].count, 4, 'conflict never partially inserts missing plans');
    await client.query('UPDATE users SET is_super_admin=false WHERE id=$1', [actor.id]);
    await assert.rejects(bootstrapPlanCatalog(client, actor.id, true), /CATALOG_SUPERADMIN_REQUIRED/);
  } finally { client.release(); }
});
