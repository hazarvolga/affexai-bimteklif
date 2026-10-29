import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import pg from 'pg';

test('quotation provenance and source-first price updates do not deadlock and revalidate the locked row', { timeout: 30000 }, async () => {
  const raw = process.env.BENCHMARK_LOCK_TEST_URL;
  assert.ok(raw && process.env.NODE_ENV === 'test' && process.env.CI_DISPOSABLE_DATABASE === 'true');
  const url = new URL(raw);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/teklifpro_bootstrap_test' && url.username && !url.search && !url.hash);
  process.env.PGAPPNAME = 'benchmark-lock-quote-test';
  const writer = new pg.Client({ connectionString: raw, application_name: 'benchmark-lock-writer-test' });
  const monitor = new pg.Client({ connectionString: raw });
  await writer.connect(); await monitor.connect();
  const target = await writer.query<{ name: string; superuser: boolean; system_identifier: string }>("SELECT current_database() name, (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) superuser, system_identifier::text FROM pg_control_system()");
  assert.equal(target.rows[0].name, 'teklifpro_bootstrap_test');
  assert.equal(target.rows[0].superuser, true);
  const { makeWorkerUtils, Logger } = await import('graphile-worker');
  const worker = await makeWorkerUtils({ connectionString: raw, schema: 'teklifpro_queue', logger: new Logger(() => () => {}) });
  await worker.release();
  const credentials = Object.fromEntries(['bimmetraj_migrator','bimmetraj_app','bimmetraj_control','bimmetraj_worker','bimmetraj_backup'].map(role => [role, randomBytes(32).toString('hex')])) as Record<'bimmetraj_migrator'|'bimmetraj_app'|'bimmetraj_control'|'bimmetraj_worker'|'bimmetraj_backup', string>;
  const { provisionDatabaseRoles } = await import('../../../scripts/database-roles/provision');
  await provisionDatabaseRoles(writer, credentials, { expectedDatabase: 'teklifpro_bootstrap_test', expectedSystemIdentifier: target.rows[0].system_identifier, requiredMarkerRegclass: 'teklifpro_release.migrations' }, decodeURIComponent(url.password));
  const appUrl = new URL(url); appUrl.username = 'bimmetraj_app'; appUrl.password = credentials.bimmetraj_app;
  process.env.DATABASE_URL = appUrl.toString();
  const { db, pool } = await import('../../db');
  const { resolveBenchmarkProvenance } = await import('./benchmark-provenance');
  const { manualQuotationInput } = await import('./input');
  const user = randomUUID(), source = randomUUID(), otherSource = randomUUID(), row = randomUUID(), client = randomUUID();
  try {
    await writer.query("INSERT INTO users(id,email,full_name) VALUES ($1,$2,'Reviewer')", [user, `${user}@example.test`]);
    await writer.query("INSERT INTO pricing_data_sources(id,code,name,category,status,currency,validity_start,validity_end,authorization_status,authorization_evidence_hash,authorized_at) VALUES ($1,$2,'Source','market_commodity','active','TRY',now()-interval '1 day',now()+interval '1 day','authorized',$3,now())", [source, source, 'a'.repeat(64)]);
    await writer.query("INSERT INTO pricing_data_sources(id,code,name,category,status,currency,validity_start,validity_end,authorization_status,authorization_evidence_hash,authorized_at) VALUES ($1,$2,'Other','market_commodity','active','TRY',now()-interval '1 day',now()+interval '1 day','authorized',$3,now())", [otherSource, otherSource, 'a'.repeat(64)]);
    await writer.query("INSERT INTO price_feed_staging(id,source_id,item_code,item_name,unit,crawled_price,status,reviewed_at,reviewed_by_user_id) VALUES ($1,$2,'A','Before','m',100,'approved',now(),$3)", [row, source, user]);
    const input = manualQuotationInput.parse({ clientId: client, quoteNumber:'LOCK', projectName:'Fixture', date:'2026-01-01', expiryDate:'2026-12-31', items:[{description:'A',unit:'m',quantity:1,unitPrice:100,benchmarkStagingId:row}] });
    assert.equal((await writer.query("SELECT pg_get_userbyid(relowner) owner FROM pg_class WHERE oid='public.price_feed_staging'::regclass")).rows[0].owner, 'bimmetraj_owner');
    await writer.query('SET ROLE bimmetraj_app');
    await writer.query('BEGIN');
    await writer.query('UPDATE pricing_data_sources SET name=$2 WHERE id=$1', [source, 'After']);
    const quote = db.transaction(tx => resolveBenchmarkProvenance(tx, input.items, 'TRY'));
    // Wait until quote has reached a blocked row lock. Under the old ordering it
    // already holds staging FOR SHARE, causing the writer's next UPDATE to deadlock.
    let waiting = false;
    for (let n = 0; n < 100; n++) {
      const found = await monitor.query("SELECT 1 FROM pg_stat_activity WHERE application_name='benchmark-lock-quote-test' AND wait_event_type='Lock'");
      if (found.rowCount) { waiting = true; break; }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.ok(waiting, 'quote must wait for the source lock before writer proceeds');
    await writer.query("UPDATE price_feed_staging SET item_name='After' WHERE id=$1", [row]);
    await writer.query('COMMIT');
    const result = await quote;
    assert.equal(JSON.parse(result[0].sourceReference!).itemName, 'After');
    const uppercase = await db.transaction(tx => resolveBenchmarkProvenance(tx, input.items.map(item => ({...item, benchmarkStagingId: row.toUpperCase()})), 'TRY'));
    assert.equal(uppercase[0].priceSource, 'market');
    assert.equal(JSON.parse(uppercase[0].sourceReference!).stagingId, row);
    assert.equal(uppercase[0].verificationStatus, 'needs_review');

    // A source reassignment after discovery must not be trusted as evidence.
    await writer.query('BEGIN');
    await writer.query('UPDATE pricing_data_sources SET name=$2 WHERE id=$1', [source, 'Locked']);
    const reassigned = db.transaction(tx => resolveBenchmarkProvenance(tx, input.items, 'TRY'));
    const observed = reassigned.then(() => null, error => error);
    waiting = false;
    for (let n = 0; n < 100; n++) {
      const found = await monitor.query("SELECT 1 FROM pg_stat_activity WHERE application_name='benchmark-lock-quote-test' AND wait_event_type='Lock'");
      if (found.rowCount) { waiting = true; break; }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.ok(waiting, 'quote must wait before source reassignment');
    await writer.query('UPDATE price_feed_staging SET source_id=$2 WHERE id=$1', [row, otherSource]);
    await writer.query('COMMIT');
    const failure = await observed;
    assert.equal(failure?.status, 409, 'reassigned provenance must fail closed');

    // The same guarantee applies if the selected staging row disappears.
    await writer.query('UPDATE price_feed_staging SET source_id=$2 WHERE id=$1', [row, source]);
    await writer.query('BEGIN');
    await writer.query('UPDATE pricing_data_sources SET name=$2 WHERE id=$1', [source, 'Locked again']);
    const deleted = db.transaction(tx => resolveBenchmarkProvenance(tx, input.items, 'TRY'));
    const deletedResult = deleted.then(() => null, error => error);
    waiting = false;
    for (let n = 0; n < 100; n++) {
      const found = await monitor.query("SELECT 1 FROM pg_stat_activity WHERE application_name='benchmark-lock-quote-test' AND wait_event_type='Lock'");
      if (found.rowCount) { waiting = true; break; }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.ok(waiting, 'quote must wait before staging deletion');
    await writer.query('DELETE FROM price_feed_staging WHERE id=$1', [row]);
    await writer.query('COMMIT');
    assert.equal((await deletedResult)?.status, 409, 'deleted provenance must fail closed');
  } finally {
    await writer.query('ROLLBACK').catch(() => {});
    await writer.query('RESET ROLE');
    await writer.query('DELETE FROM price_feed_staging WHERE id=$1', [row]);
    await writer.query('DELETE FROM pricing_data_sources WHERE id IN ($1,$2)', [source,otherSource]);
    await writer.query('DELETE FROM users WHERE id=$1', [user]);
    await writer.end(); await monitor.end(); await pool.end();
  }
});
