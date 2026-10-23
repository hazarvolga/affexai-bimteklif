import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEvaluation, isRuleEffective, type RuleContext } from "./evaluation";

const context = (overrides: Partial<RuleContext> = {}): RuleContext => ({
  ruleId: "TEST-RULE",
  ruleVersion: "2026-1",
  jurisdiction: "Türkiye",
  evaluationDate: "2026-10-23",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  sourceIds: ["TEST"],
  governanceStatus: "approved",
  unitPolicy: "SI",
  roundingPolicy: "half-up-2",
  ...overrides,
});

describe("regulatory evaluation envelope", () => {
  it("allows passed only with a value, effective rule and no missing input", () => {
    const result = buildEvaluation({ requestedStatus: "passed", value: { total: 10 }, context: context() });
    assert.equal(result.status, "passed");
    assert.deepEqual(result.missingInputs, []);
  });

  it("fails closed when inputs are missing or the rule is outside its effective window", () => {
    const missing = buildEvaluation({ requestedStatus: "passed", value: { total: 10 }, context: context(), missingInputs: ["bankReference"] });
    assert.equal(missing.status, "not_evaluated");
    assert.equal(missing.value, null);

    const expired = buildEvaluation({ requestedStatus: "passed", value: { total: 10 }, context: context({ effectiveTo: "2026-09-30" }) });
    assert.equal(expired.status, "unsupported");
    assert.equal(expired.value, null);
  });

  it("uses inclusive effective dates and rejects invalid ISO dates", () => {
    assert.equal(isRuleEffective(context({ evaluationDate: "2026-01-01" })), true);
    assert.equal(isRuleEffective(context({ evaluationDate: "2026-12-31", effectiveTo: "2026-12-31" })), true);
    assert.throws(() => isRuleEffective(context({ evaluationDate: "23.10.2026" })), /ISO/);
    assert.throws(() => isRuleEffective(context({ effectiveFrom: "2027-01-01", effectiveTo: "2026-01-01" })), /effectiveFrom/);
    assert.throws(() => isRuleEffective(context({ ruleId: " " })), /ruleId/);
    assert.throws(() => isRuleEffective(context({ sourceIds: [] })), /sourceIds/);
  });

  it("does not emit a normative pass while governance is advisory or source access is pending", () => {
    for (const governanceStatus of ["advisory", "access_required", "identity_pending"] as const) {
      const result = buildEvaluation({
        requestedStatus: "passed",
        value: { checked: true },
        context: context({ governanceStatus }),
      });
      assert.equal(result.status, "manual_review_required");
    }
  });
});
