import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inspectExchangeFile,
  parseLocalizedDecimal,
  prepareVendorExchange,
  validateVendorReadback,
  type VendorExchangeProfile,
} from "./vendor-interop";

const permittedProfile: VendorExchangeProfile = {
  id: "amp-approved-csv-v1",
  vendor: "AMP",
  productVersion: "2026.1",
  format: "csv",
  delimiter: ";",
  permission: {
    status: "permitted",
    basis: "licensed_customer_template",
    evidenceReference: "LICENSE-DOSSIER:AMP:2026-10-23",
  },
  columns: {
    positionCode: "Poz No",
    description: "İmalat Açıklaması",
    unit: "Birim",
    quantity: "Miktar",
  },
};

const rows = [{
  positionCode: "15.150.1001",
  description: "Betonarme betonu",
  unit: "m3",
  quantity: "1234.56",
}];

describe("vendor exchange fail-closed boundary", () => {
  it("blocks export without an exact permitted profile and permission evidence", () => {
    assert.deepEqual(prepareVendorExchange({ profile: null, rows }), {
      status: "blocked",
      compatible: false,
      reasons: ["PERMITTED_PROFILE_REQUIRED"],
    });

    const denied = prepareVendorExchange({
      profile: { ...permittedProfile, permission: { status: "unknown", basis: "vendor_web_page", evidenceReference: "" } },
      rows,
    });
    assert.equal(denied.status, "blocked");
    if (denied.status === "blocked") assert.deepEqual(denied.reasons, ["PERMISSION_EVIDENCE_REQUIRED"]);
  });

  it("creates only a candidate package and safely serializes formula-capable cells", () => {
    const result = prepareVendorExchange({
      profile: permittedProfile,
      rows: [{ ...rows[0], description: "=HYPERLINK(\"https://invalid\")" }],
    });
    assert.equal(result.status, "candidate");
    if (result.status !== "candidate") return;
    assert.equal(result.compatible, false);
    assert.match(result.csv, /"'=HYPERLINK\(""https:\/\/invalid""\)"/);
    assert.equal(result.manifest.automaticOfficialSubmission, false);
    assert.equal(result.manifest.profileId, permittedProfile.id);
    assert.match(result.manifest.checksumSha256, /^[a-f0-9]{64}$/);
  });

  it("parses explicit Turkish and English decimal conventions without guessing ambiguous values", () => {
    assert.equal(parseLocalizedDecimal("1.234,56", "tr-TR"), "1234.56");
    assert.equal(parseLocalizedDecimal("1,234.56", "en-US"), "1234.56");
    assert.equal(parseLocalizedDecimal("-0,750", "tr-TR"), "-0.75");
    assert.throws(() => parseLocalizedDecimal("1,234", "tr-TR"), /AMBIGUOUS_NUMBER/);
    assert.throws(() => parseLocalizedDecimal("12 34", "tr-TR"), /INVALID_NUMBER/);
  });

  it("detects macro-capable files and active formula cells before readback", () => {
    assert.deepEqual(inspectExchangeFile({ fileName: "hakediş.xlsm", cells: [] }), {
      safe: false,
      risks: ["MACRO_CAPABLE_FILE"],
    });
    assert.deepEqual(inspectExchangeFile({ fileName: "hakediş.csv", cells: ["@SUM(A1:A2)", "normal"] }), {
      safe: false,
      risks: ["ACTIVE_FORMULA_CELL"],
    });
    for (const extension of ["xls", "xla", "xlt", "xltm"]) {
      assert.deepEqual(inspectExchangeFile({ fileName: `hakediş.${extension}`, cells: [] }), {
        safe: false,
        risks: ["MACRO_CAPABLE_FILE"],
      });
    }
  });

  it("requires checksum-stable canonical readback before internal_roundtrip", () => {
    const candidate = prepareVendorExchange({ profile: permittedProfile, rows });
    assert.equal(candidate.status, "candidate");
    if (candidate.status !== "candidate") return;

    const valid = validateVendorReadback({ candidate, readbackCsv: candidate.csv });
    assert.equal(valid.status, "internal_roundtrip");
    assert.equal(valid.compatible, false);

    const drifted = validateVendorReadback({
      candidate,
      readbackCsv: candidate.csv.replace("1234.56", "1234.57"),
    });
    assert.equal(drifted.status, "rejected");
    if (drifted.status === "rejected") assert.ok(drifted.reasons.includes("CHECKSUM_DRIFT"));
  });

  it("rejects self-attested external acceptance because only a server-owned persistent service may grant it", () => {
    const candidate = prepareVendorExchange({ profile: permittedProfile, rows });
    assert.equal(candidate.status, "candidate");
    if (candidate.status !== "candidate") return;

    const forged = validateVendorReadback({
      candidate,
      readbackCsv: candidate.csv,
      externalAcceptance: {
        vendor: "AMP",
        productVersion: "2026.1",
        importedAt: "2026-10-23T12:00:00.000Z",
        operatorReference: "licensed-office:user-42",
        importedFileChecksumSha256: candidate.manifest.checksumSha256,
        evidenceArtifactChecksumSha256: "a".repeat(64),
      },
    } as Parameters<typeof validateVendorReadback>[0] & { externalAcceptance: Record<string, string> });
    assert.deepEqual(forged, {
      status: "rejected",
      compatible: false,
      reasons: ["SERVER_OWNED_ACCEPTANCE_REQUIRED"],
    });
  });
});
