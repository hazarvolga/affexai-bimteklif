import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import dotenv from "dotenv";
import { and, eq, sql } from "drizzle-orm";
import { useTestIsolation } from "./test-isolation";

dotenv.config({ path: ".env.local" });
dotenv.config();
useTestIsolation();

test("SmartCheck transfers persist honest review evidence", { timeout: 30_000 }, async (t) => {
  const [{ db }, schema, { registerSmartCheckRoutes }, { createQuotationRevision }] = await Promise.all([
    import("../../db"), import("../../db/schema"), import("./smartcheck"),
    import("../../services/quotations/integrity"),
  ]);
  const { companies, users, memberships, clients, subscriptions, documents, documentProcessingRuns,
    normalizedQuantityRows, quotations, quotationItems, quotationItemEvidence } = schema;
  assert.match(String((await db.execute(sql`SELECT current_schema() AS schema`)).rows[0].schema), /^teklifpro_test_[a-f0-9]{32}$/);
  // Invoke the final route handler directly: no HTTP server or queue startup is needed.
  const routes = new Map<string, Function>();
  const app: any = Object.fromEntries(["get", "post", "patch", "put"].map(method => [method,
    (path: string, ...handlers: Function[]) => routes.set(`${method} ${path}`, handlers.at(-1)!),
  ]));
  registerSmartCheckRoutes(app);
  const reviewedAt = new Date("2026-01-02T10:00:00Z");
  const fixture = async (reviewStatus: "approved" | "accepted_exception") => {
    const [company] = await db.insert(companies).values({ name: "Transfer evidence tenant" }).returning();
    const [owner, reviewer] = await db.insert(users).values(["Owner", "Reviewer"].map(fullName => ({
      email: `${randomUUID()}@example.test`, fullName, emailVerified: reviewedAt,
    }))).returning();
    await db.insert(memberships).values([owner, reviewer].map(user => ({ companyId: company.id, userId: user.id, role: "owner" as const })));
    await db.insert(subscriptions).values({ companyId: company.id, plan: "starter", status: "active",
      currentPeriodStart: new Date("2020-01-01T00:00:00Z") });
    const [client] = await db.insert(clients).values({ companyId: company.id, name: "Evidence client", type: "company" }).returning();
    const [document] = await db.insert(documents).values({ companyId: company.id, uploadedByUserId: owner.id,
      originalFileName: "quantities.csv", displayName: "Quantities", mimeType: "text/csv", fileSizeBytes: 10,
      storageKey: randomUUID(), checksumSha256: "a".repeat(64) }).returning();
    const [run] = await db.insert(documentProcessingRuns).values({ companyId: company.id, documentId: document.id,
      idempotencyKey: randomUUID() }).returning();
    const [row] = await db.insert(normalizedQuantityRows).values({ companyId: company.id, documentId: document.id,
      processingRunId: run.id, sheetName: "Rows", sourceRowNumber: 1, sourceCellRange: "A1:D1",
      normalizedDescription: "Reviewed work", normalizedQuantity: "10", normalizedUnit: "m", normalizedPrice: "100",
      reviewStatus, reviewerUserId: reviewer.id, reviewedAt, reviewerNotes: "Source checked; exception documented",
      findingsJson: [{ ruleVersion: "pilot-unit-v1" }, { ruleVersion: "pilot-cost-v1" }, { ruleVersion: "pilot-unit-v1" }],
    }).returning();
    return { company, owner, reviewer, client, document, run, row };
  };
  const persisted = async (companyId: string, quotationId: string) => {
    const items = await db.select().from(quotationItems).where(and(eq(quotationItems.companyId, companyId), eq(quotationItems.quotationId, quotationId)));
    const evidence = await db.select().from(quotationItemEvidence).where(and(eq(quotationItemEvidence.companyId, companyId), eq(quotationItemEvidence.quotationId, quotationId)));
    assert.equal(items.length, 1);
    assert.equal(evidence.filter(record => record.evidenceType === "quantity").length, 1);
    return { item: items[0], evidence: evidence.find(record => record.evidenceType === "quantity")! };
  };

  for (const mode of ["existing", "new"] as const) {
    for (const reviewStatus of ["accepted_exception", "approved"] as const) {
      for (const changed of [false, true]) {
        await t.test(`${mode}: ${reviewStatus}, ${changed ? "overridden" : "unchanged"} quantity`, async () => {
          const f = await fixture(reviewStatus);
          const quantity = changed ? 11 : 10;
          const existing = mode === "existing" ? (await db.insert(quotations).values({ companyId: f.company.id,
            clientId: f.client.id, quoteNumber: randomUUID(), projectName: "Existing draft", date: reviewedAt,
            expiryDate: new Date("2099-01-01T00:00:00Z"), status: "draft",
            subtotal: "0.00", discountTotal: "0.00", vatTotal: "0.00", grandTotal: "0.00",
          }).returning())[0] : undefined;
          const response = { statusCode: 200, body: undefined as any,
            status(code: number) { this.statusCode = code; return this; },
            json(body: unknown) { this.body = body; return this; } };
          const handler = routes.get(`post /api/smartcheck/documents/:id/transfer-to-${mode === "new" ? "new-" : ""}quotation`)!;
          await handler({ params: { id: f.document.id }, user: { companyId: f.company.id, userId: f.owner.id, role: "owner" },
            body: { ...(existing ? { quotationId: existing.id } : { clientId: f.client.id }), rowIds: [f.row.id],
              overrides: changed ? { [f.row.id]: { quantity } } : {} } }, response);
          assert.equal(response.statusCode, mode === "new" ? 201 : 200, JSON.stringify(response.body));
          assert.equal(response.body.transferredCount, 1);
          const saved = await persisted(f.company.id, response.body.quotationId);
          assert.equal(saved.item.verificationStatus, changed ? "unverified" : reviewStatus === "approved" ? "verified" : "accepted_exception");
          assert.equal(Number(saved.item.quantity), quantity);
          assert.equal(saved.item.sourceRuleVersion, null);
          assert.equal(saved.evidence.quotationItemId, saved.item.id);
          assert.equal(saved.evidence.sourceDocumentId, f.document.id);
          assert.equal(saved.evidence.sourceProcessingRunId, f.run.id);
          assert.equal(saved.evidence.sourceQuantityRowId, f.row.id);
          assert.equal(saved.evidence.sourceDocumentHash, f.document.checksumSha256);
          assert.equal(saved.evidence.status, "current");
          assert.equal(saved.evidence.createdByUserId, f.owner.id);
          const captured = saved.evidence.capturedValueJson as { quantity: string; review: Record<string, unknown> };
          assert.equal(Number(captured.quantity), quantity);
          assert.deepEqual(captured.review, {
            status: reviewStatus, reviewerUserId: f.reviewer.id, reviewedAt: reviewedAt.toISOString(),
            notes: f.row.reviewerNotes, quantityChanged: changed, sourceQuantity: f.row.normalizedQuantity,
            sourceUnit: "m", findingRuleVersions: ["pilot-cost-v1", "pilot-unit-v1"],
            executedRuleSet: null, competencyVerified: false,
          });

          if (reviewStatus === "accepted_exception") {
            const revision = await createQuotationRevision(f.company.id, saved.item.quotationId);
            const cloned = await persisted(f.company.id, revision.id);
            assert.notEqual(cloned.item.id, saved.item.id);
            assert.notEqual(cloned.evidence.id, saved.evidence.id);
            assert.equal(cloned.evidence.quotationItemId, cloned.item.id);
            assert.equal(cloned.item.verificationStatus, changed ? "unverified" : "accepted_exception");
            assert.equal(cloned.item.sourceRuleVersion, null);
            assert.deepEqual(cloned.evidence.capturedValueJson, saved.evidence.capturedValueJson);
            assert.equal(cloned.evidence.createdByUserId, saved.evidence.createdByUserId);
            assert.deepEqual(cloned.evidence.createdAt, saved.evidence.createdAt);
            assert.equal(cloned.evidence.status, saved.evidence.status);
          }
          const [source] = await db.select().from(normalizedQuantityRows).where(eq(normalizedQuantityRows.id, f.row.id));
          assert.deepEqual(source, f.row);
        });
      }
    }
  }
});
