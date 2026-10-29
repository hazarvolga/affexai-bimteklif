import { priceSourceIdentity } from './source-identity';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { useTestIsolation } from '../routes/test-isolation';
import { skipIfDatabaseUnavailable } from '../routes/test-db-reachability';

useTestIsolation();

test('manual crawl rolls staging and source changes back when its audit insert fails', async t => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ createApiApp }, { db }, schema, { AuthService }, { priceCrawlerService }, { eq, sql }] = await Promise.all([
    import('../app'), import('../../db'), import('../../db/schema'), import('../../services/auth/authService'), import('./priceCrawlerService'), import('drizzle-orm'),
  ]);
  const server = createServer(createApiApp());
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const [admin] = await db.insert(schema.users).values({ email: `${randomUUID()}@example.test`, fullName: 'Admin', isSuperAdmin: true, emailVerified: new Date() }).returning();
  const [source] = await db.insert(schema.pricingDataSources).values({ name: 'Fixture', code: randomUUID(), category: 'market_commodity', status: 'active', sourceUrl: 'https://example.test', dataHash:'a'.repeat(64),authorizationEvidenceHash:'b'.repeat(64),authorizationStatus:'authorized',authorizedAt:new Date(), crawlerConfig: { autoApprove: true } }).returning();
  const [old] = await db.insert(schema.priceFeedStaging).values({ sourceId: source.id, contentHash:'a'.repeat(64), sourceIdentity:priceSourceIdentity(source), itemCode: 'A', itemName: 'Concrete', unit: 'm', crawledPrice: '100', sourceUrl: 'https://example.test', notes: '[live-html-v1] fixture', status: 'approved' }).returning();
  const original = priceCrawlerService.crawlSource;
  priceCrawlerService.crawlSource = async () => ({ sourceId: source.id, sourceCode: source.code, sourceName: source.name, status: 'success', itemsCount: 1, items: [{ itemCode:'A', itemName:'Concrete', unit:'m', currentPrice:null, crawledPrice:200, diffPercent:null, confidenceScore:1, notes:'[live-html-v1] fixture', sourceUrl:'https://example.test' }], dataHash:'a'.repeat(64), crawledAt:new Date(), durationMs:1 });
  await db.execute(sql`CREATE FUNCTION reject_crawl_audit_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'pricing_source_crawled' THEN RAISE EXCEPTION 'fixture failure'; END IF; RETURN NEW; END $$`);
  await db.execute(sql`CREATE TRIGGER reject_crawl_audit_test BEFORE INSERT ON admin_audit_logs FOR EACH ROW EXECUTE FUNCTION reject_crawl_audit_test()`);
  try {
    const token = AuthService.generateToken({ userId:admin.id, companyId:null, role:null });
    const result = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin/pricing-sources/${source.id}/sync`, { method:'POST', headers:{ authorization:`Bearer ${token}` } });
    assert.equal(result.status,500);
    const rows = await db.select().from(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.sourceId,source.id));
    assert.deepEqual(rows.map(row => [row.id,row.status,row.crawledPrice]), [[old.id,'approved','100.00']]);
    const [after] = await db.select().from(schema.pricingDataSources).where(eq(schema.pricingDataSources.id,source.id));
    assert.equal(after.authorizationStatus,source.authorizationStatus);
    assert.equal(after.lastSyncAt,source.lastSyncAt);
    assert.equal(after.status,'active', 'failed write must release its source claim');
    await db.execute(sql`DROP TRIGGER IF EXISTS reject_crawl_audit_test ON admin_audit_logs`);
    const retried = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin/pricing-sources/${source.id}/sync`, { method:'POST', headers:{ authorization:`Bearer ${token}` } });
    assert.equal(retried.status,200, 'retry should work after failure');
  } finally {
    priceCrawlerService.crawlSource = original;
    await db.execute(sql`DROP TRIGGER IF EXISTS reject_crawl_audit_test ON admin_audit_logs`);
    await db.execute(sql`DROP FUNCTION reject_crawl_audit_test()`);
    await db.delete(schema.pricingDataSources).where(eq(schema.pricingDataSources.id, source.id));
  }
});

