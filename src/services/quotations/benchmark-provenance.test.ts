import express from 'express';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import test from 'node:test';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { useTestIsolation } from '../../server/routes/test-isolation';
dotenv.config({path:'.env.local',quiet:true});useTestIsolation();

test('benchmark approval is revalidated atomically and persisted through creation and revision',async t=>{
 const [{db},s,{manualQuotationInput},{createManualQuotation,createQuotationRevision},{loadEditableQuotation}] = await Promise.all([
  import('../../db'),import('../../db/schema'),import('./input'),import('./integrity'),import('./edit'),
 ]);
 const [company]=await db.insert(s.companies).values({name:'Benchmark test'}).returning();
 await db.insert(s.subscriptions).values({companyId:company.id,plan:'starter',status:'active',currentPeriodStart:new Date('2020-01-01T00:00:00Z')});
 const [client]=await db.insert(s.clients).values({name:'Buyer',type:'company',companyId:company.id}).returning();
 const [reviewer]=await db.insert(s.users).values({email:'benchmark@example.test',fullName:'Reviewer'}).returning();
 const [source]=await db.insert(s.pricingDataSources).values({code:'test',name:'Test source',category:'market_commodity',validityStart:new Date(Date.now()-86400000),validityEnd:new Date(Date.now()+86400000),reviewStatus:'verified',reviewEvidenceReference:'https://example.org/test-permission',reviewScope:'Ticari teklifler',reviewAllowsQuotations:true,reviewedByUserId:reviewer.id,reviewedAt:new Date(),authorizationStatus:'authorized',authorizationScope:'test fixture: tenant-approved benchmark lifecycle',authorizationEvidenceHash:'a'.repeat(64),authorizedAt:new Date()}).returning();
 const [row]=await db.insert(s.priceFeedStaging).values({sourceId:source.id,itemCode:'A',itemName:'Test',unit:'m3',crawledPrice:'100',status:'pending',reviewedAt:new Date(),reviewedByUserId:reviewer.id}).returning();
 const input=(fields={})=>manualQuotationInput.parse({clientId:client.id,quoteNumber:'T',projectName:'Test',date:'2026-01-01',expiryDate:'2026-12-31',items:[{description:'A - Test',unit:'m3',quantity:1,unitPrice:100,benchmarkStagingId:row.id,...fields}]});
 for(const status of ['pending','rejected']) await t.test(`refuses ${status} at save`,async()=>{
  await db.update(s.priceFeedStaging).set({status}).where(eq(s.priceFeedStaging.id,row.id));
  await assert.rejects(createManualQuotation({companyId:company.id,userId:reviewer.id},input()),{status:409});
 });
 await db.update(s.priceFeedStaging).set({status:'approved'}).where(eq(s.priceFeedStaging.id,row.id));
 await t.test('HTTP benchmarks exclude pending, rejected, unknown dates and stale sources',async()=>{
  const [{registerPricingRoutes},{AuthService}]=await Promise.all([import('../../server/routes/pricing'),import('../auth/authService')]);
  await db.insert(s.memberships).values({companyId:company.id,userId:reviewer.id,role:'owner'});
  await db.insert(s.priceFeedStaging).values(['pending','rejected'].map(status=>({sourceId:source.id,itemCode:status,itemName:status,unit:'m3',crawledPrice:'5',status})));
  const app=express();registerPricingRoutes(app);
  const server=createServer(app);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();assert.ok(address&&typeof address!=='string');
  const headers={Authorization:`Bearer ${AuthService.generateToken({userId:reviewer.id,companyId:company.id,role:'owner'})}`};
  const read=async()=>{const r=await fetch(`http://127.0.0.1:${address.port}/api/pricing/benchmarks`,{headers});assert.equal(r.status,200);return r.json();};
  try {
   assert.deepEqual((await read()).items.map((i:{id:string})=>i.id),[row.id]);
   await db.update(s.pricingDataSources).set({status:'stale'}).where(eq(s.pricingDataSources.id,source.id));
   assert.equal((await read()).items.length,0);
   await db.update(s.pricingDataSources).set({status:'active',validityEnd:null}).where(eq(s.pricingDataSources.id,source.id));
   const unknown=await read();assert.equal(unknown.items.length,0);assert.equal(unknown.sourcesSummary[0].validityRange,'Geçerlilik tarihi bilinmiyor');
  } finally {
   server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));
   await db.update(s.pricingDataSources).set({status:'active',validityEnd:new Date(Date.now()+86400000)}).where(eq(s.pricingDataSources.id,source.id));
  }
 });
 await t.test('does not relabel foreign-currency prices as TRY',async()=>{
  await db.update(s.pricingDataSources).set({currency:'USD'}).where(eq(s.pricingDataSources.id,source.id));
  await assert.rejects(createManualQuotation({companyId:company.id,userId:reviewer.id},input()),{status:409});
  await db.update(s.pricingDataSources).set({currency:'TRY'}).where(eq(s.pricingDataSources.id,source.id));
 });
 await t.test('refuses expired and missing validity at save',async()=>{
  for(const validityEnd of [null,new Date(Date.now()-1000)]){
   await db.update(s.pricingDataSources).set({validityEnd}).where(eq(s.pricingDataSources.id,source.id));
   await assert.rejects(createManualQuotation({companyId:company.id,userId:reviewer.id},input()),{status:409});
  }
  await db.update(s.pricingDataSources).set({validityEnd:new Date(Date.now()+86400000)}).where(eq(s.pricingDataSources.id,source.id));
 });
 await t.test('refuses stale browser price and changed unit',async()=>{
  await assert.rejects(createManualQuotation({companyId:company.id,userId:reviewer.id},input({unitPrice:99})),{status:409});
  await assert.rejects(createManualQuotation({companyId:company.id,userId:reviewer.id},input({unit:'ton'})),{status:409});
 });
 await t.test('stores server snapshot and preserves it on revision',async()=>{
  const quote=await createManualQuotation({companyId:company.id,userId:reviewer.id},input({sourceReference:'forged'}));
  const [item]=await db.select().from(s.quotationItems).where(eq(s.quotationItems.quotationId,quote.id));
  const snapshot=JSON.parse(item.sourceReference!);
  assert.equal(snapshot.stagingId,row.id);assert.equal(snapshot.reviewedByUserId,reviewer.id);assert.equal(snapshot.price,'100.00');
  assert.equal(snapshot.permissionReview.scope,undefined);assert.equal(snapshot.permissionReview.reviewedByUserId,undefined);
  assert.match(snapshot.permissionReview.scopeHash,/^[a-f0-9]{64}$/);
  const [{registerQuotationRoutes},{AuthService}]=await Promise.all([import('../../server/routes/quotations'),import('../auth/authService')]);
  const [viewer]=await db.insert(s.users).values({email:'benchmark-viewer@example.test',fullName:'Viewer'}).returning();
  await db.insert(s.memberships).values({companyId:company.id,userId:viewer.id,role:'viewer'});
  const app=express();registerQuotationRoutes(app,(_req:any,_res:any,next:any)=>next());
  const server=createServer(app);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();assert.ok(address&&typeof address!=='string');
  try {
   const response=await fetch(`http://127.0.0.1:${address.port}/api/quotations/${quote.id}`,{headers:{Authorization:`Bearer ${AuthService.generateToken({userId:viewer.id,companyId:company.id,role:'viewer'})}`}});
   assert.equal(response.status,200);const body=await response.json();
   const viewerReview=JSON.parse(body.items[0].sourceReference).permissionReview;
   assert.equal(viewerReview.scope,undefined);assert.equal(viewerReview.reviewedByUserId,undefined);
   assert.match(viewerReview.scopeHash,/^[a-f0-9]{64}$/);
  } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
  assert.equal(item.priceSource,'market');assert.equal(item.costUnitPrice,null);assert.equal(Number(item.wastePercent),0);
  await assert.rejects(loadEditableQuotation(company.id,quote.id),{status:409});
  const revision=await createQuotationRevision({companyId:company.id,userId:reviewer.id},quote.id);
  const [copy]=await db.select().from(s.quotationItems).where(eq(s.quotationItems.quotationId,revision.id));
  assert.equal(copy.sourceReference,item.sourceReference);
 });
});
