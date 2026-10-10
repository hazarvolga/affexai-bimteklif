import assert from "node:assert/strict";
import test from "node:test";
import { quotationAllowance, QuotaError } from "./quota-policy";
import { PLAN_LIMITS } from "./limits";

const now = new Date("2026-10-08T12:00:00Z");
const subscription = () => ({ planId: null, plan: "starter" as const, status: "active" as const,
  bonusQuoteLimit: 0, currentPeriodStart: new Date("2026-01-01T00:00:00Z"), currentPeriodEnd: null });

test("legacy fallback is shared for all known legacy plans, including starter", () => {
  for (const plan of ["starter", "pro", "elite", "enterprise"] as const) {
    assert.equal(quotationAllowance({ ...subscription(), plan }, undefined, now).limit, PLAN_LIMITS[plan].QUOTATION_CREATED);
  }
});

test("linked plans cannot fall back when missing, mismatched, or inactive", () => {
  for (const plan of [undefined, { id: "wrong", monthlyQuoteLimit: 20, isActive: true }, { id: "plan", monthlyQuoteLimit: 20, isActive: false }]) {
    assert.throws(() => quotationAllowance({ ...subscription(), planId: "plan" }, plan, now), (error: QuotaError) => error.status === 403 && error.code === "PLAN_UNAVAILABLE");
  }
});

test("zero base is retained, bonus is additive, malformed quota data fails closed", () => {
  const plan = { id: "plan", monthlyQuoteLimit: 0, isActive: true };
  assert.equal(quotationAllowance({ ...subscription(), planId: plan.id }, plan, now).limit, 0);
  assert.equal(quotationAllowance({ ...subscription(), planId: plan.id, bonusQuoteLimit: 2 }, plan, now).limit, 2);
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => quotationAllowance({ ...subscription(), bonusQuoteLimit: value }, undefined, now), (error: QuotaError) => error.status === 503);
    assert.throws(() => quotationAllowance({ ...subscription(), planId: plan.id }, { ...plan, monthlyQuoteLimit: value }, now), (error: QuotaError) => error.status === 503);
  }
});

test("subscription start is inclusive and finite end exclusive; malformed dates fail closed", () => {
  assert.equal(quotationAllowance({ ...subscription(), currentPeriodStart: now }, undefined, now).period, "2026-10");
  assert.throws(() => quotationAllowance({ ...subscription(), currentPeriodStart: new Date(now.getTime() + 1) }, undefined, now), (error: QuotaError) => error.code === "SUBSCRIPTION_INACTIVE");
  assert.throws(() => quotationAllowance({ ...subscription(), currentPeriodEnd: now }, undefined, now), (error: QuotaError) => error.code === "SUBSCRIPTION_INACTIVE");
  assert.throws(() => quotationAllowance(subscription(), undefined, new Date("bad")), (error: QuotaError) => error.status === 503);
  assert.throws(() => quotationAllowance({ ...subscription(), currentPeriodEnd: new Date("bad") }, undefined, now), (error: QuotaError) => error.status === 503);
  assert.throws(() => quotationAllowance(undefined, undefined, now), (error: QuotaError) => error.code === "SUBSCRIPTION_REQUIRED");
});
