import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { REGULATORY_RULE_SOURCES, type RegulatoryRuleSourceId } from "./rule-manifest";

describe("phase 3 regulatory rule manifest", () => {
  it("covers every T19-T26 source and stays aligned with the phase 0 register", () => {
    const required: RegulatoryRuleSourceId[] = ["YAMBIS", "KIK4734", "KIK4735", "KDV", "PAIY", "TS500", "TS708", "TBDY2018", "EPYS_RG33331", "ISO19650"];
    assert.deepEqual(Object.keys(REGULATORY_RULE_SOURCES).sort(), [...required].sort());

    const registerPath = path.resolve(import.meta.dirname, "../../../docs/audits/phase-0/source-register.json");
    const register = JSON.parse(fs.readFileSync(registerPath, "utf8")) as { sources: Array<Record<string, unknown>> };
    for (const id of required) {
      const source = register.sources.find((entry) => entry.id === id);
      assert.ok(source, `phase 0 source missing: ${id}`);
      assert.equal(REGULATORY_RULE_SOURCES[id].authority, source.authority);
      assert.equal(REGULATORY_RULE_SOURCES[id].verificationStatus, source.status);
      assert.equal(REGULATORY_RULE_SOURCES[id].url, source.url);
    }
  });

  it("keeps licensed and identity-pending sources from supporting an approved decision", () => {
    assert.equal(REGULATORY_RULE_SOURCES.TS500.verificationStatus, "access_required");
    assert.equal(REGULATORY_RULE_SOURCES.TS708.verificationStatus, "access_required");
    assert.equal(REGULATORY_RULE_SOURCES.ISO19650.verificationStatus, "access_required");
    assert.equal(REGULATORY_RULE_SOURCES.EPYS_RG33331.verificationStatus, "identity_pending");
  });
});
