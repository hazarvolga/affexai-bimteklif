import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { useTestIsolation } from '../../server/routes/test-isolation';

dotenv.config({ path: '.env.local' });
dotenv.config();
useTestIsolation();

const sha256 = (buf: Buffer) => crypto.createHash('sha256').update(buf).digest('hex');

test('IFC monthly quota and atomic usage counter integration tests', async (t) => {
  const { db } = await import('../../db');
  const { companies, users, memberships, plans, subscriptions, documents, documentProcessingRuns, usageRecords } = await import('../../db/schema');
  const { eq, and } = await import('drizzle-orm');
  const { changeProcessingRun, ensureQueueSchema, ProcessingConflict } = await import('./service');
  const { processSmartCheckDocument } = await import('./processor');
  const { createStorageAdapter } = await import('./storage');

  await ensureQueueSchema();
  const adapter = createStorageAdapter();

  const [company] = await db.insert(companies).values({ name: 'Quota Company' }).returning();
  const [user] = await db.insert(users).values({ email: 'quota-user@example.test', fullName: 'Quota User' }).returning();
  await db.insert(memberships).values({ companyId: company.id, userId: user.id, role: 'owner' });

  // Plan with monthly limit 2 and concurrency limit 5
  const [plan] = await db.insert(plans).values({
    name: 'Quota Plan',
    monthlyPrice: 1000,
    monthlyQuoteLimit: 100,
    monthlyIfcLimit: 2,
    ifcMaxFileMb: 100,
    ifcMaxConcurrent: 5,
    isActive: true,
  }).returning();

  const [subscription] = await db.insert(subscriptions).values({
    companyId: company.id,
    planId: plan.id,
    status: 'active',
    bonusIfcLimit: 0,
  }).returning();

  const validIfcContent = Buffer.from(
    "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n" +
    "#1=IFCPROJECT('0YvctVUKr0kuhdA1mMGL7b',#2,'Project',$,$,$,$,(#3),#4);\n" +
    "#2=IFCOWNERHISTORY(#5,#6,$,.ADDED.,$,$,$,1700000000);\n" +
    "#3=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#7,$);\n" +
    "#4=IFCUNITASSIGNMENT((#8));\n" +
    "#5=IFCPERSONANDORGANIZATION(#9,#10,$);\n" +
    "#6=IFCAPPLICATION(#10,'2024','App','App');\n" +
    "#7=IFCAXIS2PLACEMENT3D(#11,$,$);\n" +
    "#8=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);\n" +
    "#9=IFCPERSON($,'User',$,$,$,$,$,$);\n" +
    "#10=IFCORGANIZATION($,'Org',$,$,$);\n" +
    "#11=IFCCARTESIANPOINT((0.,0.,0.));\n" +
    "#12=IFCWALL('2O2Fr$t4X7Zf8NOew3FL9r',#2,'Wall-01',$,$,#13,#14,'guid-wall-01');\n" +
    "#13=IFCLOCALPLACEMENT($,#7);\n" +
    "#14=IFCPRODUCTDEFINITIONSHAPE($,$,(#15));\n" +
    "#15=IFCSHAPEREPRESENTATION(#3,'Body','SweptSolid',(#16));\n" +
    "#16=IFCEXTRUDEDAREASOLID(#17,#7,#18,3.0);\n" +
    "#17=IFCRECTANGLEPROFILEDEF(.AREA.,$,#19,5.0,0.2);\n" +
    "#18=IFCDIRECTION((0.,0.,1.));\n" +
    "#19=IFCAXIS2PLACEMENT2D(#20,$);\n" +
    "#20=IFCCARTESIANPOINT((0.,0.));\n" +
    "#21=IFCQUANTITYVOLUME('NetVolume',$,$,3.0);\n" +
    "#22=IFCELEMENTQUANTITY('3k9F8H5t14$vJ6L4M1P3Q5',#2,'BaseQuantities',$,$,(#21));\n" +
    "#23=IFCRELDEFINESBYPROPERTIES('1a2b3c4d5e6f7a8b9c0d1e',#2,$,$,(#12),#22);\n" +
    "ENDSEC;\nEND-ISO-10303-21;\n"
  );
  const validIfcHash = sha256(validIfcContent);

  const currentPeriod = new Date().toISOString().slice(0, 7);

  await t.test('1. Successful IFC run increments usage_records.ifc_count and sets quota_consumed=true', async () => {
    const [doc1] = await db.insert(documents).values({
      companyId: company.id,
      uploadedByUserId: user.id,
      originalFileName: 'doc1.ifc',
      displayName: 'doc1',
      mimeType: 'application/ifc',
      fileSizeBytes: validIfcContent.length,
      storageKey: 'doc1.ifc',
      checksumSha256: validIfcHash,
    }).returning();
    await adapter.put('doc1.ifc', validIfcContent, 'application/ifc');

    const runRes = await changeProcessingRun({
      companyId: company.id,
      userId: user.id,
      documentId: doc1.id,
      action: 'process',
    });
    assert.equal(runRes.status, 202);

    await processSmartCheckDocument({
      companyId: company.id,
      documentId: doc1.id,
      processingRunId: runRes.run.id,
    });

    const [updatedRun] = await db.select().from(documentProcessingRuns).where(eq(documentProcessingRuns.id, runRes.run.id));
    assert.equal(updatedRun.status, 'succeeded');
    assert.equal(updatedRun.quotaConsumed, true);

    const [usage] = await db.select().from(usageRecords).where(and(eq(usageRecords.companyId, company.id), eq(usageRecords.period, currentPeriod)));
    assert.equal(usage?.ifcCount, 1);
  });

  await t.test('2. Re-running the same succeeded run does NOT double-increment usage_records.ifc_count', async () => {
    const [doc1] = await db.select().from(documents).where(and(eq(documents.companyId, company.id), eq(documents.originalFileName, 'doc1.ifc')));
    const [run1] = await db.select().from(documentProcessingRuns).where(eq(documentProcessingRuns.documentId, doc1.id));
    assert.equal(run1.quotaConsumed, true);

    // Re-execute processSmartCheckDocument directly (e.g. idempotency replay or duplicate worker invocation)
    await processSmartCheckDocument({
      companyId: company.id,
      documentId: doc1.id,
      processingRunId: run1.id,
    });

    const [usage] = await db.select().from(usageRecords).where(and(eq(usageRecords.companyId, company.id), eq(usageRecords.period, currentPeriod)));
    assert.equal(usage?.ifcCount, 1, 'ifc_count must still be 1, not 2');
  });

  await t.test('3. Failed IFC run does NOT consume quota and leaves quota_consumed=false', async () => {
    // IFC content without any quantities -> fails with IFC_NO_ADMISSIBLE_QUANTITY_EVIDENCE
    const emptyIfc = Buffer.from(
      "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n"
    );
    const emptyIfcHash = sha256(emptyIfc);
    const [docFail] = await db.insert(documents).values({
      companyId: company.id,
      uploadedByUserId: user.id,
      originalFileName: 'fail.ifc',
      displayName: 'fail',
      mimeType: 'application/ifc',
      fileSizeBytes: emptyIfc.length,
      storageKey: 'fail.ifc',
      checksumSha256: emptyIfcHash,
    }).returning();
    await adapter.put('fail.ifc', emptyIfc, 'application/ifc');

    const failRunRes = await changeProcessingRun({
      companyId: company.id,
      userId: user.id,
      documentId: docFail.id,
      action: 'process',
    });
    assert.equal(failRunRes.status, 202);

    await assert.rejects(
      processSmartCheckDocument({
        companyId: company.id,
        documentId: docFail.id,
        processingRunId: failRunRes.run.id,
      }),
      /IFC_NO_ADMISSIBLE_QUANTITY_EVIDENCE/
    );

    const [failedRun] = await db.select().from(documentProcessingRuns).where(eq(documentProcessingRuns.id, failRunRes.run.id));
    assert.equal(failedRun.status, 'failed');
    assert.equal(failedRun.quotaConsumed, false);

    const [usage] = await db.select().from(usageRecords).where(and(eq(usageRecords.companyId, company.id), eq(usageRecords.period, currentPeriod)));
    assert.equal(usage?.ifcCount, 1, 'failed run must not consume quota');
  });

  await t.test('4. Enqueue rejects when monthly limit is reached (403 IFC_QUOTA_EXCEEDED)', async () => {
    // Process second valid IFC doc to reach monthly limit of 2
    const [doc2] = await db.insert(documents).values({
      companyId: company.id,
      uploadedByUserId: user.id,
      originalFileName: 'doc2.ifc',
      displayName: 'doc2',
      mimeType: 'application/ifc',
      fileSizeBytes: validIfcContent.length,
      storageKey: 'doc2.ifc',
      checksumSha256: validIfcHash,
    }).returning();
    await adapter.put('doc2.ifc', validIfcContent, 'application/ifc');

    const run2Res = await changeProcessingRun({
      companyId: company.id,
      userId: user.id,
      documentId: doc2.id,
      action: 'process',
    });
    assert.equal(run2Res.status, 202);

    await processSmartCheckDocument({
      companyId: company.id,
      documentId: doc2.id,
      processingRunId: run2Res.run.id,
    });

    const [usage] = await db.select().from(usageRecords).where(and(eq(usageRecords.companyId, company.id), eq(usageRecords.period, currentPeriod)));
    assert.equal(usage?.ifcCount, 2, 'should now have completed 2 runs');

    // Attempt to enqueue a 3rd IFC doc
    const [doc3] = await db.insert(documents).values({
      companyId: company.id,
      uploadedByUserId: user.id,
      originalFileName: 'doc3.ifc',
      displayName: 'doc3',
      mimeType: 'application/ifc',
      fileSizeBytes: validIfcContent.length,
      storageKey: 'doc3.ifc',
      checksumSha256: validIfcHash,
    }).returning();
    await adapter.put('doc3.ifc', validIfcContent, 'application/ifc');

    await assert.rejects(
      changeProcessingRun({
        companyId: company.id,
        userId: user.id,
        documentId: doc3.id,
        action: 'process',
      }),
      (err: any) => {
        assert.ok(err instanceof ProcessingConflict);
        assert.equal(err.code, 'IFC_QUOTA_EXCEEDED');
        assert.equal(err.status, 403);
        assert.match(err.message, /Aylık IFC işleme kotanız dolmuştur/);
        return true;
      }
    );
  });

  await t.test('5. Bonus IFC limit increases quota and allows enqueue', async () => {
    // Add bonus IFC limit of 1
    await db.update(subscriptions).set({ bonusIfcLimit: 1 }).where(eq(subscriptions.id, subscription.id));

    const [doc3] = await db.select().from(documents).where(and(eq(documents.companyId, company.id), eq(documents.originalFileName, 'doc3.ifc')));

    // Now enqueue should succeed (limit 2 + bonus 1 = 3 > completed 2)
    const run3Res = await changeProcessingRun({
      companyId: company.id,
      userId: user.id,
      documentId: doc3.id,
      action: 'process',
    });
    assert.equal(run3Res.status, 202);

    await processSmartCheckDocument({
      companyId: company.id,
      documentId: doc3.id,
      processingRunId: run3Res.run.id,
    });

    const [usage] = await db.select().from(usageRecords).where(and(eq(usageRecords.companyId, company.id), eq(usageRecords.period, currentPeriod)));
    assert.equal(usage?.ifcCount, 3, 'should now have completed 3 runs');
  });

  await t.test('6. Concurrent N requests cannot exceed monthly quota', async () => {
    const prevConcurrentEnv = process.env.SMARTCHECK_IFC_MAX_CONCURRENT;
    process.env.SMARTCHECK_IFC_MAX_CONCURRENT = '10';

    try {
      const [c2] = await db.insert(companies).values({ name: 'Concurrent Quota Co' }).returning();
      const [p2] = await db.insert(plans).values({
        name: 'Plan Limit 2',
        monthlyPrice: 500,
        monthlyQuoteLimit: 100,
        monthlyIfcLimit: 2,
        ifcMaxFileMb: 50,
        ifcMaxConcurrent: 10,
        isActive: true,
      }).returning();
      await db.insert(subscriptions).values({
        companyId: c2.id,
        planId: p2.id,
        status: 'active',
        bonusIfcLimit: 0,
      });
      const [u2] = await db.insert(users).values({ email: 'c2@example.test', fullName: 'C2 User' }).returning();
      await db.insert(memberships).values({ companyId: c2.id, userId: u2.id, role: 'owner' });

      // Create 5 different IFC documents
      const docIds: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const key = `parallel_${i}.ifc`;
        const [doc] = await db.insert(documents).values({
          companyId: c2.id,
          uploadedByUserId: u2.id,
          originalFileName: key,
          displayName: key,
          mimeType: 'application/ifc',
          fileSizeBytes: validIfcContent.length,
          storageKey: key,
          checksumSha256: validIfcHash,
        }).returning();
        await adapter.put(key, validIfcContent, 'application/ifc');
        docIds.push(doc.id);
      }

      // Fire 5 parallel changeProcessingRun calls
      const results = await Promise.allSettled(
        docIds.map((documentId) =>
          changeProcessingRun({
            companyId: c2.id,
            userId: u2.id,
            documentId,
            action: 'process',
          })
        )
      );

      const fulfilled = results.filter((r): r is PromiseFulfilledResult<{ status: number; run: any }> => r.status === 'fulfilled');
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

      assert.equal(fulfilled.length, 2, 'exactly 2 requests should be allowed');
      assert.equal(rejected.length, 3, 'the other 3 requests must be rejected');
      for (const r of rejected) {
        assert.equal(r.reason?.code, 'IFC_QUOTA_EXCEEDED');
        assert.equal(r.reason?.status, 403);
      }
    } finally {
      process.env.SMARTCHECK_IFC_MAX_CONCURRENT = prevConcurrentEnv;
    }
  });
});
