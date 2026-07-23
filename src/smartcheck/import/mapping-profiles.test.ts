import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getMappingProfile, MEP_MAPPING_PROFILES } from "./mapping-profiles";

describe("SmartCheck MEP mapping profiles", () => {
  it("exposes deterministic profiles without creating engineering rules", () => {
    assert.equal(MEP_MAPPING_PROFILES.length, 3);
    assert.equal(getMappingProfile("mep-tr-standard-v1")?.mapping.quantity, "Miktar");
    assert.equal(getMappingProfile("unknown-profile"), undefined);
  });
});
