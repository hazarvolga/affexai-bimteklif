import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultGovernanceStatus, validateRuleGovernance } from "./governance";

describe("Turkey rule governance", () => {
  it("keeps regulated subjects advisory by default", () => assert.equal(defaultGovernanceStatus("KDV tevkifat kontrolü"), "advisory"));
  it("blocks DOCX/Google Doc references from becoming canonical approved rules", () => {
    const errors = validateRuleGovernance({ governanceStatus: "approved", sourceType: "google_doc_reference" });
    assert.ok(errors.includes("Only an official source can support an approved canonical rule"));
    assert.ok(errors.length > 10);
  });
});
