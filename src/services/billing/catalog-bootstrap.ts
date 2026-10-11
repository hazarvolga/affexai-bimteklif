import type pg from 'pg';
import { planCatalogChanges, type CatalogPlan } from './plan-catalog';

/** Add missing catalog entries only. Existing entitlements and operational data are never rewritten. */
export async function bootstrapPlanCatalog(client: pg.Client | pg.PoolClient, actorId: string, apply = false) {
  if (!/^[a-f0-9-]{36}$/i.test(actorId)) throw new Error('CATALOG_ACTOR_REQUIRED');
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    // Prevent concurrent admin edits/insertions while identifying existing names.
    await client.query('LOCK TABLE plans IN SHARE ROW EXCLUSIVE MODE');
    const actor = await client.query('SELECT id FROM users WHERE id=$1 AND is_super_admin=true FOR SHARE', [actorId]);
    if (!actor.rowCount) throw new Error('CATALOG_SUPERADMIN_REQUIRED');
    const { rows } = await client.query<CatalogPlan>(`SELECT id, name, monthly_price AS "monthlyPrice",
      monthly_quote_limit AS "monthlyQuoteLimit", monthly_ifc_limit AS "monthlyIfcLimit",
      ifc_max_file_mb AS "ifcMaxFileMb", ifc_max_concurrent AS "ifcMaxConcurrent", is_active AS "isActive" FROM plans`);
    const changes = planCatalogChanges(rows);
    if (apply && changes.insert.length) {
      for (const plan of changes.insert) {
        await client.query(`INSERT INTO plans (id,name,monthly_price,monthly_quote_limit,monthly_ifc_limit,ifc_max_file_mb,ifc_max_concurrent,is_active)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [plan.id, plan.name, plan.monthlyPrice, plan.monthlyQuoteLimit, plan.monthlyIfcLimit, plan.ifcMaxFileMb, plan.ifcMaxConcurrent, plan.isActive]);
      }
      await client.query('INSERT INTO admin_audit_logs (admin_id,action,details) VALUES ($1,$2,$3::jsonb)',
        [actorId, 'plan_catalog.bootstrapped', JSON.stringify({ version: changes.version, insertedPlanIds: changes.insert.map(p => p.id), preservedPlanIds: changes.existing })]);
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    return { ...changes, applied: apply, insertedCount: apply ? changes.insert.length : 0 };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}