test('scheduler rolls back rejected previous price when staging insert fails', async t => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ db }, schema, { priceCrawlerService }, { PriceSchedulerService }, { eq, sql }] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('./priceCrawlerService'), import('./priceSchedulerService'), import('drizzle-orm'),
  ]);
  const [admin] = await db.insert(schema.users).values({ email: `${randomUUID()}@example.test`, fullName: 'Admin', isSuperAdmin: true, emailVerified: new Date() }).returning();
  const [source] = await db.insert(schema.pricingDataSources).values({ name: 'Scheduler Fixture', code: randomUUID(), category: 'market_commodity', status: 'active', sourceUrl: 'https://example.test', dataHash:'a'.repeat(64),authorizationEvidenceHash:'b'.repeat(64),authorizationStatus:'authorized',authorizedAt:new Date(), crawlerConfig: { autoApprove: true } }).returning();
  const [old] = await db.insert(schema.priceFeedStaging).values({ sourceId: source.id, contentHash:'a'.repeat(64), sourceIdentity:priceSourceIdentity(source), itemCode: 'A', itemName: 'Concrete', unit: 'm', crawledPrice: '100', sourceUrl: 'https://example.test', notes: '[live-html-v1] fixture', status: 'approved' }).returning();
  const original = priceCrawlerService.crawlSource;
  priceCrawlerService.crawlSource = async () => ({ sourceId:source.id, sourceCode:source.code, sourceName:source.name, status:'success', itemsCount:1, items:[{ itemCode:'A', itemName:'Concrete', unit:'m', currentPrice:null, crawledPrice:200, diffPercent:null, confidenceScore:1, notes:'[live-html-v1] fixture', sourceUrl:'https://example.test' }], dataHash:'a'.repeat(64), crawledAt:new Date(), durationMs:1 });
  await db.execute(sql`CREATE FUNCTION reject_crawl_insert_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.crawled_price = 200 THEN RAISE EXCEPTION 'fixture failure'; END IF; RETURN NEW; END $$`);
  await db.execute(sql`CREATE TRIGGER reject_crawl_insert_test BEFORE INSERT ON price_feed_staging FOR EACH ROW EXECUTE FUNCTION reject_crawl_insert_test()`);
  try {
    const result = await new PriceSchedulerService().runSequentialBatch('manual_admin',admin.id);
    assert.equal(result.failedSources,1);
    const [after] = await db.select().from(schema.pricingDataSources).where(eq(schema.pricingDataSources.id,source.id));
    assert.equal(after.status,'active', 'failed scheduled write must release its source claim');
    const rows = await db.select().from(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.sourceId,source.id));
    assert.deepEqual(rows.map(row=>[row.id,row.status,row.crawledPrice]), [[old.id,'approved','100.00']]);
  } finally {
    priceCrawlerService.crawlSource = original;
    await db.execute(sql`DROP TRIGGER reject_crawl_insert_test ON price_feed_staging`);
    await db.execute(sql`DROP FUNCTION reject_crawl_insert_test()`);
    await db.delete(schema.pricingDataSources).where(eq(schema.pricingDataSources.id, source.id));
  }
});

