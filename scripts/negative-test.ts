import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";

async function runTests() {
  console.log("=== STARTING PRE-PHASE 1 DATABASE INTEGRITY TESTS ===");

  const connectionString = process.env.DATABASE_URL || "postgres://localhost/teklifpro_shadow";
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool, { schema });

  const suffix = Date.now() + "_" + Math.floor(Math.random() * 1000);

  let companyA: any;
  let companyB: any;
  let userA: any;
  let userB: any;
  let userDual: any;

  try {
    console.log("Creating Tenant Companies...");
    const [c_A] = await db.insert(schema.companies).values({ name: `Company A ${suffix}` }).returning();
    companyA = c_A;
    const [c_B] = await db.insert(schema.companies).values({ name: `Company B ${suffix}` }).returning();
    companyB = c_B;

    console.log("Creating Users...");
    const [u_A] = await db.insert(schema.users).values({ email: `userA_${suffix}@compA.com`, fullName: "User A" }).returning();
    userA = u_A;
    const [u_B] = await db.insert(schema.users).values({ email: `userB_${suffix}@compB.com`, fullName: "User B" }).returning();
    userB = u_B;
    const [u_Dual] = await db.insert(schema.users).values({ email: `dual_${suffix}@comp.com`, fullName: "Dual User" }).returning();
    userDual = u_Dual;

    console.log("Creating Memberships...");
    await db.insert(schema.memberships).values({
      companyId: companyA.id,
      userId: userA.id,
      role: "owner"
    }).returning();
    await db.insert(schema.memberships).values({
      companyId: companyB.id,
      userId: userB.id,
      role: "owner"
    }).returning();
    await db.insert(schema.memberships).values({
      companyId: companyA.id,
      userId: userDual.id,
      role: "manager"
    }).returning();
    await db.insert(schema.memberships).values({
      companyId: companyB.id,
      userId: userDual.id,
      role: "manager"
    }).returning();

    console.log("Creating Documents & Processing Runs for Tenant A...");
    const [docA] = await db.insert(schema.documents).values({
      companyId: companyA.id,
      uploadedByUserId: userA.id,
      originalFileName: "specification_A.pdf",
      displayName: "Specification A",
      mimeType: "application/pdf",
      fileSizeBytes: 10240,
      storageKey: "keys/specification_A.pdf",
      checksumSha256: "checksumA",
      status: "completed"
    }).returning();

    const [docA2] = await db.insert(schema.documents).values({
      companyId: companyA.id,
      uploadedByUserId: userA.id,
      originalFileName: "specification_A2.pdf",
      displayName: "Specification A2",
      mimeType: "application/pdf",
      fileSizeBytes: 20480,
      storageKey: "keys/specification_A2.pdf",
      checksumSha256: "checksumA2",
      status: "completed"
    }).returning();

    const [runA] = await db.insert(schema.documentProcessingRuns).values({
      companyId: companyA.id,
      documentId: docA.id,
      status: "succeeded",
      currentStage: "completed",
      idempotencyKey: `idem-A-1-${suffix}`,
      pipelineVersion: 1,
    }).returning();

    console.log("Creating Client & Quotation under Tenant A...");
    const [clientA] = await db.insert(schema.clients).values({
      companyId: companyA.id,
      name: "Client A",
      type: "company"
    }).returning();
    const [quoteA] = await db.insert(schema.quotations).values({
      companyId: companyA.id,
      clientId: clientA.id,
      quoteNumber: `Q-2026-001-${suffix}`,
      projectName: "Project A",
      expiryDate: new Date(Date.now() + 86400000),
      subtotal: "5000",
      discountTotal: "0",
      vatTotal: "1000",
      grandTotal: "6000",
    }).returning();

    console.log("Creating Review Sessions & Items...");
    const [sessionA] = await db.insert(schema.reviewSessions).values({
      companyId: companyA.id,
      quotationId: quoteA.id,
      assignedToUserId: userA.id,
      createdByUserId: userA.id,
      status: "draft"
    }).returning();
    const [itemA] = await db.insert(schema.quotationItems).values({
      companyId: companyA.id,
      quotationId: quoteA.id,
      description: "Quotation Item A",
      unit: "pcs",
      quantity: "1",
      unitPrice: "5000",
      total: "5000"
    }).returning();

    console.log("\n--- TEST 1: Cross-Tenant Rule Candidate Injection (Expected Failure) ---");
    try {
      await db.insert(schema.ruleCandidates).values({
        companyId: companyB.id,
        documentId: docA.id,
        processingRunId: runA.id,
        ruleCode: "RULE-001",
        title: "Leaked Rule Title",
        description: "Rule description",
        originalTextEvidence: "original text",
        severity: "medium",
        errorCategory: "classification_code",
        competencyArea: "Structure",
        suggestedAction: "Modify unit price",
        confidenceScore: "0.85",
        sourceEvidenceJson: {
          sourceType: "pdf",
          documentId: docA.id,
          pageNumber: 1,
          sourceText: "Evidence text",
          extractionConfidence: 0.85
        },
        status: "draft"
      });
      console.error("❌ Test 1 FAILED: Database allowed cross-tenant document leak!");
      process.exit(1);
    } catch (err: any) {
      console.log("✅ Test 1 PASSED: Database rejected cross-tenant injection.");
      console.log(`Error Message: ${err.message}`);
    }

    console.log("\n--- TEST 2: Cross-Document Run/Doc Mismatch Injection (Expected Failure) ---");
    try {
      await db.insert(schema.ruleCandidates).values({
        companyId: companyA.id,
        documentId: docA2.id,
        processingRunId: runA.id,
        ruleCode: "RULE-002",
        title: "Mismatch Doc Title",
        description: "Rule description",
        originalTextEvidence: "original text",
        severity: "medium",
        errorCategory: "classification_code",
        competencyArea: "Structure",
        suggestedAction: "Modify quantity",
        confidenceScore: "0.90",
        sourceEvidenceJson: {
          sourceType: "pdf",
          documentId: docA2.id,
          pageNumber: 2,
          sourceText: "Evidence text 2",
          extractionConfidence: 0.90
        },
        status: "draft"
      });
      console.error("❌ Test 2 FAILED: Database allowed cross-document run mismatch!");
      process.exit(1);
    } catch (err: any) {
      console.log("✅ Test 2 PASSED: Database rejected cross-document mismatch injection.");
      console.log(`Error Message: ${err.message}`);
    }

    console.log("\n--- TEST 3: Competency Signal Evidence User Mismatch (Expected Failure) ---");
    const [signalA] = await db.insert(schema.competencySignals).values({
      companyId: companyA.id,
      userId: userA.id,
      errorCategory: "classification_code",
      competencyArea: "Structure",
      signalFingerprint: `fingerprint-user-a-structure-${suffix}`,
      status: "observing"
    }).returning();
    const [findingA] = await db.insert(schema.reviewFindings).values({
      companyId: companyA.id,
      reviewSessionId: sessionA.id,
      quotationId: quoteA.id,
      quotationItemId: itemA.id,
      reportedByUserId: userA.id,
      errorCategory: "classification_code",
      severity: "medium",
      details: "Finding detail",
      originalValue: "5000",
      status: "open"
    }).returning();

    try {
      await db.insert(schema.competencySignalEvidence).values({
        companyId: companyA.id,
        competencySignalId: signalA.id,
        reviewFindingId: findingA.id,
        observedUserId: userB.id
      });
      console.error("❌ Test 3 FAILED: Database allowed competency signal user mismatch!");
      process.exit(1);
    } catch (err: any) {
      console.log("✅ Test 3 PASSED: Database rejected competency signal user mismatch.");
      console.log(`Error Message: ${err.message}`);
    }

    console.log("\n--- TEST 4: Correct Integration Records Insertion (Expected Success) ---");
    try {
      const [candidateA] = await db.insert(schema.ruleCandidates).values({
        companyId: companyA.id,
        documentId: docA.id,
        processingRunId: runA.id,
        ruleCode: "RULE-003",
        title: "Valid Rule",
        description: "Rule description",
        originalTextEvidence: "original text",
        severity: "medium",
        errorCategory: "classification_code",
        competencyArea: "Structure",
        suggestedAction: "Modify unit",
        confidenceScore: "0.95",
        sourceEvidenceJson: {
          sourceType: "pdf",
          documentId: docA.id,
          pageNumber: 1,
          sourceText: "Evidence text",
          extractionConfidence: 0.95
        },
        status: "draft"
      }).returning();
      await db.insert(schema.competencySignalEvidence).values({
        companyId: companyA.id,
        competencySignalId: signalA.id,
        reviewFindingId: findingA.id,
        observedUserId: userA.id
      }).returning();
      console.log(`✅ Test 4 PASSED: Integrity verified! Candidate ID: ${candidateA.id}`);
    } catch (err: any) {
      console.error(`❌ Test 4 FAILED: Database rejected valid constraints. Error: ${err.message}`);
      process.exit(1);
    }

    console.log("\n--- TEST 5: Non-Member User as Document Uploader (Expected Failure) ---");
    try {
      await db.insert(schema.documents).values({
        companyId: companyA.id,
        uploadedByUserId: userB.id,
        originalFileName: "unauthorized.pdf",
        displayName: "Unauthorized PDF",
        mimeType: "application/pdf",
        fileSizeBytes: 2048,
        storageKey: "keys/unauthorized.pdf",
        checksumSha256: "checksumB",
        status: "uploaded"
      });
      console.error("❌ Test 5 FAILED: Allowed non-member user to upload document!");
      process.exit(1);
    } catch (err: any) {
      console.log("✅ Test 5 PASSED: Database rejected non-member document uploader.");
      console.log(`Error Message: ${err.message}`);
    }

    console.log("\n--- TEST 6: Non-Member User as Review Session Assignee (Expected Failure) ---");
    try {
      await db.insert(schema.reviewSessions).values({
        companyId: companyA.id,
        quotationId: quoteA.id,
        assignedToUserId: userB.id,
        createdByUserId: userA.id,
        status: "draft"
      });
      console.error("❌ Test 6 FAILED: Allowed non-member assignee on review session!");
      process.exit(1);
    } catch (err: any) {
      console.log("✅ Test 6 PASSED: Database rejected non-member assignee.");
      console.log(`Error Message: ${err.message}`);
    }

    console.log("\n--- TEST 7: Non-Member User as Rule Registry Approver (Expected Failure) ---");
    try {
      await db.insert(schema.ruleRegistry).values({
        companyId: companyA.id,
        ruleCode: `RULE-X-${suffix}`,
        scope: "company",
        createdByUserId: userA.id,
        approvedByUserId: userB.id,
        approvedAt: new Date(),
        status: "active"
      });
      console.error("❌ Test 7 FAILED: Allowed non-member approver on rule registry!");
      process.exit(1);
    } catch (err: any) {
      console.log("✅ Test 7 PASSED: Database rejected non-member rule approver.");
      console.log(`Error Message: ${err.message}`);
    }

    console.log("\n--- TEST 8: Dual Member context validation (Expected Success) ---");
    try {
      const [docDualA] = await db.insert(schema.documents).values({
        companyId: companyA.id,
        uploadedByUserId: userDual.id,
        originalFileName: "dual_A.pdf",
        displayName: "Dual A",
        mimeType: "application/pdf",
        fileSizeBytes: 5000,
        storageKey: "keys/dual_a.pdf",
        checksumSha256: "checksumDualA",
        status: "uploaded"
      }).returning();
      const [docDualB] = await db.insert(schema.documents).values({
        companyId: companyB.id,
        uploadedByUserId: userDual.id,
        originalFileName: "dual_B.pdf",
        displayName: "Dual B",
        mimeType: "application/pdf",
        fileSizeBytes: 6000,
        storageKey: "keys/dual_b.pdf",
        checksumSha256: "checksumDualB",
        status: "uploaded"
      }).returning();
      console.log(`✅ Test 8 PASSED: Dual member accepted in respective tenant contexts! Doc A ID: ${docDualA.id}, Doc B ID: ${docDualB.id}`);
    } catch (err: any) {
      console.error(`❌ Test 8 FAILED: Dual membership check failed. Error: ${err.message}`);
      process.exit(1);
    }

    console.log("\n--- TEST 9: Nullable Reviewer/Approver fields (Expected Success) ---");
    try {
      const [ruleRegDraft] = await db.insert(schema.ruleRegistry).values({
        companyId: companyA.id,
        ruleCode: `RULE-DRAFT-1-${suffix}`,
        scope: "company",
        createdByUserId: userA.id,
        approvedByUserId: null,
        approvedAt: null,
        status: "draft"
      }).returning();
      console.log(`✅ Test 9 PASSED: Nullable fields successfully accepted! Rule Draft ID: ${ruleRegDraft.id}`);
    } catch (err: any) {
      console.error(`❌ Test 9 FAILED: Nullable fields check failed. Error: ${err.message}`);
      process.exit(1);
    }

    console.log("\n=== ALL DATABASE INTEGRITY TESTS PASSED SUCCESSFULLY ===");

  } finally {
    try {
      console.log("\nCleaning up integration test fixture data...");
      if (companyA?.id || companyB?.id) {
        const companyIds = [companyA?.id, companyB?.id].filter(Boolean);
        await db.execute(sql`DELETE FROM competency_signal_evidence WHERE company_id IN (${sql.raw(companyIds.map(id => `'${id}'`).join(','))})`);
        await db.execute(sql`DELETE FROM competency_signals WHERE company_id IN (${sql.raw(companyIds.map(id => `'${id}'`).join(','))})`);
        await db.execute(sql`DELETE FROM review_findings WHERE company_id IN (${sql.raw(companyIds.map(id => `'${id}'`).join(','))})`);
        await db.execute(sql`DELETE FROM review_sessions WHERE company_id IN (${sql.raw(companyIds.map(id => `'${id}'`).join(','))})`);
        await db.execute(sql`DELETE FROM rule_versions WHERE company_id IN (${sql.raw(companyIds.map(id => `'${id}'`).join(','))})`);
        await db.execute(sql`DELETE FROM rule_candidates WHERE company_id IN (${sql.raw(companyIds.map(id => `'${id}'`).join(','))})`);
        await db.execute(sql`DELETE FROM document_processing_runs WHERE company_id IN (${sql.raw(companyIds.map(id => `'${id}'`).join(','))})`);
        await db.execute(sql`DELETE FROM documents WHERE company_id IN (${sql.raw(companyIds.map(id => `'${id}'`).join(','))})`);
        await db.execute(sql`DELETE FROM quotation_items WHERE company_id IN (${sql.raw(companyIds.map(id => `'${id}'`).join(','))})`);
        await db.execute(sql`DELETE FROM quotations WHERE company_id IN (${sql.raw(companyIds.map(id => `'${id}'`).join(','))})`);
        await db.execute(sql`DELETE FROM clients WHERE company_id IN (${sql.raw(companyIds.map(id => `'${id}'`).join(','))})`);
        await db.execute(sql`DELETE FROM rule_registry WHERE company_id IN (${sql.raw(companyIds.map(id => `'${id}'`).join(','))})`);
        await db.execute(sql`DELETE FROM memberships WHERE company_id IN (${sql.raw(companyIds.map(id => `'${id}'`).join(','))})`);
        if (userA?.id || userB?.id || userDual?.id) {
          const userIds = [userA?.id, userB?.id, userDual?.id].filter(Boolean);
          await db.execute(sql`DELETE FROM users WHERE id IN (${sql.raw(userIds.map(id => `'${id}'`).join(','))})`);
        }
        await db.execute(sql`DELETE FROM companies WHERE id IN (${sql.raw(companyIds.map(id => `'${id}'`).join(','))})`);
      }
      console.log("Cleanup complete!");
    } catch (cleanupErr) {
      console.error("Error during cleanup:", cleanupErr);
    } finally {
      await pool.end();
    }
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});