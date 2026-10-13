import assert from "node:assert/strict";
import test from "node:test";
import { canonicalPlans } from "./plan-catalog";
import { featureMonthlyLimit, isMeteredFeature, METERED_FEATURES, quotaCodes } from "./feature-limits";
import { PLAN_LIMITS } from "./limits";
import type { QuotaError } from "./quota-policy";

const subscription = (planId: string | null) => ({ planId, plan: "starter" as const });
const unset = { monthlyAiLimit: null, monthlyPdfLimit: null, monthlyCrmLimit: null, monthlyRegulationLimit: null, monthlyProfitAnalysisLimit: null };

test("each of the five catalog packages enforces its own limits, not starter's", () => {
  for (const plan of canonicalPlans) {
    assert.equal(featureMonthlyLimit(subscription(plan.id), plan, "AI_QUOTATION_GENERATED"), plan.monthlyAiLimit, plan.name);
    assert.equal(featureMonthlyLimit(subscription(plan.id), plan, "PDF_GENERATED"), plan.monthlyPdfLimit, plan.name);
    assert.equal(featureMonthlyLimit(subscription(plan.id), plan, "CRM_ACTION_EXECUTED"), plan.monthlyCrmLimit, plan.name);
    assert.equal(featureMonthlyLimit(subscription(plan.id), plan, "REGULATION_CHECK_RUN"), plan.monthlyRegulationLimit, plan.name);
    assert.equal(featureMonthlyLimit(subscription(plan.id), plan, "PROFIT_ANALYSIS_RUN"), plan.monthlyProfitAnalysisLimit, plan.name);
  }
  const enterprise = canonicalPlans[4];
  assert.equal(featureMonthlyLimit(subscription(enterprise.id), enterprise, "AI_QUOTATION_GENERATED"), 1000, "8.900 TL package is no longer capped at 20 AI quotes");
});

test("unconfigured plan columns and legacy subscriptions fall back to the legacy enum limits", () => {
  const plan = { ...canonicalPlans[3], ...unset };
  for (const feature of Object.keys(METERED_FEATURES)) {
    if (!isMeteredFeature(feature)) assert.fail(feature);
    assert.equal(featureMonthlyLimit(subscription(plan.id), plan, feature), PLAN_LIMITS.starter[feature]);
    assert.equal(featureMonthlyLimit({ planId: null, plan: "pro" }, undefined, feature), PLAN_LIMITS.pro[feature]);
  }
});

test("a mismatched plan row or malformed limit fails closed as unavailable", () => {
  const plan = canonicalPlans[2];
  assert.throws(() => featureMonthlyLimit(subscription("other"), plan, "PDF_GENERATED"), (error: QuotaError) => error.status === 503);
  for (const value of [-1, 0.5, Number.NaN]) {
    assert.throws(() => featureMonthlyLimit(subscription(plan.id), { ...plan, monthlyPdfLimit: value }, "PDF_GENERATED"), (error: QuotaError) => error.status === 503 && error.code === "PDF_QUOTA_UNAVAILABLE");
  }
});

test("quota codes keep AI's public codes and name each metered feature", () => {
  assert.deepEqual(quotaCodes("AI_QUOTATION_GENERATED"), { exceeded: "AI_QUOTA_EXCEEDED", unavailable: "AI_QUOTA_UNAVAILABLE" });
  assert.deepEqual(quotaCodes("PROFIT_ANALYSIS_RUN"), { exceeded: "PROFIT_ANALYSIS_QUOTA_EXCEEDED", unavailable: "PROFIT_ANALYSIS_QUOTA_UNAVAILABLE" });
  assert.equal(isMeteredFeature("QUOTATION_CREATED"), false);
});
