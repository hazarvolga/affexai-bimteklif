import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import dotenv from "dotenv";
import { and, eq, or, sql } from "drizzle-orm";
import { useTestIsolation } from "./test-isolation";
import { skipIfDatabaseUnavailable } from "./test-db-reachability";
import { computePricingLockHash, sha256Payload } from "../../smartcheck/pricing/snapshots";

dotenv.config({ path: ".env.local" });
dotenv.config();
useTestIsolation();

test("quotation integrity against isolated PostgreSQL", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ db }, { companies, clients, quotations, quotationItems, quotationItemEvidence, users, memberships, subscriptions,
    documents, documentProcessingRuns, normalizedQuantityRows, priceSources, priceSnapshots }, { registerQuotationRoutes }] = await Promise.all([
    import("../../db"), import("../../db/schema"), import("./quotations"),
  ]);
  const isolation = await db.execute(sql`SELECT current_schema() AS schema`);
  assert.match(String(isolation.rows[0].schema), /^teklifpro_test_[a-f0-9]{32}$/);
  const routes = new Map<string, Function>();
  const app: any = Object.fromEntries(["get", "post", "patch"].map(method => [method,
    (path: string, ...handlers: Function[]) => routes.set(`${method} ${path}`, handlers.at(-1)!),
  ]));
  registerQuotationRoutes(app, () => {});
  const [company, other] = await db.insert(companies).values([{ name: "Quotes A" }, { name: "Quotes B" }]).returning();
  await db.insert(subscriptions).values([company, other].map(tenant => ({ companyId: tenant.id, plan: "starter" as const,
    bonusQuoteLimit: 1000, currentPeriodStart: new Date("2020-01-01T00:00:00Z") })));
  const [client, foreignClient] = await db.insert(clients).values([
    { name: "Own client", companyId: company.id, type: "company" },
    { name: "Other client", companyId: other.id, type: "company" },
  ]).returning();
  const payload = () => ({
    clientId: client.id, quoteNumber: crypto.randomUUID(), projectName: "Project", date: "2026-10-08", expiryDate: "2026-11-08",
    currency: "EUR", notes: "Keep these notes", status: "sent", projectDurationMonths: 6,
    escalationVolatilityPercent: 4, procurementProfile: "low_carbon", carbonRiskPremiumPercent: 2,
    informationDeliveryLevel: "cobie", informationDeliveryCostPercent: 3,
    items: [{ description: "Work", unit: "m2", quantity: 2, unitPrice: 100, costUnitPrice: 70, wastePercent: 5,
      costCategory: "labor", discountPercent: 10, vatPercent: 20 }],
  });
  // Tenant transactions need a UUID actor; policies scope by company only.
  const actorUserId = crypto.randomUUID();
  const call = async (route: string, body: unknown = {}, id?: string, companyId = company.id) => {
    const response = { statusCode: 200, body: undefined as any,
      status(code: number) { this.statusCode = code; return this; },
      json(value: unknown) { this.body = value; return this; } };
    await routes.get(route)!({ body, params: { id }, user: { companyId, userId: actorUserId } }, response);
    return response;
  };
  const create = (body: unknown = payload()) => call("post /api/quotations", body);
  const revise = (id: string, companyId = company.id) => call("post /api/quotations/:id/revision", {}, id, companyId);
  const itemsFor = (id: string) => db.select().from(quotationItems).where(eq(quotationItems.quotationId, id));
  const series = (id: string) => db.select().from(quotations).where(and(eq(quotations.companyId, company.id), or(eq(quotations.id, id), eq(quotations.parentId, id))));
  const evidenceFor = (id: string) => db.select().from(quotationItemEvidence).where(eq(quotationItemEvidence.quotationId, id));
  const evidenceFixture = async () => {
    const data = payload();
    const root = (await create({ ...data, items: [data.items[0], { ...data.items[0], description: "Second item" }] })).body;
    const [user] = await db.insert(users).values({ email: `${crypto.randomUUID()}@example.test`, fullName: "Evidence reviewer" }).returning();
    await db.insert(memberships).values({ userId: user.id, companyId: company.id, role: "owner" });
    const [document] = await db.insert(documents).values({ companyId: company.id, uploadedByUserId: user.id,
      originalFileName: "source.xlsx", displayName: "Source", mimeType: "application/octet-stream", fileSizeBytes: 1,
      storageKey: crypto.randomUUID(), checksumSha256: "a".repeat(64) }).returning();
    const [run] = await db.insert(documentProcessingRuns).values({ companyId: company.id, documentId: document.id, idempotencyKey: crypto.randomUUID() }).returning();
    const [row] = await db.insert(normalizedQuantityRows).values({ companyId: company.id, documentId: document.id, processingRunId: run.id,
      sheetName: "Sheet1", sourceRowNumber: 1, sourceCellRange: "A1:D1", reviewStatus: "approved", reviewerUserId: user.id }).returning();
    const [source] = await db.insert(priceSources).values({ companyId: company.id, sourceType: "supplier_quote", name: "Supplier",
      sourceDocumentHash: document.checksumSha256, createdByUserId: user.id }).returning();
    const [snapshot] = await db.insert(priceSnapshots).values({ companyId: company.id, priceSourceId: source.id, snapshotKey: crypto.randomUUID(),
      description: "Price", unit: "m2", amount: "100", sourceDocumentHash: document.checksumSha256 }).returning();
    await db.update(quotationItems).set({ verificationStatus: "verified", quantitySource: "document", priceSource: "snapshot",
      sourceDocumentId: document.id, sourceProcessingRunId: run.id, sourceQuantityRowId: row.id,
      sourceCellRange: row.sourceCellRange, sourceRuleVersion: "test-v1", sourceReference: "Sheet1!A1:D1",
      priceSnapshotId: snapshot.id, priceSnapshotStatus: "attached" }).where(eq(quotationItems.quotationId, root.id));
    const items = await itemsFor(root.id);
    for (const item of items) {
      await db.insert(quotationItemEvidence).values(["current", "stale", "superseded"].map((status, index) => ({
        companyId: company.id, quotationId: root.id, quotationItemId: item.id,
        evidenceType: index === 0 ? "quantity" : "price", evidenceKey: `${item.id}-${status}`,
        sourceDocumentId: document.id, sourceProcessingRunId: run.id, sourceQuantityRowId: row.id,
        sourceCellRange: row.sourceCellRange, sourceDocumentHash: document.checksumSha256, priceSnapshotId: snapshot.id,
        capturedValueJson: { quantity: "2", price: "100", nested: { originalItemId: item.id, retained: true } },
        status, createdByUserId: user.id, createdAt: new Date("2026-10-01T12:00:00Z"),
      })));
    }
    return { root, items, evidence: await evidenceFor(root.id) };
  };

  await t.test("revision clones all evidence fields/statuses with fresh IDs and correct item mapping", async () => {
    const { root, items, evidence } = await evidenceFixture();
    let sourceId = root.id;
    for (let version = 2; version <= 3; version++) {
      const sourceItems = await itemsFor(sourceId);
      const sourceEvidence = await evidenceFor(sourceId);
      const result = await revise(sourceId);
      assert.equal(result.statusCode, 200);
      const clonedItems = await itemsFor(result.body.id);
      const clonedEvidence = await evidenceFor(result.body.id);
      assert.equal(clonedEvidence.length, evidence.length);
      for (const item of sourceItems) {
        const clone = clonedItems.find(candidate => candidate.description === item.description)!;
        assert.notEqual(clone.id, item.id);
        assert.deepEqual({ ...clone, id: item.id, quotationId: sourceId }, item);
        for (const original of sourceEvidence.filter(record => record.quotationItemId === item.id)) {
          const expectedKey = sha256Payload({ sourceEvidenceId: original.id, sourceEvidenceKey: original.evidenceKey, quotationItemId: clone.id });
          const copied = clonedEvidence.find(record => record.evidenceKey === expectedKey)!;
          assert.ok(copied);
          assert.notEqual(copied.id, original.id);
          assert.equal(copied.quotationItemId, clone.id);
          assert.notEqual(copied.evidenceKey, original.evidenceKey);
          assert.deepEqual({ ...copied, id: original.id, quotationId: sourceId, quotationItemId: item.id, evidenceKey: original.evidenceKey }, original);
        }
      }
      sourceId = result.body.id;
    }
    assert.deepEqual(await evidenceFor(root.id), evidence);
    assert.equal((await revise(sourceId, other.id)).statusCode, 404);
  });

  await t.test("evidence insert failure rolls back quote, items, evidence and latest flags", async () => {
    const { root, items, evidence } = await evidenceFixture();
    const beforeItems = await db.select().from(quotationItems);
    const beforeEvidence = await db.select().from(quotationItemEvidence);
    await db.execute(sql`ALTER TABLE quotation_item_evidence ADD CONSTRAINT quote_test_evidence_failure CHECK (false) NOT VALID`);
    try {
      const result = await revise(root.id);
      assert.equal(result.statusCode, 500);
      assert.deepEqual(result.body, { error: "Failed to create revision" });
      assert.deepEqual(await series(root.id), [root]);
      assert.deepEqual(await itemsFor(root.id), items);
      assert.deepEqual(await evidenceFor(root.id), evidence);
      assert.equal((await db.select().from(quotationItems)).length, beforeItems.length);
      assert.equal((await db.select().from(quotationItemEvidence)).length, beforeEvidence.length);
    } finally {
      await db.execute(sql`ALTER TABLE quotation_item_evidence DROP CONSTRAINT quote_test_evidence_failure`);
    }
    assert.equal((await revise(root.id)).statusCode, 200);
  });

  await t.test("historic verified item without its own evidence is downgraded only in the revision", async () => {
    const root = (await create()).body;
    await db.update(quotationItems).set({ verificationStatus: "verified" }).where(eq(quotationItems.quotationId, root.id));
    const result = await revise(root.id);
    assert.equal(result.statusCode, 200);
    assert.equal((await itemsFor(result.body.id))[0].verificationStatus, "unverified");
    assert.equal((await itemsFor(root.id))[0].verificationStatus, "verified");
    assert.equal((await evidenceFor(root.id)).length, 0);
  });

  await t.test("only current quantity evidence matching the item's source can retain verification", async () => {
    const cases = [
      { label: "price only", patch: { evidenceType: "price" } },
      { label: "stale quantity", patch: { status: "stale" } },
      { label: "superseded quantity", patch: { status: "superseded" } },
      { label: "mismatched document", patch: { sourceDocumentId: null } },
      { label: "mismatched processing run", patch: { sourceProcessingRunId: null } },
      { label: "mismatched quantity row", patch: { sourceQuantityRowId: null } },
    ];
    for (const scenario of cases) {
      const { root, items } = await evidenceFixture();
      await db.update(quotationItemEvidence).set(scenario.patch).where(and(
        eq(quotationItemEvidence.quotationItemId, items[0].id), eq(quotationItemEvidence.evidenceType, "quantity"),
      ));
      const originalEvidence = await evidenceFor(root.id);
      const result = await revise(root.id);
      assert.equal(result.statusCode, 200, scenario.label);
      const clones = await itemsFor(result.body.id);
      assert.equal(clones.find(item => item.description === items[0].description)!.verificationStatus, "unverified", scenario.label);
      assert.equal(clones.find(item => item.description === items[1].description)!.verificationStatus, "verified", scenario.label);
      const copiedEvidence = await evidenceFor(result.body.id);
      assert.equal(copiedEvidence.length, originalEvidence.length, scenario.label);
      for (const original of originalEvidence) {
        const oldItem = items.find(item => item.id === original.quotationItemId)!;
        const newItem = clones.find(item => item.description === oldItem.description)!;
        const key = sha256Payload({ sourceEvidenceId: original.id, sourceEvidenceKey: original.evidenceKey, quotationItemId: newItem.id });
        const copied = copiedEvidence.find(record => record.evidenceKey === key)!;
        assert.ok(copied, scenario.label);
        assert.deepEqual({ ...copied, id: original.id, quotationId: root.id, quotationItemId: original.quotationItemId, evidenceKey: original.evidenceKey }, original);
      }
      assert.deepEqual(await evidenceFor(root.id), originalEvidence);
      assert.equal((await itemsFor(root.id))[0].verificationStatus, "verified");
    }
  });

  await t.test("revision clears item-dependent pricing lock fingerprints without granting fresh approval", async () => {
    const { root, items, evidence } = await evidenceFixture();
    const lockedAt = new Date("2026-10-02T12:00:00Z");
    const snapshot = (await db.select().from(priceSnapshots).where(eq(priceSnapshots.id, items[0].priceSnapshotId!)))[0];
    const lockHash = computePricingLockHash(items.map(item => ({ quotationItemId: item.id, priceSnapshotId: snapshot.id,
      priceSnapshotStatus: "locked", amount: snapshot.amount, currency: snapshot.currency, unit: snapshot.unit })));
    await db.update(quotations).set({ pricingSnapshotLockStatus: "locked", pricingSnapshotLockHash: lockHash,
      pricingSnapshotLockedAt: lockedAt, pricingSnapshotLockedByUserId: evidence[0].createdByUserId }).where(eq(quotations.id, root.id));
    await db.update(quotationItems).set({ priceSnapshotStatus: "locked", priceSnapshotLockedAt: lockedAt }).where(eq(quotationItems.quotationId, root.id));
    const revision = await revise(root.id);
    assert.equal(revision.statusCode, 200);
    assert.equal(revision.body.pricingSnapshotLockStatus, "unlocked");
    assert.equal(revision.body.pricingSnapshotLockHash, null);
    assert.equal(revision.body.pricingSnapshotLockedAt, null);
    assert.equal(revision.body.pricingSnapshotLockedByUserId, null);
    const clones = await itemsFor(revision.body.id);
    for (const clone of clones) {
      assert.equal(clone.priceSnapshotId, snapshot.id);
      assert.equal(clone.priceSnapshotStatus, "attached");
      assert.equal(clone.priceSnapshotLockedAt, null);
    }
    const newHash = computePricingLockHash(clones.map(item => ({ quotationItemId: item.id, priceSnapshotId: snapshot.id,
      priceSnapshotStatus: "locked", amount: snapshot.amount, currency: snapshot.currency, unit: snapshot.unit })));
    assert.notEqual(newHash, lockHash);
    const original = (await series(root.id)).find(row => row.id === root.id)!;
    assert.equal(original.pricingSnapshotLockHash, lockHash);
    assert.equal(original.pricingSnapshotLockStatus, "locked");
    assert.deepEqual(await evidenceFor(root.id), evidence);
  });

  await t.test("preserves legitimate user fields and recalculates totals", async () => {
    const result = await create({ ...payload(), grandTotal: "1" });
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.grandTotal, "216.00");
    for (const field of ["currency", "notes", "status", "projectDurationMonths", "procurementProfile", "informationDeliveryLevel"]) {
      assert.equal(result.body[field], (payload() as any)[field]);
    }
    assert.equal(result.body.escalationVolatilityPercent, "4.00");
    assert.equal(result.body.carbonRiskPremiumPercent, "2.00");
    assert.equal(result.body.informationDeliveryCostPercent, "3.00");
    const [item] = await itemsFor(result.body.id);
    assert.equal(item.costUnitPrice, "70.00");
    assert.equal(item.wastePercent, "5.00");
    assert.equal(item.costCategory, "labor");
  });

  await t.test("rejects foreign and nonexistent clients without inserting a quote", async () => {
    for (const clientId of [foreignClient.id, crypto.randomUUID()]) {
      const data = { ...payload(), clientId };
      assert.equal((await create(data)).statusCode, 400);
      assert.equal((await db.select().from(quotations).where(eq(quotations.quoteNumber, data.quoteNumber))).length, 0);
    }
  });

  await t.test("strips tenant/id/evidence/verified spoofing from manual requests", async () => {
    const id = crypto.randomUUID();
    const data = payload();
    const result = await create({ ...data, id, companyId: other.id, parentId: id, revisionVersion: 99, isLatest: false,
      pricingSnapshotLockStatus: "locked", pricingSnapshotLockHash: "forged", calibrationStatus: "collected",
      items: [{ ...data.items[0], id, companyId: other.id, quotationId: id, total: "1", quantitySource: "imported",
        priceSource: "official_reference", sourceReference: "forged evidence", verificationStatus: "verified",
        sourceDocumentId: id, sourceProcessingRunId: id, sourceQuantityRowId: id, sourceCellRange: "A1", sourceRuleVersion: "fake",
        transferIdempotencyKey: "fake", priceSnapshotStatus: "locked" }],
    });
    assert.equal(result.statusCode, 200);
    assert.notEqual(result.body.id, id);
    assert.equal(result.body.companyId, company.id);
    assert.equal(result.body.parentId, null);
    assert.equal(result.body.revisionVersion, 1);
    assert.equal(result.body.isLatest, true);
    assert.equal(result.body.pricingSnapshotLockStatus, "unlocked");
    assert.equal(result.body.pricingSnapshotLockHash, null);
    assert.equal(result.body.calibrationStatus, "not_collected");
    const [item] = await itemsFor(result.body.id);
    assert.notEqual(item.id, id);
    assert.equal(item.companyId, company.id);
    assert.equal(item.quantitySource, "manual");
    assert.equal(item.priceSource, "manual");
    assert.equal(item.verificationStatus, "unverified");
    assert.equal(item.priceSnapshotStatus, "none");
    for (const field of ["sourceReference", "sourceDocumentId", "sourceProcessingRunId", "sourceQuantityRowId", "sourceCellRange", "sourceRuleVersion", "transferIdempotencyKey"]) {
      assert.equal(item[field as keyof typeof item], null);
    }
  });

  await t.test("item insert failure rolls back both quote and preceding items", async () => {
    await db.execute(sql`ALTER TABLE quotation_items ADD CONSTRAINT quote_test_insert_failure CHECK (description <> '__fail__') NOT VALID`);
    try {
      const data = payload();
      const result = await create({ ...data, items: [...data.items, { ...data.items[0], description: "__fail__" }] });
      assert.equal(result.statusCode, 500);
      assert.equal((await db.select().from(quotations).where(eq(quotations.quoteNumber, data.quoteNumber))).length, 0);
    } finally {
      await db.execute(sql`ALTER TABLE quotation_items DROP CONSTRAINT quote_test_insert_failure`);
    }
  });

  await t.test("invalid inputs and statuses return 400, not database errors", async () => {
    for (const override of [{ status: "verified" }, { date: "bad" }, { items: [null] }, { items: [] }, { items: [{ ...payload().items[0], costUnitPrice: -1 }] }]) {
      assert.equal((await create({ ...payload(), ...override })).statusCode, 400);
    }
    const quote = (await create()).body;
    for (const status of ["invalid", null, 42, {}]) {
      assert.equal((await call("patch /api/quotations/:id/status", { status }, quote.id)).statusCode, 400);
    }
    assert.equal((await call("patch /api/quotations/:id/status", { status: "won" }, quote.id)).statusCode, 200);
    assert.equal((await call("patch /api/quotations/:id/status", { status: "lost" }, quote.id, other.id)).statusCode, 404);
  });

  await t.test("revision marks original and all children nonlatest and rejects stale/foreign sources", async () => {
    const root = (await create()).body;
    const next = await revise(root.id);
    assert.equal(next.statusCode, 200);
    assert.equal(next.body.revisionVersion, 2);
    assert.equal(next.body.status, "draft");
    assert.equal((await series(root.id)).filter(row => row.isLatest).length, 1);
    assert.equal((await revise(root.id)).statusCode, 409);
    assert.equal((await revise(next.body.id, other.id)).statusCode, 404);
    const third = await revise(next.body.id);
    assert.equal(third.body.revisionVersion, 3);
    assert.equal(third.body.parentId, root.id);
    assert.equal((await series(root.id)).filter(row => row.isLatest).length, 1);
    const [originalItem] = await itemsFor(root.id);
    const [clone] = await itemsFor(third.body.id);
    assert.notEqual(clone.id, originalItem.id);
    assert.deepEqual({ ...clone, id: originalItem.id, quotationId: root.id }, originalItem);
  });

  await t.test("failed clone rolls back revision and latest flags", async () => {
    const root = (await create()).body;
    await db.execute(sql`ALTER TABLE quotation_items ADD CONSTRAINT quote_test_clone_failure CHECK (false) NOT VALID`);
    try {
      assert.equal((await revise(root.id)).statusCode, 500);
      const rows = await series(root.id);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].isLatest, true);
      assert.equal((await itemsFor(root.id)).length, 1);
    } finally {
      await db.execute(sql`ALTER TABLE quotation_items DROP CONSTRAINT quote_test_clone_failure`);
    }
  });

  await t.test("concurrent revisions serialize the series and admit only one successor", async () => {
    const root = (await create()).body;
    const responses = await Promise.all(Array.from({ length: 6 }, () => revise(root.id)));
    assert.deepEqual(responses.map(result => result.statusCode).sort(), [200, 409, 409, 409, 409, 409]);
    const rows = await series(root.id);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map(row => row.revisionVersion).sort(), [1, 2]);
    assert.equal(rows.filter(row => row.isLatest).length, 1);
    assert.equal((await itemsFor(rows.find(row => row.isLatest)!.id)).length, 1);
    const latestId = rows.find(row => row.isLatest)!.id;
    const nextResponses = await Promise.all([revise(root.id), ...Array.from({ length: 5 }, () => revise(latestId))]);
    assert.deepEqual(nextResponses.map(result => result.statusCode).sort(), [200, 409, 409, 409, 409, 409]);
    const finalRows = await series(root.id);
    assert.deepEqual(finalRows.map(row => row.revisionVersion).sort(), [1, 2, 3]);
    assert.equal(finalRows.filter(row => row.isLatest).length, 1);
  });
});