test('manual crawler and administrator review serialize without leaving two approved prices', async t => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ createApiApp }, { db }, schema, { AuthService }, { priceCrawlerService }, { eq, sql }] = await Promise.all([
    import('../app'), import('../../db'), import('../../db/schema'), import('../../services/auth/authService'), import('./priceCrawlerService'), import('drizzle-orm'),
  ]);
  const server = createServer(createApiApp());
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const [admin] = await db.insert(schema.users).values({email:`${randomUUID()}@example.test`,fullName:'Admin',isSuperAdmin:true,emailVerified:new Date()}).returning();
  const [source] = await db.insert(schema.pricingDataSources).values({name:'Race fixture',code:randomUUID(),reviewStatus:'verified',reviewEvidenceReference:'https://example.test/permission',reviewScope:'Teklif kullanimi',reviewAllowsQuotations:true,reviewedByUserId:admin.id,reviewedAt:new Date(),category:'market_commodity',status:'active',sourceUrl:'https://example.test',dataHash:'a'.repeat(64),authorizationEvidenceHash:'b'.repeat(64),authorizationStatus:'authorized',authorizedAt:new Date(),crawlerConfig:{autoApprove:true}}).returning();
  const [old, pending] = await db.insert(schema.priceFeedStaging).values(['approved','pending'].map(status=>({sourceId:source.id,contentHash:'a'.repeat(64),sourceIdentity:priceSourceIdentity(source),itemCode:'A',itemName:'Concrete',unit:'m',crawledPrice:'100',sourceUrl:'https://example.test',notes:'[live-html-v1] fixture',status}))).returning();
  const original = priceCrawlerService.crawlSource;
  priceCrawlerService.crawlSource = async () => ({sourceId:source.id,sourceCode:source.code,sourceName:source.name,status:'success',itemsCount:1,items:[{itemCode:'A',itemName:'Concrete',unit:'m',currentPrice:null,crawledPrice:200,diffPercent:null,confidenceScore:1,notes:'[live-html-v1] fixture',sourceUrl:'https://example.test'}],dataHash:'a'.repeat(64),crawledAt:new Date(),durationMs:1});
  await db.execute(sql`CREATE FUNCTION delay_crawl_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status = 'pending' THEN PERFORM pg_sleep(0.5); END IF; RETURN NEW; END $$`);
  await db.execute(sql`CREATE TRIGGER delay_crawl_test BEFORE INSERT ON price_feed_staging FOR EACH ROW EXECUTE FUNCTION delay_crawl_test()`);
  try {
    const token = AuthService.generateToken({userId:admin.id,companyId:null,role:null});
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin/pricing-sources`;
    const headers = {authorization:`Bearer ${token}`,'content-type':'application/json'};
    const crawl = fetch(`${base}/${source.id}/sync`,{method:'POST',headers});
    let sleeping = false;
    for (let i = 0; i < 100; i++) {
      const rows = await db.execute<{n:number}>(sql`SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event = 'PgSleep' AND query ILIKE '%price_feed_staging%'`);
      if (rows.rows[0]?.n) { sleeping = true; break; }
      await new Promise(resolve => setTimeout(resolve,15));
    }
    assert.equal(sleeping,true);
    const review = fetch(`${base}/staging/${pending.id}/review`,{method:'POST',headers,body:JSON.stringify({action:'approve'})});
    const responses = await Promise.all([crawl,review]);
    assert.equal(responses[0].status,200);
    assert.equal(responses[1].status,404); // crawl deletes prior pending row atomically
    const rows = await db.select().from(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.sourceId,source.id));
    assert.equal(rows.filter(row=>row.status==='approved').length,1);
    assert.equal(rows.find(row=>row.id===old.id)?.status,'approved');
  } finally {
    priceCrawlerService.crawlSource = original;
    await db.execute(sql`DROP TRIGGER delay_crawl_test ON price_feed_staging`);
    await db.execute(sql`DROP FUNCTION delay_crawl_test()`);
    await db.delete(schema.pricingDataSources).where(eq(schema.pricingDataSources.id, source.id));
  }
});

test('concurrent crawl claim rejects second caller and preserves changed administrator settings', async t => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ createApiApp }, { db }, schema, { AuthService }, { priceCrawlerService }, { eq }] = await Promise.all([
    import('../app'), import('../../db'), import('../../db/schema'), import('../../services/auth/authService'), import('./priceCrawlerService'), import('drizzle-orm'),
  ]);
  const server = createServer(createApiApp()); await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();}));
  const [admin] = await db.insert(schema.users).values({email:`${randomUUID()}@example.test`,fullName:'Admin',isSuperAdmin:true,emailVerified:new Date()}).returning();
  const [source] = await db.insert(schema.pricingDataSources).values({name:'CAS fixture',code:randomUUID(),category:'market_commodity',status:'active',sourceUrl:'https://example.test',dataHash:'a'.repeat(64),authorizationEvidenceHash:'b'.repeat(64),authorizationStatus:'authorized',authorizedAt:new Date(),crawlerConfig:{autoApprove:false}}).returning();
  let started!:()=>void, release!:()=>void;
  const entered = new Promise<void>(resolve=>{started=resolve;}); const gate = new Promise<void>(resolve=>{release=resolve;});
  const original = priceCrawlerService.crawlSource;
  priceCrawlerService.crawlSource = async () => { started(); await gate; return {sourceId:source.id,sourceCode:source.code,sourceName:source.name,status:'success',itemsCount:0,items:[],dataHash:'a'.repeat(64),crawledAt:new Date(),durationMs:1}; };
  try {
    const token = AuthService.generateToken({userId:admin.id,companyId:null,role:null});
    const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin/pricing-sources/${source.id}/sync`;
    const request = () => fetch(endpoint,{method:'POST',headers:{authorization:`Bearer ${token}`}});
    const first = request(); await entered;
    assert.equal((await request()).status,409,'a second crawl cannot share a source');
    await db.update(schema.pricingDataSources).set({status:'stale',crawlerConfig:{autoApprove:true},updatedAt:new Date(Date.now()+1000)}).where(eq(schema.pricingDataSources.id,source.id));
    release(); assert.equal((await first).status,500,'changed source/config must reject stale result');
    const [after] = await db.select().from(schema.pricingDataSources).where(eq(schema.pricingDataSources.id,source.id));
    assert.equal(after.status,'stale'); assert.deepEqual(after.crawlerConfig,{autoApprove:true});
    assert.equal((await db.select().from(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.sourceId,source.id))).length,0);
  } finally { release(); priceCrawlerService.crawlSource=original; }
});

