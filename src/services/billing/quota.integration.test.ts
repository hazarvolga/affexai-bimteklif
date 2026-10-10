import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import dotenv from "dotenv";
import { and, eq, sql } from "drizzle-orm";
import { useTestIsolation } from "../../server/routes/test-isolation";
import { withLegacyQuotaConstraint } from "./quota-test-constraints";

dotenv.config({ path: ".env.local" });
dotenv.config();
useTestIsolation();

test("serialized quotation quota in isolated PostgreSQL", { timeout: 30_000 }, async (t) => {
  const [{ db }, schema, quota] = await Promise.all([import("../../db"), import("../../db/schema"), import("./quota")]);
  const { companies, plans, subscriptions, usageRecords, clients, quotations } = schema;
  assert.match(String((await db.execute(sql`SELECT current_schema() AS schema`)).rows[0].schema), /^teklifpro_test_[a-f0-9]{32}$/);
  const now = new Date("2026-10-08T12:00:00Z");
  const fixture = async (limit = 2, bonus = 0) => {
    const [company] = await db.insert(companies).values({ name: `Quota ${crypto.randomUUID()}` }).returning();
    const [plan] = await db.insert(plans).values({ name: "Test", monthlyQuoteLimit: limit, monthlyPrice: 0 }).returning();
    const [sub] = await db.insert(subscriptions).values({ companyId: company.id, planId: plan.id, bonusQuoteLimit: bonus,
      currentPeriodStart: new Date("2026-01-01T00:00:00Z") }).returning();
    return { company, plan, sub };
  };
  const consume = (companyId: string, at = now) => db.transaction(tx => quota.consumeQuotationQuota(tx, companyId, at));
  const rows = (companyId: string, period = "2026-10") => db.select().from(usageRecords)
    .where(and(eq(usageRecords.companyId, companyId), eq(usageRecords.period, period)));
  const total = async (companyId: string, period = "2026-10") => (await rows(companyId, period)).reduce((sum, row) => sum + row.quoteCount, 0);
  const rejected = (status: number, code?: string) => (error: unknown) => {
    assert.ok(error instanceof quota.QuotaError);
    assert.equal(error.status, status);
    if (code) assert.equal(error.code, code);
    return true;
  };

  await t.test("concurrent first writes and final slot admit only available capacity", async () => {
    const { company } = await fixture(3);
    const attempts = await Promise.allSettled(Array.from({ length: 12 }, () => consume(company.id)));
    assert.equal(attempts.filter(result => result.status === "fulfilled").length, 3);
    for (const result of attempts) if (result.status === "rejected") rejected(403, "QUOTA_EXCEEDED")(result.reason);
    assert.equal(await total(company.id), 3);
    assert.equal((await rows(company.id)).length, 1);
  });

  await t.test("zero is a real limit and positive bonus grants exactly that many quotes", async () => {
    const denied = await fixture(0);
    await assert.rejects(consume(denied.company.id), rejected(403, "QUOTA_EXCEEDED"));
    assert.equal((await rows(denied.company.id)).length, 0);
    const allowed = await fixture(0, 2);
    await consume(allowed.company.id);
    await consume(allowed.company.id);
    await assert.rejects(consume(allowed.company.id), rejected(403, "QUOTA_EXCEEDED"));
    assert.equal(await total(allowed.company.id), 2);
  });

  await t.test("legacy null planId uses the advertised starter allowance", async () => {
    const { company } = await fixture();
    await db.update(subscriptions).set({ planId: null, plan: "starter", bonusQuoteLimit: 1 }).where(eq(subscriptions.companyId, company.id));
    await db.insert(usageRecords).values({ companyId: company.id, period: "2026-10", quoteCount: 20 });
    const result = await consume(company.id);
    assert.equal(result.limit, 21);
    await assert.rejects(consume(company.id), rejected(403, "QUOTA_EXCEEDED"));
  });

  await t.test("missing, inactive and expired subscriptions or plans fail closed", async () => {
    const [missing] = await db.insert(companies).values({ name: "No subscription" }).returning();
    await assert.rejects(consume(missing.id), rejected(403));
    for (const status of ["past_due", "canceled"] as const) {
      const { company } = await fixture();
      await db.update(subscriptions).set({ status }).where(eq(subscriptions.companyId, company.id));
      await assert.rejects(consume(company.id), rejected(403));
      assert.equal(await total(company.id), 0);
    }
    const { company, plan } = await fixture();
    await db.update(plans).set({ isActive: false }).where(eq(plans.id, plan.id));
    await assert.rejects(consume(company.id), rejected(403));
    assert.equal(await total(company.id), 0);
    const expired = await fixture();
    await db.update(subscriptions).set({ currentPeriodEnd: now }).where(eq(subscriptions.companyId, expired.company.id));
    await assert.rejects(consume(expired.company.id), rejected(403));
  });

  await t.test("UTC calendar boundaries reset usage independently of subscription anniversary", async () => {
    const { company } = await fixture(1);
    await db.update(subscriptions).set({ currentPeriodStart: new Date("2026-10-15T12:00:00Z"), currentPeriodEnd: new Date("2026-12-15T12:00:00Z") })
      .where(eq(subscriptions.companyId, company.id));
    await assert.rejects(consume(company.id, new Date("2026-10-15T11:59:59.999Z")), rejected(403));
    await consume(company.id, new Date("2026-10-15T12:00:00Z"));
    await assert.rejects(consume(company.id, new Date("2026-10-31T23:59:59.999Z")), rejected(403, "QUOTA_EXCEEDED"));
    const next = await consume(company.id, new Date("2026-11-01T00:00:00Z"));
    assert.equal(next.period, "2026-11");
    assert.equal(await total(company.id, "2026-10"), 1);
    assert.equal(await total(company.id, "2026-11"), 1);
  });

  await t.test("legacy duplicates are summed and only one row increments without deletion", async () => {
    const { company } = await fixture(5);
    await withLegacyQuotaConstraint(db, "usage_records_company_id_period_key", async () => {
      try {
        const originals = await db.insert(usageRecords).values([
          { companyId: company.id, period: "2026-10", quoteCount: 1 },
          { companyId: company.id, period: "2026-10", quoteCount: 2 },
        ]).returning();
        await consume(company.id);
        const after = await rows(company.id);
        assert.equal(after.length, 2);
        assert.deepEqual(after.map(row => row.id).sort(), originals.map(row => row.id).sort());
        assert.equal(await total(company.id), 4);
        assert.equal(after.filter(row => row.quoteCount !== originals.find(before => before.id === row.id)!.quoteCount).length, 1);
        const attempts = await Promise.allSettled([consume(company.id), consume(company.id)]);
        assert.equal(attempts.filter(result => result.status === "fulfilled").length, 1);
        assert.equal(await total(company.id), 5);
      } finally {
        await db.delete(usageRecords).where(eq(usageRecords.companyId, company.id));
      }
    });
  });

  await t.test("quote failure rolls back a new counter and later failures undo increments", async () => {
    const { company } = await fixture(2);
    const [client] = await db.insert(clients).values({ companyId: company.id, name: "Client", type: "company" }).returning();
    const attempt = () => db.transaction(async tx => {
      await quota.consumeQuotationQuota(tx, company.id, now);
      await tx.insert(quotations).values({ companyId: company.id, clientId: client.id, quoteNumber: "rollback", projectName: "rollback",
        expiryDate: now, subtotal: "0", discountTotal: "0", vatTotal: "0", grandTotal: "0" });
      throw new Error("simulated item failure");
    });
    await assert.rejects(attempt(), /simulated item failure/);
    assert.equal((await rows(company.id)).length, 0);
    await consume(company.id);
    await assert.rejects(attempt(), /simulated item failure/);
    assert.equal(await total(company.id), 1);
    assert.equal((await db.select().from(quotations).where(eq(quotations.companyId, company.id))).length, 0);
  });

  await t.test("counter database failure returns 503 and never consumes capacity", async () => {
    const { company } = await fixture();
    await db.execute(sql`ALTER TABLE usage_records ADD CONSTRAINT quota_test_failure CHECK (false) NOT VALID`);
    try {
      await assert.rejects(consume(company.id), rejected(503, "QUOTA_UNAVAILABLE"));
      assert.equal((await rows(company.id)).length, 0);
    } finally {
      await db.execute(sql`ALTER TABLE usage_records DROP CONSTRAINT quota_test_failure`);
    }
    await consume(company.id);
  });

  await t.test("tenant quota counters do not affect another company", async () => {
    const a = await fixture(1);
    const b = await fixture(1);
    await consume(a.company.id);
    await assert.rejects(consume(a.company.id), rejected(403));
    await consume(b.company.id);
    assert.equal(await total(a.company.id), 1);
    assert.equal(await total(b.company.id), 1);
  });

  await t.test("production clock path parses the database timestamp without a test clock", async () => {
    const { company } = await fixture();
    const result = await db.transaction(tx => quota.consumeQuotationQuota(tx, company.id));
    assert.match(result.period, /^\d{4}-\d{2}$/);
    assert.equal(await total(company.id, result.period), 1);
  });

  await t.test("preflight never consumes and a committed admin suspension wins the shared company lock", async () => {
    const { company, plan } = await fixture(2);
    await db.transaction(tx => quota.checkQuotationQuota(tx, company.id, now));
    assert.equal((await rows(company.id)).length, 0);
    let release!: () => void;
    let acquired!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    const locked = new Promise<void>(resolve => { acquired = resolve; });
    const adminChange = db.transaction(async tx => {
      await tx.select().from(companies).where(eq(companies.id, company.id)).for("update");
      await tx.select().from(plans).where(eq(plans.id, plan.id)).for("share");
      await tx.select().from(subscriptions).where(eq(subscriptions.companyId, company.id)).for("update");
      acquired();
      await hold;
      await tx.update(subscriptions).set({ status: "canceled" }).where(eq(subscriptions.companyId, company.id));
    });
    await locked;
    const attempt = assert.rejects(consume(company.id), rejected(403, "SUBSCRIPTION_INACTIVE"));
    release();
    await adminChange;
    await attempt;
    assert.equal((await rows(company.id)).length, 0);
  });

  await t.test("negative historic counters and malformed bonuses fail closed", async () => {
    const negative = await fixture();
    await withLegacyQuotaConstraint(db, "usage_records_quote_count_nonnegative", async () => {
      try {
        await db.insert(usageRecords).values({ companyId: negative.company.id, period: "2026-10", quoteCount: -1 });
        await assert.rejects(consume(negative.company.id), rejected(503));
      } finally {
        await db.update(usageRecords).set({ quoteCount: 0 }).where(eq(usageRecords.companyId, negative.company.id));
      }
    });
    const bonus = await fixture(2);
    await withLegacyQuotaConstraint(db, "subscriptions_bonus_quote_limit_nonnegative", async () => {
      try {
        await db.update(subscriptions).set({ bonusQuoteLimit: -1 }).where(eq(subscriptions.companyId, bonus.company.id));
        await assert.rejects(consume(bonus.company.id), rejected(503));
        assert.equal((await rows(bonus.company.id)).length, 0);
      } finally {
        await db.update(subscriptions).set({ bonusQuoteLimit: 0 }).where(eq(subscriptions.companyId, bonus.company.id));
      }
    });
  });
});
