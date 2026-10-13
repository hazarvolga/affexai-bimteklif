import assert from "node:assert/strict";
import test from "node:test";
import dotenv from "dotenv";
import { eq, sql } from "drizzle-orm";
import { useTestIsolation } from "../../server/routes/test-isolation";
import { withLegacyQuotaConstraint } from "./quota-test-constraints";

dotenv.config({ path: ".env.local" });
dotenv.config();
useTestIsolation();

test("billing reads authoritative quota without consuming or rejecting exhausted accounts", async (t) => {
  const [{ db }, { companies, plans, subscriptions, usageRecords, usageLogs }, { registerBillingRoutes }] = await Promise.all([
    import("../../db"), import("../../db/schema"), import("../../server/routes/billing"),
  ]);
  assert.match(String((await db.execute(sql`SELECT current_schema() AS schema`)).rows[0].schema), /^teklifpro_test_[a-f0-9]{32}$/);
  const routes = new Map<string, Function>();
  registerBillingRoutes({ get(path: string, ...handlers: Function[]) { routes.set(path, handlers.at(-1)!); } } as any);
  const [company, other] = await db.insert(companies).values([{ name: "Billing" }, { name: "Other" }]).returning();
  const [plan] = await db.insert(plans).values({ name: "Custom", monthlyQuoteLimit: 2, monthlyPrice: 0 }).returning();
  await db.insert(subscriptions).values({ companyId: company.id, planId: plan.id, bonusQuoteLimit: 1, currentPeriodStart: new Date("2020-01-01Z") });
  const now = new Date();
  const period = now.toISOString().slice(0, 7);
  await db.insert(usageRecords).values([
    { companyId: company.id, period, quoteCount: 3 },
    { companyId: company.id, period: "2000-01", quoteCount: 900 }, { companyId: other.id, period, quoteCount: 800 },
  ]);
  await db.insert(usageLogs).values([
    { companyId: company.id, feature: "QUOTATION_CREATED", count: 99, costEstimate: "0", date: now },
    { companyId: company.id, feature: "PDF_GENERATED", count: 4, costEstimate: "1.25", date: now },
    { companyId: other.id, feature: "PDF_GENERATED", count: 100, costEstimate: "10", date: now },
    { companyId: company.id, feature: "PDF_GENERATED", count: 200, costEstimate: "20", date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 1) },
    { companyId: company.id, feature: "PDF_GENERATED", count: 300, costEstimate: "30", date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) },
  ]);
  const read = async (companyId = company.id) => {
    const response = { statusCode: 200, body: undefined as any, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } };
    await routes.get("/api/billing/usage-stats")!({ user: { companyId } }, response);
    return response;
  };
  const quote = (body: any) => body.usage.find((item: any) => item.feature === "QUOTATION_CREATED");

  await t.test("dynamic plan plus bonus and summed counters override detached logs", async () => {
    const response = await read();
    assert.equal(response.statusCode, 200);
    assert.equal(quote(response.body).current, 3);
    assert.equal(quote(response.body).limit, 3);
    assert.equal(quote(response.body).enforced, true);
    assert.equal(quote(response.body).available, false);
    assert.equal(quote(response.body).reason, "QUOTA_EXCEEDED");
    assert.equal(response.body.plan, "Custom");
    assert.equal(response.body.period.key, period);
    assert.equal(new Date(response.body.period.start).toISOString(), new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString());
    const pdf = response.body.usage.find((item: any) => item.feature === "PDF_GENERATED");
    assert.equal(pdf.current, 4);
    assert.equal(pdf.enforced, true, "PDF is limited per package (P0-6)");
    assert.equal(pdf.limit, 20, "unset plan column keeps the legacy limit");
    assert.equal(pdf.remaining, 16);
    assert.equal(pdf.cost, 1.25);
    assert.deepEqual(response.body.payments, { available: false, upgradeAvailable: false });
    assert.equal((await db.select().from(usageRecords).where(eq(usageRecords.companyId, company.id))).length, 2);
  });

  await t.test("report sums pre-migration duplicate counters without depending on duplicate head fixtures", async () => {
    await withLegacyQuotaConstraint(db, "usage_records_company_id_period_key", async () => {
      const [duplicate] = await db.insert(usageRecords).values({ companyId: company.id, period, quoteCount: 2 }).returning();
      try {
        const response = await read();
        assert.equal(response.statusCode, 200);
        assert.equal(quote(response.body).current, 5);
      } finally {
        await db.delete(usageRecords).where(eq(usageRecords.id, duplicate.id));
      }
    });
  });

  await t.test("inactive subscriptions and plans still report configured limits and counters", async () => {
    await db.update(subscriptions).set({ status: "canceled" }).where(eq(subscriptions.companyId, company.id));
    const inactive = await read();
    assert.equal(inactive.statusCode, 200);
    assert.equal(quote(inactive.body).current, 3);
    assert.equal(quote(inactive.body).limit, 3);
    assert.equal(quote(inactive.body).reason, "SUBSCRIPTION_INACTIVE");
    await db.update(subscriptions).set({ status: "active" }).where(eq(subscriptions.companyId, company.id));
    await db.update(plans).set({ isActive: false }).where(eq(plans.id, plan.id));
    const unavailablePlan = await read();
    assert.equal(unavailablePlan.statusCode, 200);
    assert.equal(quote(unavailablePlan.body).limit, 3);
    assert.equal(quote(unavailablePlan.body).reason, "PLAN_UNAVAILABLE");
  });

  await t.test("legacy null planId uses shared fallback; missing subscription is visible without fake allowance", async () => {
    await db.update(subscriptions).set({ planId: null }).where(eq(subscriptions.companyId, company.id));
    const legacy = await read();
    assert.equal(quote(legacy.body).limit, 21);
    assert.equal(quote(legacy.body).available, true);
    const missing = await read(other.id);
    assert.equal(missing.statusCode, 200);
    assert.equal(quote(missing.body).current, 800);
    assert.equal(quote(missing.body).limit, null);
    assert.equal(quote(missing.body).reason, "SUBSCRIPTION_REQUIRED");
  });

  await t.test("zero allowance and expired entitlement remain readable without enabling payments", async () => {
    await db.update(plans).set({ monthlyQuoteLimit: 0, isActive: true }).where(eq(plans.id, plan.id));
    await db.update(subscriptions).set({ planId: plan.id, bonusQuoteLimit: 0 }).where(eq(subscriptions.companyId, company.id));
    const zero = await read();
    assert.equal(zero.statusCode, 200);
    assert.equal(quote(zero.body).limit, 0);
    assert.equal(quote(zero.body).reason, "QUOTA_EXCEEDED");
    await db.update(subscriptions).set({ currentPeriodEnd: new Date("2020-02-01Z") }).where(eq(subscriptions.companyId, company.id));
    const expired = await read();
    assert.equal(expired.statusCode, 200);
    assert.equal(quote(expired.body).limit, 0);
    assert.equal(quote(expired.body).reason, "SUBSCRIPTION_INACTIVE");
    assert.equal(quote(expired.body).available, false);
    assert.equal(expired.body.payments.upgradeAvailable, false);
    assert.equal(routes.has("/api/billing/upgrade"), false);
  });

  await t.test("report database failure is generic 503, not a fabricated empty report", async (t) => {
    t.mock.method(db, "transaction", async () => { throw new Error("private database details"); });
    const result = await read();
    assert.equal(result.statusCode, 503);
    assert.equal(JSON.stringify(result.body).includes("private database details"), false);
  });
});