test('nightly crawl keeps human-approved price and queues new value without inventing reviewer', async t => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ db }, schema, { priceCrawlerService }, { PriceSchedulerService }, { eq }, { createApiApp }, { AuthService }] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('./priceCrawlerService'), import('./priceSchedulerService'), import('drizzle-orm'), import('../app'), import('../../services/auth/authService'),
  ]);
  const server = createServer(createApiApp());
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const [admin] = await db.insert(schema.users).values({email:`${randomUUID()}@example.test`,fullName:'Admin',isSuperAdmin:true,emailVerified:new Date()}).returning();
  const [source] = await db.insert(schema.pricingDataSources).values({name:'Nightly fixture',code:randomUUID(),reviewStatus:'verified',reviewEvidenceReference:'https://example.test/permission',reviewScope:'Teklif kullanimi',reviewAllowsQuotations:true,reviewedByUserId:admin.id,reviewedAt:new Date(),category:'market_commodity',status:'active',sourceUrl:'https://example.test',dataHash:'a'.repeat(64),crawlerConfig:{autoApprove:true},authorizationStatus:'authorized',authorizationEvidenceHash:'a'.repeat(64),authorizedAt:new Date(),validityStart:new Date(Date.now()-86400000),validityEnd:new Date(Date.now()+86400000),currency:'TRY'}).returning();
  const [old] = await db.insert(schema.priceFeedStaging).values({sourceId:source.id,contentHash:'a'.repeat(64),sourceIdentity:priceSourceIdentity(source),itemCode:'A',itemName:'Concrete',unit:'m',crawledPrice:'100',sourceUrl:'https://example.test',notes:'[live-html-v1] fixture',status:'approved',reviewedAt:new Date(),reviewedByUserId:admin.id}).returning();
  const original = priceCrawlerService.crawlSource;
  priceCrawlerService.crawlSource = async () => ({sourceId:source.id,sourceCode:source.code,sourceName:source.name,status:'success',itemsCount:1,items:[{itemCode:'A',itemName:'Concrete',unit:'m',currentPrice:null,crawledPrice:200,diffPercent:null,confidenceScore:1,notes:'[live-html-v1] fixture',sourceUrl:'https://example.test'}],dataHash:'a'.repeat(64),crawledAt:new Date(),durationMs:1});
  try {
    const token = AuthService.generateToken({userId:admin.id,companyId:null,role:null});
    const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/pricing/benchmarks?q=${encodeURIComponent(source.name)}`;
    const readVisible = async () => {
      const response = await fetch(endpoint, {headers:{authorization:`Bearer ${token}`}});
      assert.equal(response.status, 200);
      const body = await response.json() as {items:Array<{id:string;crawledPrice:string}>};
      return body.items.map(item => [item.id,item.crawledPrice]);
    };
    assert.deepEqual(await readVisible(), [[old.id,'100.00']]);
    const result = await new PriceSchedulerService().runSequentialBatch('system_nightly_cron');
    assert.equal(result.successfulSources,1);
    const rows = await db.select().from(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.sourceId,source.id));
    assert.equal(rows.find(row=>row.id===old.id)?.status,'approved');
    assert.deepEqual(await readVisible(), [[old.id,'100.00']], 'nightly crawl must preserve the customer-visible approved price');
    const updated = rows.find(row=>row.id!==old.id); assert.equal(updated?.status,'pending'); assert.equal(updated?.reviewedByUserId,null);
  } finally { priceCrawlerService.crawlSource=original; await db.delete(schema.pricingDataSources).where(eq(schema.pricingDataSources.id,source.id)); }
});

test('same price with changed unit cannot silently alter approved provenance', async t => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ createApiApp }, { db }, schema, { AuthService }, { priceCrawlerService }, { eq }, { PriceSchedulerService }] = await Promise.all([
    import('../app'), import('../../db'), import('../../db/schema'), import('../../services/auth/authService'), import('./priceCrawlerService'), import('drizzle-orm'), import('./priceSchedulerService'),
  ]);
  const server = createServer(createApiApp()); await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise<void>(resolve => {server.close(() => resolve()); server.closeAllConnections();}));
  const [admin] = await db.insert(schema.users).values({email:`${randomUUID()}@example.test`,fullName:'Admin',isSuperAdmin:true,emailVerified:new Date()}).returning();
  const [source] = await db.insert(schema.pricingDataSources).values({name:'Unit change fixture',code:randomUUID(),reviewStatus:'verified',reviewEvidenceReference:'https://example.test/permission',reviewScope:'Teklif kullanimi',reviewAllowsQuotations:true,reviewedByUserId:admin.id,reviewedAt:new Date(),category:'market_commodity',status:'active',sourceUrl:'https://example.test',dataHash:'a'.repeat(64),crawlerConfig:{autoApprove:true},authorizationStatus:'authorized',authorizationEvidenceHash:'a'.repeat(64),authorizedAt:new Date(),validityStart:new Date(Date.now()-86400000),validityEnd:new Date(Date.now()+86400000),currency:'TRY'}).returning();
  const oldDate = new Date('2025-01-01T00:00:00Z');
  const [old] = await db.insert(schema.priceFeedStaging).values({sourceId:source.id,contentHash:'a'.repeat(64),sourceIdentity:priceSourceIdentity(source),itemCode:'A',itemName:'Concrete',unit:'m',crawledPrice:'100',sourceUrl:'https://example.test',notes:'[live-html-v1] fixture',status:'approved',reviewedAt:oldDate,reviewedByUserId:admin.id,crawledAt:oldDate}).returning();
  const original = priceCrawlerService.crawlSource;
  let newUnit = 'm';
  priceCrawlerService.crawlSource = async () => ({sourceId:source.id,sourceCode:source.code,sourceName:source.name,status:'success',itemsCount:1,items:[{itemCode:'A',itemName:'Concrete',unit:newUnit,currentPrice:null,crawledPrice:100,diffPercent:null,confidenceScore:1,notes:'[live-html-v1] fixture',sourceUrl:'https://example.test'}],dataHash:'a'.repeat(64),crawledAt:new Date(),durationMs:1});
  try {
    const token = AuthService.generateToken({userId:admin.id,companyId:null,role:null}); const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; const headers={authorization:`Bearer ${token}`};
    assert.equal((await fetch(`${base}/api/admin/pricing-sources/${source.id}/sync`,{method:'POST',headers})).status,200);
    const [same] = await db.select().from(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.id,old.id));
    assert.equal(same.crawledAt?.toISOString(),oldDate.toISOString());
    newUnit = 'kg';
    assert.equal((await fetch(`${base}/api/admin/pricing-sources/${source.id}/sync`,{method:'POST',headers})).status,200);
    const rows = await db.select().from(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.sourceId,source.id));
    const approved = rows.find(row=>row.id===old.id); assert.equal(approved?.status,'approved'); assert.equal(approved?.unit,'m'); assert.equal(approved?.crawledAt?.toISOString(),oldDate.toISOString());
    const pending = rows.find(row=>row.id!==old.id); assert.equal(pending?.status,'pending'); assert.equal(pending?.unit,'kg');
    const batch = await new PriceSchedulerService().runSequentialBatch('manual_admin',admin.id); assert.equal(batch.successfulSources,1);
    const scheduled = await db.select().from(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.sourceId,source.id));
    assert.equal(scheduled.find(row=>row.id===old.id)?.crawledAt?.toISOString(),oldDate.toISOString());
    assert.equal(scheduled.find(row=>row.id!==old.id)?.status,'pending');
    assert.equal(scheduled.find(row=>row.id!==old.id)?.unit,'kg');
    const response = await fetch(`${base}/api/pricing/benchmarks?q=${encodeURIComponent(source.name)}`,{headers}); assert.equal(response.status,200);
    const body = await response.json() as {items:Array<{id:string;unit:string;crawledAt:string}>}; assert.deepEqual(body.items.map(item=>[item.id,item.unit,item.crawledAt]),[[old.id,'m',oldDate.toISOString()]]);
  } finally {priceCrawlerService.crawlSource=original; await db.delete(schema.pricingDataSources).where(eq(schema.pricingDataSources.id,source.id));}
});

test('changed source proof cannot replace reviewed price proof or extend its validity', async t => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ createApiApp }, { db }, schema, { AuthService }, { priceCrawlerService }, { eq }, { PriceSchedulerService }] = await Promise.all([import('../app'),import('../../db'),import('../../db/schema'),import('../../services/auth/authService'),import('./priceCrawlerService'),import('drizzle-orm'),import('./priceSchedulerService')]);
  const server=createServer(createApiApp()); await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve)); t.after(()=>new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();}));
  const [admin]=await db.insert(schema.users).values({email:`${randomUUID()}@example.test`,fullName:'Admin',isSuperAdmin:true,emailVerified:new Date()}).returning();
  const end=new Date(Date.now()+86400000); const [source]=await db.insert(schema.pricingDataSources).values({name:'Proof fixture',code:randomUUID(),reviewStatus:'verified',reviewEvidenceReference:'https://example.test/permission',reviewScope:'Teklif kullanimi',reviewAllowsQuotations:true,reviewedByUserId:admin.id,reviewedAt:new Date(),category:'market_commodity',status:'active',sourceUrl:'https://example.test',dataHash:'a'.repeat(64),crawlerConfig:{autoApprove:true},authorizationStatus:'authorized',authorizationEvidenceHash:'a'.repeat(64),authorizedAt:new Date(),validityStart:new Date(Date.now()-86400000),validityEnd:end,currency:'TRY'}).returning();
  const [old]=await db.insert(schema.priceFeedStaging).values({sourceId:source.id,contentHash:'a'.repeat(64),sourceIdentity:priceSourceIdentity(source),itemCode:'A',itemName:'Concrete',unit:'m',crawledPrice:'100',sourceUrl:'https://example.test',notes:'[live-html-v1] fixture',status:'approved',reviewedAt:new Date(),reviewedByUserId:admin.id}).returning();
  const original=priceCrawlerService.crawlSource; priceCrawlerService.crawlSource=async()=>({sourceId:source.id,sourceCode:source.code,sourceName:source.name,status:'success',itemsCount:1,items:[{itemCode:'A',itemName:'Concrete',unit:'m',currentPrice:null,crawledPrice:200,diffPercent:null,confidenceScore:1,notes:'[live-html-v1] fixture',sourceUrl:'https://example.test'}],dataHash:'b'.repeat(64),crawledAt:new Date(),durationMs:1});
  try {
    const adminToken=AuthService.generateToken({userId:admin.id,companyId:null,role:null}); const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const result=await fetch(`${base}/api/admin/pricing-sources/${source.id}/sync`,{method:'POST',headers:{authorization:`Bearer ${adminToken}`}}); assert.equal(result.status,200);
    const firstRows=await db.select().from(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.sourceId,source.id)); assert.equal(firstRows.find(row=>row.status==='pending')?.contentHash,'b'.repeat(64));
    const batch=await new PriceSchedulerService().runSequentialBatch('manual_admin',admin.id); assert.equal(batch.successfulSources,1);
    const [after]=await db.select().from(schema.pricingDataSources).where(eq(schema.pricingDataSources.id,source.id)); assert.equal(after.dataHash,'a'.repeat(64)); assert.equal(after.authorizationEvidenceHash,'a'.repeat(64)); assert.equal(after.validityEnd?.getTime(),end.getTime());
    const price=await fetch(`${base}/api/pricing/benchmarks?q=Proof%20fixture`,{headers:{authorization:`Bearer ${adminToken}`}}); const visible=await price.json() as {items:Array<{id:string}>}; assert.equal(price.status,200); assert.deepEqual(visible.items.map(item=>item.id),[old.id]);

  } finally {priceCrawlerService.crawlSource=original;await db.delete(schema.pricingDataSources).where(eq(schema.pricingDataSources.id,source.id));}
});

test('empty source rejects missing proof and accepts a valid first crawl', async t => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{createApiApp},{db},schema,{AuthService},{priceCrawlerService},{eq}]=await Promise.all([import('../app'),import('../../db'),import('../../db/schema'),import('../../services/auth/authService'),import('./priceCrawlerService'),import('drizzle-orm')]);
  const server=createServer(createApiApp()); await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve)); t.after(()=>new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();}));
  const [admin]=await db.insert(schema.users).values({email:`${randomUUID()}@example.test`,fullName:'Admin',isSuperAdmin:true,emailVerified:new Date()}).returning();
  const [source]=await db.insert(schema.pricingDataSources).values({name:'Empty source',code:randomUUID(),category:'market_commodity',status:'active',sourceUrl:'https://example.test',crawlerConfig:{autoApprove:true}}).returning();
  let hash=''; let withItem=false; const original=priceCrawlerService.crawlSource;
  priceCrawlerService.crawlSource=async()=>({sourceId:source.id,sourceCode:source.code,sourceName:source.name,status:'success',itemsCount:withItem?1:0,items:withItem?[{itemCode:'A',itemName:'Fixture',unit:'m',currentPrice:null,crawledPrice:100,diffPercent:null,confidenceScore:1,notes:'[live-html-v1] fixture',sourceUrl:'https://example.test'}]:[],dataHash:hash,crawledAt:new Date(),durationMs:1});
  try {
    const token=AuthService.generateToken({userId:admin.id,companyId:null,role:null});const endpoint=`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin/pricing-sources/${source.id}/sync`;const request=()=>fetch(endpoint,{method:'POST',headers:{authorization:`Bearer ${token}`}});
    for (hash of ['', 'bad-hash']) { const response=await request(); assert.equal(response.status,409); assert.equal(((await response.json()) as {code:string}).code,'PRICING_SOURCE_EVIDENCE_REQUIRED'); }
    hash='a'.repeat(64); withItem=true; assert.equal((await request()).status,200); const [updated]=await db.select().from(schema.pricingDataSources).where(eq(schema.pricingDataSources.id,source.id)); assert.equal(updated.dataHash,hash); assert.equal(updated.authorizationEvidenceHash,null); assert.equal(updated.authorizationStatus,'pending');
    const [pending]=await db.select().from(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.sourceId,source.id)); assert.equal(pending.status,'pending'); assert.equal(pending.reviewedByUserId,null);
    const reviewBase=`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin/pricing-sources/staging`;
    const approve=(path:string)=>fetch(`${reviewBase}/${path}`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({action:'approve',sourceId:source.id})});
    assert.equal((await approve(`${pending.id}/review`)).status,409);
    assert.equal((await approve('bulk-review')).status,409);
    hash='b'.repeat(64); const changed=await request(); assert.equal(changed.status,200);
    const rows=await db.select().from(schema.priceFeedStaging).where(eq(schema.priceFeedStaging.sourceId,source.id)); assert.equal(rows.length,1); assert.equal(rows[0].status,'pending'); assert.equal(rows[0].contentHash,'b'.repeat(64));
  } finally {priceCrawlerService.crawlSource=original;await db.delete(schema.pricingDataSources).where(eq(schema.pricingDataSources.id,source.id));}
});
