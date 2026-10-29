import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import pg from 'pg';

test('manual and scheduled crawls roll back staging when audit fails under production roles', {timeout:60000}, async () => {
  const raw = process.env.CRAWL_ATOMIC_TEST_URL;
  assert.ok(raw && process.env.NODE_ENV === 'test' && process.env.CI_DISPOSABLE_DATABASE === 'true');
  const url = new URL(raw);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname) && url.pathname === '/teklifpro_bootstrap_test' && url.username && url.password && !url.search && !url.hash);
  const client = new pg.Client({connectionString:raw}); await client.connect();
  const { makeWorkerUtils, Logger } = await import('graphile-worker');
  const worker = await makeWorkerUtils({connectionString:raw,schema:'teklifpro_queue',logger:new Logger(()=>()=>{})}); await worker.release();
  const systemId = (await client.query<{system_identifier:string}>('SELECT system_identifier::text FROM pg_control_system()')).rows[0].system_identifier;
  const credentials = Object.fromEntries(['bimmetraj_migrator','bimmetraj_app','bimmetraj_control','bimmetraj_worker','bimmetraj_backup'].map(role=>[role,randomBytes(32).toString('hex')])) as Record<'bimmetraj_migrator'|'bimmetraj_app'|'bimmetraj_control'|'bimmetraj_worker'|'bimmetraj_backup',string>;
  const { provisionDatabaseRoles } = await import('../../../scripts/database-roles/provision');
  await provisionDatabaseRoles(client,credentials,{expectedDatabase:'teklifpro_bootstrap_test',expectedSystemIdentifier:systemId,requiredMarkerRegclass:'teklifpro_release.migrations'},decodeURIComponent(url.password));
  const appUrl = new URL(url); appUrl.username='bimmetraj_app'; appUrl.password=credentials.bimmetraj_app;
  const controlUrl = new URL(url); controlUrl.username='bimmetraj_control'; controlUrl.password=credentials.bimmetraj_control;
  process.env.DATABASE_URL=appUrl.toString(); process.env.CONTROL_DATABASE_URL=controlUrl.toString();
  const actor = randomUUID(), sourceId = randomUUID(), old = randomUUID(), company = randomUUID(), customer = randomUUID();
  await client.query('INSERT INTO users(id,email,full_name,email_verified,is_super_admin) VALUES ($1,$2,$3,now(),true)',[actor,`${actor}@example.test`,'Crawler Admin']);
  await client.query("INSERT INTO pricing_data_sources(id,code,name,category,status,source_url,crawler_config,data_hash,authorization_evidence_hash,authorization_status,authorization_scope,authorized_at,review_status,review_evidence_reference,review_scope,review_allows_quotations,reviewed_by_user_id,reviewed_at) VALUES ($1,$2,'Crawler fixture','market_commodity','active','https://example.test', $3,repeat('a',64),repeat('b',64),'authorized','legacy',now(),'verified','https://example.test/permission','Teklif kullanimi',true,$4,now())",[sourceId,`crawl_${sourceId}`,JSON.stringify({autoApprove:true}),actor]);
  await client.query("INSERT INTO price_feed_staging(id,source_id,item_code,item_name,unit,crawled_price,source_url,notes,status) VALUES ($1,$2,'A','Fixture','m',100,'https://example.test/price','[live-html-v1] fixture','approved')",[old,sourceId]);
  await client.query(`UPDATE price_feed_staging p SET content_hash=repeat('a',64),source_identity=jsonb_build_object('code',s.code,'name',s.name,'authority',s.authority,'sourceUrl',s.source_url,'category',s.category,'versionTag',s.version_tag,'currency',s.currency,'countryCode',s.country_code) FROM pricing_data_sources s WHERE p.id=$1 AND s.id=p.source_id`,[old]);
  await client.query("INSERT INTO companies(id,name) VALUES ($1,'Proof tenant')",[company]);
  await client.query("INSERT INTO memberships(company_id,user_id,role) VALUES ($1,$2,'owner')",[company,actor]);
  await client.query("INSERT INTO subscriptions(company_id,plan,bonus_quote_limit,current_period_start) VALUES ($1,'starter',1000,'2020-01-01')",[company]);
  await client.query("INSERT INTO clients(id,company_id,name,type) VALUES ($1,$2,'Proof client','company')",[customer,company]);
  const {createApiApp} = await import('../app');
  const {AuthService} = await import('../../services/auth/authService'); const {priceCrawlerService} = await import('./priceCrawlerService');
  const {PriceSchedulerService} = await import('./priceSchedulerService'); const {pool} = await import('../../db'); const {closeControlDatabase} = await import('../../db/control-plane');
  const app = createApiApp(); const server = app.listen(0,'127.0.0.1'); await new Promise<void>(resolve=>server.once('listening',resolve));
  const original = priceCrawlerService.crawlSource;
  priceCrawlerService.crawlSource = async () => ({sourceId,sourceCode:`crawl_${sourceId}`,sourceName:'Crawler fixture',status:'success',itemsCount:1,items:[{itemCode:'A',itemName:'Fixture',unit:'m',currentPrice:null,crawledPrice:200,diffPercent:null,confidenceScore:1,notes:'[live-html-v1] fixture',sourceUrl:'https://example.test/price'}],dataHash:'a'.repeat(64),crawledAt:new Date(),durationMs:1});
  const token = AuthService.generateToken({userId:actor,companyId:null,role:null});
  try {
    await client.query("CREATE FUNCTION public.reject_crawl_audit_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action IN ('pricing_source_crawled','pricing_source_nightly_crawled') THEN RAISE EXCEPTION 'audit failure fixture'; END IF; RETURN NEW; END $$");
    await client.query('CREATE TRIGGER reject_crawl_audit_fixture BEFORE INSERT ON public.admin_audit_logs FOR EACH ROW EXECUTE FUNCTION public.reject_crawl_audit_fixture()');
    const response = await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/admin/pricing-sources/${sourceId}/sync`,{method:'POST',headers:{authorization:`Bearer ${token}`}});
    assert.equal(response.status,500);
    let rows = await client.query('SELECT id,status,crawled_price FROM price_feed_staging WHERE source_id=$1',[sourceId]);
    assert.deepEqual(rows.rows.map(row=>[row.id,row.status,row.crawled_price]),[[old,'approved','100.00']]);
    assert.equal((await client.query("SELECT status FROM pricing_data_sources WHERE id=$1",[sourceId])).rows[0].status,'active');
    const successfulCrawl = priceCrawlerService.crawlSource;
    priceCrawlerService.crawlSource = async () => ({sourceId,sourceCode:`crawl_${sourceId}`,sourceName:'Crawler fixture',status:'error',itemsCount:0,items:[],dataHash:'',crawledAt:new Date(),durationMs:1,errorMessage:'fixture'});
    const retried = await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/admin/pricing-sources/${sourceId}/sync`,{method:'POST',headers:{authorization:`Bearer ${token}`}});
    assert.equal(retried.status,502, 'retry reaches the crawler after failed transaction');
    assert.equal((await client.query("SELECT status FROM pricing_data_sources WHERE id=$1",[sourceId])).rows[0].status,'active');
    priceCrawlerService.crawlSource = successfulCrawl;
    const result = await new PriceSchedulerService().runSequentialBatch('manual_admin',actor);
    assert.equal(result.results.find(item=>item.sourceCode===`crawl_${sourceId}`)?.status,'error');
    assert.equal((await client.query("SELECT status FROM pricing_data_sources WHERE id=$1",[sourceId])).rows[0].status,'active');
    rows = await client.query('SELECT id,status,crawled_price FROM price_feed_staging WHERE source_id=$1',[sourceId]);
    assert.deepEqual(rows.rows.map(row=>[row.id,row.status,row.crawled_price]),[[old,'approved','100.00']]);
    await client.query('DROP TRIGGER reject_crawl_audit_fixture ON public.admin_audit_logs');
    await client.query("UPDATE pricing_data_sources SET authorization_status='authorized', authorization_evidence_hash=$2, authorized_at=now(), validity_start=now()-interval '1 day', validity_end=now()+interval '1 day', currency='TRY' WHERE id=$1",[sourceId,'b'.repeat(64)]);
    await client.query("UPDATE price_feed_staging SET reviewed_at='2025-01-01',reviewed_by_user_id=$2,crawled_at='2025-01-01' WHERE id=$1",[old,actor]);
    priceCrawlerService.crawlSource = async () => ({sourceId,sourceCode:`crawl_${sourceId}`,sourceName:'Crawler fixture',status:'success',itemsCount:1,items:[{itemCode:'A',itemName:'Fixture',unit:'kg',currentPrice:null,crawledPrice:100,diffPercent:null,confidenceScore:1,notes:'[live-html-v1] fixture',sourceUrl:'https://example.test/price'}],dataHash:'a'.repeat(64),crawledAt:new Date(),durationMs:1});
    const changed = await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/admin/pricing-sources/${sourceId}/sync`,{method:'POST',headers:{authorization:`Bearer ${token}`}});
    assert.equal(changed.status,200);
    rows = await client.query('SELECT id,status,unit,crawled_at FROM price_feed_staging WHERE source_id=$1',[sourceId]);
    const approved = rows.rows.find(row=>row.id===old); assert.equal(approved.status,'approved'); assert.equal(approved.unit,'m'); assert.equal(approved.crawled_at.toISOString(),'2025-01-01T00:00:00.000Z');
    const pending = rows.rows.find(row=>row.id!==old); assert.equal(pending.status,'pending'); assert.equal(pending.unit,'kg');
    const benchmark = await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/pricing/benchmarks?q=Crawler%20fixture`,{headers:{authorization:`Bearer ${token}`}});
    assert.equal(benchmark.status,200); const body = await benchmark.json() as {items:Array<{id:string;unit:string;crawledAt:string}>};
    assert.deepEqual(body.items.map(item=>[item.id,item.unit,item.crawledAt]),[[old,'m','2025-01-01T00:00:00.000Z']]);
    priceCrawlerService.crawlSource = async () => ({sourceId,sourceCode:`crawl_${sourceId}`,sourceName:'Crawler fixture',status:'success',itemsCount:1,items:[{itemCode:'A',itemName:'Fixture',unit:'m',currentPrice:null,crawledPrice:200,diffPercent:null,confidenceScore:1,notes:'[live-html-v1] fixture',sourceUrl:'https://example.test/price'}],dataHash:'b'.repeat(64),crawledAt:new Date(),durationMs:1});
    const conflict = await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/admin/pricing-sources/${sourceId}/sync`,{method:'POST',headers:{authorization:`Bearer ${token}`}}); assert.equal(conflict.status,200); const currentRows=await client.query('SELECT status,content_hash FROM price_feed_staging WHERE source_id=$1',[sourceId]); assert.equal(currentRows.rows.find(r=>r.status==='pending')?.content_hash,'b'.repeat(64)); assert.equal(currentRows.rows.find(r=>r.status==='approved')?.status,'approved');
    const proof = await client.query('SELECT data_hash,authorization_evidence_hash,validity_end FROM pricing_data_sources WHERE id=$1',[sourceId]); assert.equal(proof.rows[0].data_hash,'a'.repeat(64)); assert.equal(proof.rows[0].authorization_evidence_hash,'b'.repeat(64));
    const tenantToken = AuthService.generateToken({userId:actor,companyId:company,role:'owner'});
    const quote = await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/quotations`,{method:'POST',headers:{authorization:`Bearer ${tenantToken}`,'content-type':'application/json'},body:JSON.stringify({clientId:customer,quoteNumber:randomUUID(),projectName:'Evidence',date:'2026-01-01',expiryDate:'2026-12-31',currency:'TRY',items:[{description:'Fixture',unit:'m',quantity:1,unitPrice:100,benchmarkStagingId:old}]})}); assert.equal(quote.status,200,await quote.clone().text());
    const created=await quote.json() as {id:string}; const quoteRows=await client.query('SELECT source_reference FROM quotation_items WHERE quotation_id=$1',[created.id]); const evidence=JSON.parse(quoteRows.rows[0].source_reference); assert.equal(evidence.permissionReview.status,'verified'); assert.equal(new Date(evidence.validityEnd).getTime(),proof.rows[0].validity_end.getTime());
    let unblock!:()=>void; let entered!:()=>void; const waiting=new Promise<void>(resolve=>unblock=resolve), started=new Promise<void>(resolve=>entered=resolve);
    const realCrawl=priceCrawlerService.crawlSource; priceCrawlerService.crawlSource=async (...args)=>{entered();await waiting;return realCrawl(...args)};
    const staleSync=fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/admin/pricing-sources/${sourceId}/sync`,{method:'POST',headers:{authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10_000)});
    let replacement: string | null = null;
    const {claimCrawlSource,releaseCrawlSource}=await import('./crawl-claim');
    try { await Promise.race([started,staleSync.then(response=>{throw new Error(`Crawler did not start; HTTP ${response.status}`);})]); await client.query("UPDATE pricing_data_sources SET crawl_lease_until=now()-interval '1 second' WHERE id=$1",[sourceId]); replacement=await claimCrawlSource(sourceId);assert.ok(replacement); } finally { unblock(); }
    const staleResponse=await staleSync;assert.equal(staleResponse.status,500);
    const lease=(await client.query('SELECT status,crawl_lease_token FROM pricing_data_sources WHERE id=$1',[sourceId])).rows[0];assert.equal(lease.status,'syncing');assert.equal(lease.crawl_lease_token,replacement);await releaseCrawlSource(sourceId,replacement);
    const finalRows=await client.query('SELECT status,content_hash FROM price_feed_staging WHERE source_id=$1',[sourceId]);assert.equal(finalRows.rows.find(r=>r.status==='pending')?.content_hash,'b'.repeat(64));
    for (const changedField of ['version','permission'] as const) {
      await client.query("UPDATE pricing_data_sources SET review_status='verified',review_evidence_reference='https://example.test/permission',review_scope='Teklif kullanimi',review_allows_quotations=true,reviewed_by_user_id=$2,reviewed_at=now() WHERE id=$1",[sourceId,actor]);
      let release!:()=>void;let begun!:()=>void;const gate=new Promise<void>(r=>release=r), begin=new Promise<void>(r=>begun=r);
      priceCrawlerService.crawlSource=async (...args)=>{begun();await gate;return realCrawl(...args)};
      const inFlight=fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/admin/pricing-sources/${sourceId}/sync`,{method:'POST',headers:{authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10_000)});
      try {
        await Promise.race([begin,inFlight.then(response=>{throw new Error(`Crawler did not start; HTTP ${response.status}`);})]);
        if(changedField==='version') await client.query("UPDATE pricing_data_sources SET version_tag='changed-version' WHERE id=$1",[sourceId]);
        else await client.query("UPDATE pricing_data_sources SET review_status='revoked' WHERE id=$1",[sourceId]);
      } finally { release(); }
      assert.equal((await inFlight).status,500,`${changedField} change rejects in-flight result`);
      const retained=await client.query('SELECT status,content_hash FROM price_feed_staging WHERE source_id=$1',[sourceId]);assert.equal(retained.rows.find(r=>r.status==='pending')?.content_hash,'b'.repeat(64));assert.equal(retained.rows.find(r=>r.status==='approved')?.status,'approved');
    }
    await client.query("UPDATE pricing_data_sources SET review_status='verified',review_evidence_reference='https://example.test/permission',review_scope='Teklif kullanimi',review_allows_quotations=true,reviewed_by_user_id=$2,reviewed_at=now() WHERE id=$1",[sourceId,actor]);
    const oldSelection=await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/quotations`,{method:'POST',headers:{authorization:`Bearer ${tenantToken}`,'content-type':'application/json'},body:JSON.stringify({clientId:customer,quoteNumber:randomUUID(),projectName:'Old identity rejected',date:'2026-01-01',expiryDate:'2026-12-31',currency:'TRY',items:[{description:'Fixture',unit:'m',quantity:1,unitPrice:100,benchmarkStagingId:old}]})});assert.equal(oldSelection.status,409);
    const historic=await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/quotations/${created.id}`,{headers:{authorization:`Bearer ${tenantToken}`}});assert.equal(historic.status,200);
    const invalidId=randomUUID();await client.query("INSERT INTO price_feed_staging(id,source_id,item_code,item_name,unit,crawled_price,source_url,notes,status) VALUES ($1,$2,'B','Invalid','m',100,'https://example.test/price','[live-html-v1] fixture','pending')",[invalidId,sourceId]);
    const invalidApproval=await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/admin/pricing-sources/staging/${invalidId}/review`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({action:'approve'})});assert.equal(invalidApproval.status,409);
    const originalIdentity=(await client.query('SELECT source_identity FROM price_feed_staging WHERE id=$1',[old])).rows[0].source_identity;
    priceCrawlerService.crawlSource=async()=>({sourceId,sourceCode:`crawl_${sourceId}`,sourceName:'Crawler fixture',status:'success',itemsCount:1,items:[{itemCode:'A',itemName:'Fixture',unit:'m',currentPrice:null,crawledPrice:100,diffPercent:null,confidenceScore:1,notes:'[live-html-v1] fixture',sourceUrl:'https://example.test/price'}],dataHash:'c'.repeat(64),crawledAt:new Date(),durationMs:1});
    for (const previousIdentity of [null,originalIdentity]) {
      await client.query('UPDATE price_feed_staging SET source_identity=$2 WHERE id=$1',[old,previousIdentity]);
      const samePrice=await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/admin/pricing-sources/${sourceId}/sync`,{method:'POST',headers:{authorization:`Bearer ${token}`}});assert.equal(samePrice.status,200);
      const observations=await client.query('SELECT id,status,content_hash FROM price_feed_staging WHERE source_id=$1',[sourceId]);assert.equal(observations.rows.find(r=>r.id===old)?.status,'approved');assert.equal(observations.rows.find(r=>r.status==='pending')?.content_hash,'c'.repeat(64));
    }
    const csv='itemCode,itemName,unit,price\nA,Fixture,m,100.00\n';const licenseReference='Permission record';const validityStart='2026-01-01',validityEnd='2027-12-31';
    const documentHash=createHash('sha256').update(csv).digest('hex');const versionHash=createHash('sha256').update(JSON.stringify({documentHash,licenseReference,validityStart,validityEnd})).digest('hex');
    const sealedId=randomUUID(),sealedOld=randomUUID();await client.query("INSERT INTO pricing_data_sources(id,code,name,category,status,data_hash,version_tag,source_url) VALUES ($1,$2,'Sealed fixture','official_gazette','active',$3,$4,'https://example.test')",[sealedId,`sealed_${sealedId}`,documentHash,`csv:${versionHash}`]);
    await client.query("INSERT INTO price_feed_staging(id,source_id,item_code,item_name,unit,crawled_price,status,notes) VALUES ($1,$2,'A','Fixture','m',100,'approved','legacy')",[sealedOld,sealedId]);
    try {const importUrl=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/admin/pricing-sources/${sealedId}/import-csv`;const payload={csv,fileName:'fixture.csv',licenseConfirmed:true,licenseReference,validityStart,validityEnd,autoApprove:true};const requestImport=()=>fetch(importUrl,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(payload)});
      assert.equal((await requestImport()).status,201);const items=(await client.query('SELECT id,status,content_hash,source_identity FROM price_feed_staging WHERE source_id=$1',[sealedId])).rows;assert.equal(items.find(r=>r.id===sealedOld)?.status,'approved');const pending=items.find(r=>r.id!==sealedOld);assert.equal(pending?.status,'pending');assert.equal(pending?.content_hash,documentHash);assert.ok(pending?.source_identity);assert.equal((await requestImport()).status,200);
    } finally {await client.query('DELETE FROM pricing_data_sources WHERE id=$1',[sealedId]);}



  } finally {
    priceCrawlerService.crawlSource = original;
    await client.query('DROP TRIGGER IF EXISTS reject_crawl_audit_fixture ON public.admin_audit_logs');
    await client.query('DROP FUNCTION IF EXISTS public.reject_crawl_audit_fixture()');
    await client.query('DELETE FROM admin_audit_logs WHERE admin_id=$1',[actor]);
    await client.query('DELETE FROM global_price_source_review_events WHERE source_id=$1',[sourceId]);
    await client.query('DELETE FROM pricing_data_sources WHERE id=$1',[sourceId]);
    await new Promise<void>(resolve=>server.close(()=>resolve())); await closeControlDatabase(); await pool.end(); await client.end();
  }
});
