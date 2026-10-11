import type pg from 'pg';
import { ALLPLAN_PROGRAM_VERSION } from '../../academy/allplan/certification';

/** Restore the versioned reference catalog only, never the legacy automatic enrollments. */
export async function bootstrapAcademyCatalog(client: pg.Client | pg.PoolClient, actorId: string, apply = false) {
 if (!/^[a-f0-9-]{36}$/i.test(actorId)) throw new Error('CATALOG_ACTOR_REQUIRED');
 await client.query('BEGIN');
 try {
  await client.query("SET LOCAL lock_timeout='5s'");
  await client.query("SET LOCAL statement_timeout='15s'");
  await client.query('LOCK TABLE academy_products, academy_editions IN SHARE ROW EXCLUSIVE MODE');
  const actor = await client.query('SELECT id FROM users WHERE id=$1 AND is_super_admin=true FOR SHARE',[actorId]);
  if (!actor.rowCount) throw new Error('CATALOG_SUPERADMIN_REQUIRED');
  const {rows:[product]} = await client.query("SELECT id,name,is_active FROM academy_products WHERE code='allplan-pro'");
  if (product && (product.name !== 'Allplan Pro Track' || !product.is_active)) throw new Error('ACADEMY_CATALOG_CONFLICT');
  const {rows:[edition]} = product ? await client.query('SELECT id,name,access_mode,is_active FROM academy_editions WHERE product_id=$1 AND version=$2',[product.id,ALLPLAN_PROGRAM_VERSION]) : {rows:[]};
  const editionName = `Allplan Pro Pilot ${ALLPLAN_PROGRAM_VERSION}`;
  if (edition && (edition.name !== editionName || edition.access_mode !== 'free_pilot' || !edition.is_active)) throw new Error('ACADEMY_CATALOG_CONFLICT');
  const changes = {productMissing:!product,editionMissing:!edition,version:ALLPLAN_PROGRAM_VERSION};
  if (apply && (!product || !edition)) {
   const productId = product?.id ?? (await client.query("INSERT INTO academy_products(code,name) VALUES('allplan-pro','Allplan Pro Track') RETURNING id")).rows[0].id;
   if (!edition) await client.query("INSERT INTO academy_editions(product_id,version,name,access_mode) VALUES($1,$2,$3,'free_pilot')",[productId,ALLPLAN_PROGRAM_VERSION,editionName]);
   await client.query('INSERT INTO admin_audit_logs(admin_id,action,details) VALUES($1,$2,$3::jsonb)',[actorId,'academy_catalog.bootstrapped',JSON.stringify(changes)]);
  }
  await client.query(apply ? 'COMMIT' : 'ROLLBACK');
  return {...changes,applied:apply};
 } catch(error) {await client.query('ROLLBACK');throw error;}
}
