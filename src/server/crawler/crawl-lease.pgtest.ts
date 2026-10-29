import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import pg from 'pg';

test('crawler leases fence stale owners and safely recover expired claims', { timeout: 60000 }, async () => {
 const raw=process.env.CRAWL_ATOMIC_TEST_URL;
 assert.ok(raw && process.env.NODE_ENV==='test' && process.env.CI_DISPOSABLE_DATABASE==='true');
 const url=new URL(raw); assert.ok(['localhost','127.0.0.1'].includes(url.hostname) && url.pathname==='/teklifpro_bootstrap_test');
 const client=new pg.Client({connectionString:raw});await client.connect();
 const {makeWorkerUtils,Logger}=await import('graphile-worker');const worker=await makeWorkerUtils({connectionString:raw,schema:'teklifpro_queue',logger:new Logger(()=>()=>{})});await worker.release();
 const systemId=(await client.query<{system_identifier:string}>('SELECT system_identifier::text FROM pg_control_system()')).rows[0].system_identifier;
 const creds=Object.fromEntries(['bimmetraj_migrator','bimmetraj_app','bimmetraj_control','bimmetraj_worker','bimmetraj_backup'].map(role=>[role,randomBytes(32).toString('hex')])) as Record<'bimmetraj_migrator'|'bimmetraj_app'|'bimmetraj_control'|'bimmetraj_worker'|'bimmetraj_backup',string>;
 const {provisionDatabaseRoles}=await import('../../../scripts/database-roles/provision');await provisionDatabaseRoles(client,creds,{expectedDatabase:'teklifpro_bootstrap_test',expectedSystemIdentifier:systemId,requiredMarkerRegclass:'teklifpro_release.migrations'},decodeURIComponent(url.password));
 const app=new URL(url);app.username='bimmetraj_app';app.password=creds.bimmetraj_app;process.env.DATABASE_URL=app.toString();
 const id=randomUUID();await client.query("INSERT INTO pricing_data_sources(id,code,name,category,status) VALUES ($1,$2,'lease','market_commodity','active')",[id,`lease_${id}`]);
 const {claimCrawlSource,releaseCrawlSource}=await import('./crawl-claim');const {pool}=await import('../../db');
 try {
  const [first,second]=await Promise.all([claimCrawlSource(id),claimCrawlSource(id)]);assert.equal([first,second].filter(Boolean).length,1);const owner=first??second!;
  await client.query("UPDATE pricing_data_sources SET crawl_lease_until=now()-interval '1 second' WHERE id=$1",[id]);
  const replacement=await claimCrawlSource(id);assert.ok(replacement);assert.notEqual(owner,replacement);
  await releaseCrawlSource(id,owner);let row=(await client.query('SELECT status,crawl_lease_token FROM pricing_data_sources WHERE id=$1',[id])).rows[0];assert.equal(row.status,'syncing');assert.equal(row.crawl_lease_token,replacement);
  await releaseCrawlSource(id,replacement);row=(await client.query('SELECT status,crawl_lease_token FROM pricing_data_sources WHERE id=$1',[id])).rows[0];assert.equal(row.status,'active');assert.equal(row.crawl_lease_token,null);
  await client.query("UPDATE pricing_data_sources SET status='stale' WHERE id=$1",[id]);
  const actor=randomUUID(),official=randomUUID();await client.query("INSERT INTO users(id,email,full_name,email_verified,is_super_admin) VALUES ($1,$2,'Admin',now(),true)",[actor,`${actor}@example.test`]);
  await client.query("INSERT INTO pricing_data_sources(id,code,name,category,status,crawl_lease_token,crawl_lease_until) VALUES ($1,$2,'Official','official_gazette','syncing',$3,now()-interval '1 minute')",[official,`official_${official}`,randomUUID()]);
  const {priceCrawlerService}=await import('./priceCrawlerService');
  const originalCrawl=priceCrawlerService.crawlSource;
  // This test exercises official-source lease recovery only. Never access a
  // real network even if a previous CI step left another active fixture.
  priceCrawlerService.crawlSource=async source => { throw new Error(`Unexpected network crawl for ${source.code}`); };
  try { const {PriceSchedulerService}=await import('./priceSchedulerService');await new PriceSchedulerService().runSequentialBatch('manual_admin',actor);const state=(await client.query('SELECT status,crawl_lease_token FROM pricing_data_sources WHERE id=$1',[official])).rows[0];assert.equal(state.status,'active');assert.equal(state.crawl_lease_token,null);
  const busy=randomUUID();await client.query("INSERT INTO pricing_data_sources(id,code,name,category,status,crawl_lease_token,crawl_lease_until) VALUES ($1,$2,'Busy','official_gazette','syncing',$3,now()-interval '1 minute')",[busy,`official_busy_${busy}`,randomUUID()]);
  await client.query("CREATE FUNCTION public.suppress_busy_crawl_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.code LIKE 'official_busy_%' AND NEW.status='syncing' THEN RETURN NULL; END IF; RETURN NEW; END $$");await client.query('CREATE TRIGGER suppress_busy_crawl_fixture BEFORE UPDATE ON public.pricing_data_sources FOR EACH ROW EXECUTE FUNCTION public.suppress_busy_crawl_fixture()');
  try {const summary=await new PriceSchedulerService().runSequentialBatch('manual_admin',actor);const busyResult=summary.results.find(item=>item.sourceCode===`official_busy_${busy}`);assert.equal(busyResult?.status,'error');assert.match(busyResult?.error??'',/CRAWLER_SOURCE_ALREADY_CLAIMED/);} finally {await client.query('DROP TRIGGER suppress_busy_crawl_fixture ON public.pricing_data_sources');await client.query('DROP FUNCTION public.suppress_busy_crawl_fixture()');await client.query('DELETE FROM pricing_data_sources WHERE id=$1',[busy]);}
 } finally {priceCrawlerService.crawlSource=originalCrawl;await client.query('DELETE FROM admin_audit_logs WHERE admin_id=$1',[actor]);await client.query('DELETE FROM pricing_data_sources WHERE id=$1',[official]);await client.query('DELETE FROM users WHERE id=$1',[actor]);}
 } finally {await client.query('DELETE FROM pricing_data_sources WHERE id=$1',[id]);await pool.end();await client.end();}
});
