import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import dotenv from "dotenv";
import { skipIfDatabaseUnavailable } from "../../server/routes/test-db-reachability";
import { useTestIsolation } from "../../server/routes/test-isolation";

dotenv.config({ path: ".env.local" });
dotenv.config();
useTestIsolation();

test("M-12.6: a manual line picked from the company catalogue keeps its approved price snapshot", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t, "Catalogue provenance integration test")) return;
  const [{ db }, schema, drizzle, integrity, input, provenance] = await Promise.all([
    import("../../db"), import("../../db/schema"), import("drizzle-orm"), import("./integrity"), import("./input"), import("./catalog-provenance"),
  ]);
  const suffix = crypto.randomUUID();
  const [companyA, companyB] = await db.insert(schema.companies).values([{ name: `Catalog A ${suffix}` }, { name: `Catalog B ${suffix}` }]).returning();
  const [actor, authorizer, otherActor] = await db.insert(schema.users).values([
    { email: `catalog-actor-${suffix}@example.test`, fullName: "Catalog Actor", emailVerified: new Date() },
    { email: `catalog-authorizer-${suffix}@example.test`, fullName: "Catalog Authorizer", emailVerified: new Date() },
    { email: `catalog-other-${suffix}@example.test`, fullName: "Other Actor", emailVerified: new Date() },
  ]).returning();
  await db.insert(schema.memberships).values([
    { companyId: companyA.id, userId: actor.id, role: "owner" },
    { companyId: companyA.id, userId: authorizer.id, role: "admin" },
    { companyId: companyB.id, userId: otherActor.id, role: "owner" },
  ]);
  const [plan] = await db.insert(schema.plans).values({ name: `Catalog plan ${suffix}`, monthlyQuoteLimit: 50, monthlyPrice: 1 }).returning();
  await db.insert(schema.subscriptions).values([companyA, companyB].map((company) => ({ companyId: company.id, planId: plan.id, currentPeriodStart: new Date("2020-01-01") })));
  const [client] = await db.insert(schema.clients).values({ companyId: companyA.id, name: "Catalog Client", type: "company" }).returning();

  const source = async (companyId: string, createdByUserId: string, authorizedByUserId: string) => (await db.insert(schema.priceSources).values({
    companyId, sourceType: "supplier_quote", name: "Firma kataloğu", sourceDocumentHash: "c".repeat(64),
    licenseStatus: "verified", authorizationStatus: "authorized",
    authorizationScope: JSON.stringify({ version: 1, capabilities: ["commercial_quotation"], tenantScope: "own" }),
    authorizationEvidenceHash: "d".repeat(64), authorizedAt: new Date("2026-10-01T09:00:00Z"), authorizedByUserId, createdByUserId,
  }).returning())[0];
  const snapshot = async (companyId: string, priceSourceId: string, userId: string, overrides: Record<string, unknown> = {}) => (await db.insert(schema.priceSnapshots).values({
    companyId, priceSourceId, snapshotKey: `catalog-${crypto.randomUUID()}`, positionCode: "15.150.1006",
    description: "C30/37 hazır beton", unit: "m³", amount: "2500", currency: "TRY", vatStatus: "excluded", vatPercent: "20",
    validFrom: new Date("2026-01-01T00:00:00Z"), validUntil: new Date("2099-12-31T23:59:59Z"), sourceDocumentHash: "e".repeat(64),
    reviewStatus: "approved", reviewedByUserId: userId, reviewedAt: new Date("2026-10-02T09:00:00Z"), createdByUserId: userId,
    ...overrides,
  }).returning())[0];
  const ownSource = await source(companyA.id, actor.id, authorizer.id);
  const approved = await snapshot(companyA.id, ownSource.id, actor.id);
  const advisory = await snapshot(companyA.id, ownSource.id, actor.id, { reviewStatus: "advisory", reviewedByUserId: null, reviewedAt: null });
  const foreign = await snapshot(companyB.id, (await source(companyB.id, otherActor.id, otherActor.id)).id, otherActor.id);

  const tenant = { companyId: companyA.id, userId: actor.id };
  const catalogLine = { priceSnapshotId: approved.id, description: "Perde duvar betonu", unit: "m³", quantity: 24, unitPrice: 2500, vatPercent: 20 };
  const payload = (items: unknown[]) => input.manualQuotationInput.parse({
    clientId: client.id, quoteNumber: `CAT-${crypto.randomUUID()}`, projectName: "Katalog", date: "2026-10-27", expiryDate: "2026-11-27", currency: "TRY",
    items,
  });
  const countQuotes = async () => (await db.select().from(schema.quotations).where(drizzle.eq(schema.quotations.companyId, companyA.id))).length;

  // Bound line: price source, position code, snapshot link and one current price evidence row.
  const quote = await integrity.createManualQuotation(tenant, payload([catalogLine, { description: "Elle girilen kalem", unit: "m²", quantity: 10, unitPrice: 300, vatPercent: 20 }]));
  const items = await db.select().from(schema.quotationItems).where(drizzle.eq(schema.quotationItems.quotationId, quote.id));
  const bound = items.find((item) => item.priceSnapshotId)!;
  const manual = items.find((item) => !item.priceSnapshotId)!;
  assert.equal(bound.priceSource, "snapshot");
  assert.equal(bound.priceSnapshotStatus, "attached");
  assert.equal(bound.sourceReference, "15.150.1006");
  assert.equal(bound.quantitySource, "manual");
  assert.equal(Number(bound.unitPrice), 2500);
  assert.equal(manual.priceSource, "manual");
  assert.equal(manual.priceSnapshotStatus, "none");
  const evidence = await db.select().from(schema.quotationItemEvidence).where(drizzle.eq(schema.quotationItemEvidence.quotationId, quote.id));
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].quotationItemId, bound.id);
  assert.equal(evidence[0].evidenceType, "price");
  assert.equal(evidence[0].priceSnapshotId, approved.id);
  assert.equal((evidence[0].capturedValueJson as { amount?: string }).amount, "2500.00");

  // A revision keeps the binding and its evidence.
  const revision = await integrity.createQuotationRevision(tenant, quote.id);
  const revisedItems = await db.select().from(schema.quotationItems).where(drizzle.eq(schema.quotationItems.quotationId, revision.id));
  assert.equal(revisedItems.filter((item) => item.priceSnapshotId === approved.id).length, 1);
  assert.equal((await db.select().from(schema.quotationItemEvidence).where(drizzle.eq(schema.quotationItemEvidence.quotationId, revision.id))).length, 1);

  // Every mismatch is refused before anything is written.
  const before = await countQuotes();
  for (const line of [
    { ...catalogLine, unitPrice: 2600 },
    { ...catalogLine, vatPercent: 10 },
    { ...catalogLine, unit: "m²" },
    { ...catalogLine, priceSnapshotId: advisory.id },
    { ...catalogLine, priceSnapshotId: foreign.id },
    { ...catalogLine, priceSnapshotId: crypto.randomUUID() },
  ]) {
    await assert.rejects(integrity.createManualQuotation(tenant, payload([line])), (error: unknown) =>
      error instanceof integrity.QuotationIntegrityError && error.status === 409 && error.message === provenance.CATALOG_BINDING_STALE_MESSAGE);
  }
  assert.equal(await countQuotes(), before, "refused requests leave no quotation behind");

  // One line cannot claim both a platform benchmark and a catalogue snapshot.
  assert.equal(input.manualQuotationInput.safeParse({
    clientId: client.id, quoteNumber: "X", projectName: "X", date: "2026-10-27", expiryDate: "2026-11-27",
    items: [{ ...catalogLine, benchmarkStagingId: crypto.randomUUID() }],
  }).success, false);
});
