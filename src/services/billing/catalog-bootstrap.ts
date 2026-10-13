import type pg from 'pg';
import { planCatalogChanges, type CatalogPlan } from './plan-catalog';

async function writeLimits(client: pg.Client | pg.PoolClient, plan: CatalogPlan) {
  await client.query(`UPDATE plans SET monthly_ai_limit=$2,monthly_pdf_limit=$3,monthly_crm_limit=$4,monthly_regulation_limit=$5,
    monthly_profit_analysis_limit=$6,storage_max_bytes=$7,max_documents=$8,is_trial=$9 WHERE id=$1`,
    [plan.id, plan.monthlyAiLimit, plan.monthlyPdfLimit, plan.monthlyCrmLimit, plan.monthlyRegulationLimit,
      plan.monthlyProfitAnalysisLimit, plan.storageMaxBytes, plan.maxDocuments, plan.isTrial]);
}

/** Add missing catalog entries and safely backfill reviewed public presentation metadata. */
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
      ifc_max_file_mb AS "ifcMaxFileMb", ifc_max_concurrent AS "ifcMaxConcurrent", is_active AS "isActive",
      is_published AS "isPublished", is_featured AS "isFeatured", display_order AS "displayOrder",
      marketing_badge AS "marketingBadge", marketing_description AS "marketingDescription",
      monthly_ai_limit AS "monthlyAiLimit", monthly_pdf_limit AS "monthlyPdfLimit", monthly_crm_limit AS "monthlyCrmLimit",
      monthly_regulation_limit AS "monthlyRegulationLimit", monthly_profit_analysis_limit AS "monthlyProfitAnalysisLimit",
      storage_max_bytes::float8 AS "storageMaxBytes", max_documents AS "maxDocuments", is_trial AS "isTrial" FROM plans`);
    const changes = planCatalogChanges(rows);
    if (apply && (changes.insert.length || changes.presentationUpdates.length || changes.limitUpdates.length)) {
      for (const plan of changes.insert) {
        await client.query(`INSERT INTO plans (id,name,monthly_price,monthly_quote_limit,monthly_ifc_limit,ifc_max_file_mb,ifc_max_concurrent,is_active,is_published,is_featured,display_order,marketing_badge,marketing_description)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [plan.id, plan.name, plan.monthlyPrice, plan.monthlyQuoteLimit, plan.monthlyIfcLimit, plan.ifcMaxFileMb, plan.ifcMaxConcurrent, plan.isActive, plan.isPublished, plan.isFeatured, plan.displayOrder, plan.marketingBadge, plan.marketingDescription]);
        await writeLimits(client, plan);
      }
      for (const plan of changes.limitUpdates) await writeLimits(client, plan);
      for (const plan of changes.presentationUpdates) {
        await client.query(`UPDATE plans SET is_published=$2,is_featured=$3,display_order=$4,marketing_badge=$5,marketing_description=$6 WHERE id=$1`,
          [plan.id, plan.isPublished, plan.isFeatured, plan.displayOrder, plan.marketingBadge, plan.marketingDescription]);
      }
      await client.query('INSERT INTO admin_audit_logs (admin_id,action,details) VALUES ($1,$2,$3::jsonb)',
        [actorId, 'plan_catalog.bootstrapped', JSON.stringify({ version: changes.version, insertedPlanIds: changes.insert.map(p => p.id), presentationUpdatedPlanIds: changes.presentationUpdates.map(p => p.id), limitBackfilledPlanIds: changes.limitUpdates.map(p => p.id), preservedPlanIds: changes.existing })]);
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    return { ...changes, applied: apply, insertedCount: apply ? changes.insert.length : 0, presentationUpdatedCount: apply ? changes.presentationUpdates.length : 0, limitBackfilledCount: apply ? changes.limitUpdates.length : 0 };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}
