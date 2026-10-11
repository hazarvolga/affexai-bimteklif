import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { useTestIsolation } from '../../server/routes/test-isolation';
dotenv.config({ path: '.env.local' });
useTestIsolation();
test('concurrent upload reservation, rollback, tenant isolation and safe pending cleanup', async () => {
  const [{ db }, schema, { reserveUpload }, { cleanupExpiredPendingUploads }, { eq, sql }] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('./upload-quota'), import('./upload-cleanup'), import('drizzle-orm')]);
  assert.match(String((await db.execute(sql`select current_schema() as schema`)).rows[0].schema), /^teklifpro_test_/);
  const [a,b] = await db.insert(schema.companies).values([{name:'Upload A'},{name:'Upload B'}]).returning();
  const [user] = await db.insert(schema.users).values({email:'upload-quota@example.test',fullName:'Upload tester'}).returning();
  await db.insert(schema.memberships).values([a,b].map(c=>({ companyId:c.id,userId:user.id,role:'owner' as const })));
  const input=(companyId=a.id, bytes=6) => ({companyId,uploadedByUserId:user.id,originalFileName:'test.csv',displayName:'test.csv',mimeType:'text/csv',fileSizeBytes:bytes,storageKey:`${companyId}/${crypto.randomUUID()}/original`,checksumSha256:'pending',status:'uploaded' as const});
  const previous = process.env.SMARTCHECK_TENANT_STORAGE_MAX_BYTES;
  process.env.SMARTCHECK_TENANT_STORAGE_MAX_BYTES='10';
  try {
    const result=await Promise.allSettled(Array.from({length:6},()=>reserveUpload(input(),async()=>({url:'test'}))));
    assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
    await reserveUpload(input(b.id),async()=>({url:'tenant-b'}));
    await assert.rejects(reserveUpload(input(a.id,1),async()=>{throw new Error('sign failure')}), /sign failure/);
    const rows=await db.select().from(schema.documents).where(eq(schema.documents.companyId,a.id));
    assert.equal(rows.length,1);
    const old = new Date(Date.now()-26*3600000);
    await db.update(schema.documents).set({createdAt:old}).where(eq(schema.documents.companyId,a.id));
    const keys:string[]=[];
    assert.deepEqual(await cleanupExpiredPendingUploads({delete:async key=>{keys.push(key);throw new Error('storage unavailable')}}),{scanned:1,removed:0,failed:1});
    assert.equal((await db.select().from(schema.documents).where(eq(schema.documents.companyId,a.id))).length,1);
    assert.deepEqual(await cleanupExpiredPendingUploads({delete:async key=>{keys.push(key)}}),{scanned:1,removed:1,failed:0});
    assert.equal(keys.every(key=>key.startsWith(a.id+'/')),true);
    const completed = await reserveUpload(input(a.id,2),async()=>({url:'new'}));
    await db.update(schema.documents).set({createdAt:old,checksumSha256:'verified',status:'completed'}).where(eq(schema.documents.id,completed.document.id));
    assert.deepEqual(await cleanupExpiredPendingUploads({delete:async()=>{throw new Error('must not delete completed')}}),{scanned:0,removed:0,failed:0});
    assert.equal((await db.select().from(schema.documents).where(eq(schema.documents.companyId,b.id))).length,1);
  } finally { if(previous===undefined) delete process.env.SMARTCHECK_TENANT_STORAGE_MAX_BYTES; else process.env.SMARTCHECK_TENANT_STORAGE_MAX_BYTES=previous; }
});
