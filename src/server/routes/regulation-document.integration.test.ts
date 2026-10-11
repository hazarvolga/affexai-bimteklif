import dotenv from 'dotenv';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { useTestIsolation } from './test-isolation';
dotenv.config({path:'.env.local'});
useTestIsolation();
test('official sync fails closed before persistence and does not spend AI quota', async()=>{
 const [{db},schema,{registerRegulationRoutes},{AuthService},{RegulatoryIntelligenceService}] = await Promise.all([import('../../db'),import('../../db/schema'),import('./regulations'),import('../../services/auth/authService'),import('../../services/regulations/regulatoryService')]);
 const [company]=await db.insert(schema.companies).values({name:'Document HTTP'}).returning();
 const [user]=await db.insert(schema.users).values({email:'doc-http@example.test',fullName:'Reviewer',emailVerified:new Date()}).returning();
 await db.insert(schema.memberships).values({companyId:company.id,userId:user.id,role:'owner'});
 const app=express();app.use(express.json());registerRegulationRoutes(app,new RegulatoryIntelligenceService(),(_req:any,_res:any,next:any)=>next());
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${(server.address() as any).port}`;
 const token=AuthService.generateToken({userId:user.id,companyId:company.id,role:'owner'});
 const call=(body:unknown)=>fetch(base+'/api/regulations/sync',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
 try {
 const missing=await call({});assert.equal(missing.status,400);assert.equal((await missing.json()).code,'REGULATION_SOURCE_REQUIRED');
 const invalid=await call({sourceUrl:'https://127.0.0.1/secret'});assert.equal(invalid.status,400);
 for(let i=0;i<3;i++) await call({});
 assert.equal((await call({})).status,429);
 assert.equal((await db.select().from(schema.sourceIngestionRuns)).length,0);
 assert.equal((await db.select().from(schema.regulationAlerts)).length,0);
 assert.equal((await db.select().from(schema.usageLogs)).length,0);
 } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
