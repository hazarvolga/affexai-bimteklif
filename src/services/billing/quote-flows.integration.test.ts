import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test from "node:test";
import dotenv from "dotenv";
import express from "express";
import { and, eq, sql } from "drizzle-orm";
import { useTestIsolation } from "../../server/routes/test-isolation";

dotenv.config({ path: ".env.local" });
dotenv.config();
useTestIsolation();

test("manual and import quotation transactions share serialized quota", { timeout: 30_000 }, async (t) => {
  const [{ db }, schema, manual, smartcheck] = await Promise.all([
    import("../../db"), import("../../db/schema"), import("../../server/routes/quotations"), import("../../server/routes/smartcheck"),
  ]);
  const { companies, clients, users, memberships, plans, subscriptions, quotations, usageRecords, documents, documentProcessingRuns, normalizedQuantityRows } = schema;
  assert.match(String((await db.execute(sql`SELECT current_schema() AS schema`)).rows[0].schema), /^teklifpro_test_[a-f0-9]{32}$/);
  const routes = new Map<string, Function>();
  const app: any = Object.fromEntries(["get", "post", "patch", "put"].map(method => [method,
    (path: string, ...handlers: Function[]) => routes.set(`${method} ${path}`, handlers.at(-1)!),
  ]));
  manual.registerQuotationRoutes(app, () => {});
  smartcheck.registerSmartCheckRoutes(app);
  const fixture = async (limit = 3, bonus = 0) => {
    const [company] = await db.insert(companies).values({ name: "Quota flow" }).returning();
    const [user] = await db.insert(users).values({ email: `${crypto.randomUUID()}@example.test`, fullName: "Owner", emailVerified: new Date() }).returning();
    await db.insert(memberships).values({ userId: user.id, companyId: company.id, role: "owner" });
    const [client] = await db.insert(clients).values({ companyId: company.id, name: "Existing client", type: "company" }).returning();
    const [plan] = await db.insert(plans).values({ name: "Flow plan", monthlyQuoteLimit: limit, monthlyPrice: 0 }).returning();
    await db.insert(subscriptions).values({ companyId: company.id, planId: plan.id, bonusQuoteLimit: bonus,
      currentPeriodStart: new Date("2020-01-01T00:00:00Z") });
    const [document] = await db.insert(documents).values({ companyId: company.id, uploadedByUserId: user.id, originalFileName: "rows.csv", displayName: "Rows",
      mimeType: "text/csv", fileSizeBytes: 10, storageKey: crypto.randomUUID(), checksumSha256: "a".repeat(64) }).returning();
    const [run] = await db.insert(documentProcessingRuns).values({ companyId: company.id, documentId: document.id, idempotencyKey: crypto.randomUUID() }).returning();
    const [row] = await db.insert(normalizedQuantityRows).values({ companyId: company.id, documentId: document.id, processingRunId: run.id,
      sheetName: "Rows", sourceRowNumber: 1, sourceCellRange: "A1:D1", normalizedDescription: "Work", normalizedUnit: "m2", normalizedQuantity: "2",
      normalizedPrice: "100", reviewStatus: "approved", reviewerUserId: user.id }).returning();
    const request = async (route: string, body: unknown, id = document.id) => {
      const response = { statusCode: 200, body: undefined as any, status(code: number) { this.statusCode = code; return this; }, json(value: unknown) { this.body = value; return this; } };
      await routes.get(route)!({ body, params: { id }, user: { companyId: company.id, userId: user.id } }, response);
      return response;
    };
    const createManual = (description = "Work") => request("post /api/quotations", {
      clientId: client.id, projectName: "Manual", quoteNumber: crypto.randomUUID(), date: "2026-10-08", expiryDate: "2026-11-08",
      items: [{ description, unit: "m2", quantity: 2, unitPrice: 100 }],
    });
    const createImport = (overrides = {}) => request("post /api/smartcheck/documents/:id/transfer-to-new-quotation", {
      clientName: "New import client", rowIds: [row.id], overrides,
    });
    const count = async () => (await db.select().from(usageRecords).where(eq(usageRecords.companyId, company.id))).reduce((sum, record) => sum + record.quoteCount, 0);
    const quotes = () => db.select().from(quotations).where(eq(quotations.companyId, company.id));
    return { company, user, client, document, row, request, createManual, createImport, count, quotes };
  };

  await t.test("manual/import concurrency shares the same final slots", async () => {
    const f = await fixture(3);
    const responses = await Promise.all(Array.from({ length: 10 }, (_, index) => index % 2 ? f.createManual() : f.createImport()));
    assert.equal(responses.filter(response => response.statusCode < 300).length, 3);
    assert.equal(responses.filter(response => response.statusCode === 403).length, 7);
    assert.equal(await f.count(), 3);
    assert.equal((await f.quotes()).length, 3);
  });

  await t.test("zero and bonus apply equally to both creation routes", async () => {
    const denied = await fixture(0);
    assert.equal((await denied.createManual()).statusCode, 403);
    assert.equal((await denied.createImport()).statusCode, 403);
    const bonus = await fixture(0, 2);
    assert.equal((await bonus.createManual()).statusCode, 200);
    assert.equal((await bonus.createImport()).statusCode, 201);
    assert.equal((await bonus.createManual()).statusCode, 403);
    assert.equal(await bonus.count(), 2);
  });

  await t.test("inactive subscription denies both routes without creating records", async () => {
    const f = await fixture();
    await db.update(subscriptions).set({ status: "canceled" }).where(eq(subscriptions.companyId, f.company.id));
    assert.equal((await f.createManual()).statusCode, 403);
    assert.equal((await f.createImport()).statusCode, 403);
    assert.equal(await f.count(), 0);
    assert.equal((await f.quotes()).length, 0);
  });

  await t.test("item failure rolls back quota for both routes including auto-created import client", async () => {
    const f = await fixture();
    await db.update(normalizedQuantityRows).set({ normalizedDescription: "__fail__" }).where(eq(normalizedQuantityRows.id, f.row.id));
    await db.execute(sql`ALTER TABLE quotation_items ADD CONSTRAINT quota_flow_item_failure CHECK (description <> '__fail__') NOT VALID`);
    try {
      assert.equal((await f.createManual("__fail__")).statusCode, 500);
      assert.equal((await f.createImport()).statusCode, 500);
      assert.equal(await f.count(), 0);
      assert.equal((await f.quotes()).length, 0);
      assert.equal((await db.select().from(clients).where(eq(clients.companyId, f.company.id))).length, 1);
    } finally {
      await db.execute(sql`ALTER TABLE quotation_items DROP CONSTRAINT quota_flow_item_failure`);
    }
  });

  await t.test("import evidence failure and invalid input do not consume quota", async () => {
    const f = await fixture();
    assert.equal((await f.createImport({ [f.row.id]: { quantity: -1 } })).statusCode, 409);
    await db.execute(sql`ALTER TABLE quotation_item_evidence ADD CONSTRAINT quota_flow_evidence_failure CHECK (false) NOT VALID`);
    try {
      assert.equal((await f.createImport()).statusCode, 500);
      assert.equal(await f.count(), 0);
      assert.equal((await f.quotes()).length, 0);
    } finally {
      await db.execute(sql`ALTER TABLE quotation_item_evidence DROP CONSTRAINT quota_flow_evidence_failure`);
    }
  });

  await t.test("quota database failures return 503 from both routes", async () => {
    const f = await fixture();
    await db.execute(sql`ALTER TABLE usage_records ADD CONSTRAINT quota_flow_counter_failure CHECK (false) NOT VALID`);
    try {
      for (const response of [await f.createManual(), await f.createImport()]) {
        assert.equal(response.statusCode, 503);
        assert.equal(response.body.code, "QUOTA_UNAVAILABLE");
      }
      assert.equal(await f.count(), 0);
      assert.equal((await f.quotes()).length, 0);
    } finally {
      await db.execute(sql`ALTER TABLE usage_records DROP CONSTRAINT quota_flow_counter_failure`);
    }
  });

  await t.test("revisions remain free even after quota exhaustion", async () => {
    const f = await fixture(1);
    const root = await f.createManual();
    assert.equal(root.statusCode, 200);
    assert.equal((await f.createManual()).statusCode, 403);
    const revision = await f.request("post /api/quotations/:id/revision", {}, root.body.id);
    assert.equal(revision.statusCode, 200);
    assert.equal(revision.body.revisionVersion, 2);
    assert.equal(await f.count(), 1);
  });

  await t.test("post-commit audit failures cannot turn a successful import into an error", async (t) => {
    const f = await fixture(1);
    const insert = db.insert.bind(db);
    t.mock.method(db, "insert", ((table: any) => {
      if (table === schema.smartcheckAuditLogs || table === schema.usageLogs) throw new Error("private audit failure");
      return insert(table);
    }) as typeof db.insert);
    const errors = t.mock.method(console, "error", () => {});
    assert.equal((await f.createImport()).statusCode, 201);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(await f.count(), 1);
    assert.equal((await f.quotes()).length, 1);
    assert.equal(errors.mock.callCount(), 2);
    assert.equal(JSON.stringify(errors.mock.calls.map(call => call.arguments)).includes("private audit failure"), false);
  });

  await t.test("authenticated HTTP flow consumes once and logs manual/import success without finish-time increments", async (t) => {
    const f = await fixture(2);
    const saved = { JWT_SECRET: process.env.JWT_SECRET, SMARTCHECK_IMPORT_ENABLED: process.env.SMARTCHECK_IMPORT_ENABLED, SMARTCHECK_PILOT_COMPANY_IDS: process.env.SMARTCHECK_PILOT_COMPANY_IDS };
    Object.assign(process.env, { JWT_SECRET: crypto.randomBytes(48).toString("hex"), SMARTCHECK_IMPORT_ENABLED: "true", SMARTCHECK_PILOT_COMPANY_IDS: f.company.id });
    t.after(() => { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
    const [{ AuthService }, { checkRole }] = await Promise.all([import("../auth/authService"), import("../../server/middleware/auth")]);
    const token = AuthService.generateToken({ userId: f.user.id, companyId: f.company.id, role: "owner" });
    const httpApp = express();
    httpApp.use(express.json());
    manual.registerQuotationRoutes(httpApp, checkRole(["owner"]));
    smartcheck.registerSmartCheckRoutes(httpApp);
    const server = http.createServer(httpApp);
    t.after(() => new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); }));
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const post = (path: string, body: unknown) => fetch(`http://127.0.0.1:${address.port}${path}`, { method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    const body = { clientId: f.client.id, projectName: "HTTP", quoteNumber: "HTTP", date: "2026-10-08", expiryDate: "2026-11-08",
      items: [{ description: "Work", unit: "m2", quantity: 2, unitPrice: 100 }] };
    const root = await post("/api/quotations", body);
    assert.equal(root.status, 200);
    const rootBody = await root.json() as { id: string };
    const imported = await post(`/api/smartcheck/documents/${f.document.id}/transfer-to-new-quotation`, { clientId: f.client.id, rowIds: [f.row.id] });
    assert.equal(imported.status, 201);
    await imported.json();
    const exhausted = await post("/api/quotations", body);
    assert.equal(exhausted.status, 403);
    await exhausted.json();
    const revision = await post(`/api/quotations/${rootBody.id}/revision`, {});
    assert.equal(revision.status, 200);
    await revision.json();
    let logs: (typeof schema.usageLogs.$inferSelect)[] = [];
    for (let attempt = 0; attempt < 30; attempt++) {
      logs = await db.select().from(schema.usageLogs).where(and(eq(schema.usageLogs.companyId, f.company.id), eq(schema.usageLogs.feature, "QUOTATION_CREATED")));
      if (logs.length === 2) break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(logs.length, 2);
    assert.equal(await f.count(), 2);
    assert.equal((await f.quotes()).length, 3);
  });
});
