import assert from 'node:assert/strict';
import test from 'node:test';
import dotenv from 'dotenv';
import { useTestIsolation } from '../../server/routes/test-isolation';
dotenv.config({ path: '.env.local' });
useTestIsolation();
test('Academy catalog recovery is idempotent and never enrolls existing tenants', async () => {
 const [{pool}, {bootstrapAcademyCatalog}] = await Promise.all([import('../../db'),import('./academy-catalog')]);
 const client = await pool.connect();
 try {
  const {rows:[actor]} = await client.query("INSERT INTO users(email,full_name,is_super_admin) VALUES('academy-catalog@example.test','Admin',true) RETURNING id");
  await bootstrapAcademyCatalog(client,actor.id,false);
  assert.equal((await client.query('SELECT count(*)::int n FROM academy_products')).rows[0].n,0);
  await bootstrapAcademyCatalog(client,actor.id,true);
  await bootstrapAcademyCatalog(client,actor.id,true);
  assert.equal((await client.query('SELECT count(*)::int n FROM academy_products')).rows[0].n,1);
  assert.equal((await client.query('SELECT count(*)::int n FROM academy_editions')).rows[0].n,1);
  assert.equal((await client.query('SELECT count(*)::int n FROM academy_enrollments')).rows[0].n,0);
  assert.equal((await client.query('SELECT count(*)::int n FROM admin_audit_logs')).rows[0].n,1);
  await client.query("UPDATE academy_editions SET access_mode='paid'");
  await assert.rejects(bootstrapAcademyCatalog(client,actor.id,true),/ACADEMY_CATALOG_CONFLICT/);
  assert.equal((await client.query('SELECT access_mode FROM academy_editions')).rows[0].access_mode,'paid');
 } finally {client.release();}
});
