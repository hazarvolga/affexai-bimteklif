import assert from "node:assert/strict";
import test from "node:test";
import { SAMPLE_PRICE_CATALOG_SEED, SMARTCHECK_SAMPLE_PROJECTS } from "./sample-projects";

test("MM sample project provides Tablo 9.1 (21 rows) and 3 QTO rows including IfcCovering", () => {
  const mm = SMARTCHECK_SAMPLE_PROJECTS["mm-mimari-tablo-9-1"];
  assert.equal(mm.artifactType, "epys_preflight");
  assert.equal(mm.rows.length, 3);
  const coveringRow = mm.rows.find((row) => row.normalizedDescription.includes("IfcCovering"));
  assert.ok(coveringRow, "IfcCovering row should exist in MM sample project");
  assert.equal(coveringRow.normalizedUnit, "m2");
  assert.equal(coveringRow.normalizedPositionCode, "15.390.1002");

  const payload = mm.artifactPayload as {
    model: { discipline: string };
    ek9Table: { tablo: string; satirSayisi: number };
    ek9: unknown[];
    summary: { hata: number; uyari: number };
  };
  assert.equal(payload.model.discipline, "MM");
  assert.equal(payload.ek9Table.tablo, "9.1");
  assert.equal(payload.ek9Table.satirSayisi, 21);
  assert.equal(payload.ek9.length, 21);
  assert.equal(payload.summary.hata, 0);
  assert.equal(payload.summary.uyari, 0);
});

test("ST sample project provides Tablo 9.2 (16 rows) and a 3x3 cover finding", () => {
  const st = SMARTCHECK_SAMPLE_PROJECTS["st-statik-tablo-9-2"];
  assert.equal(st.artifactType, "epys_preflight");
  assert.equal(st.rows.length, 3);
  const findingRow = st.rows.find((row) => row.findingsJson.length > 0);
  assert.ok(findingRow, "A row with a 3x3 cover finding should exist in ST sample project");
  assert.equal(findingRow.findingsJson[0]?.code, "COVER_BELOW_STANDARD_MIN");

  const payload = st.artifactPayload as {
    model: { discipline: string };
    ek9Table: { tablo: string; satirSayisi: number };
    ek9: unknown[];
    summary: { hata: number; uyari: number };
  };
  assert.equal(payload.model.discipline, "ST");
  assert.equal(payload.ek9Table.tablo, "9.2");
  assert.equal(payload.ek9Table.satirSayisi, 16);
  assert.equal(payload.ek9.length, 16);
  assert.equal(payload.summary.hata, 0);
});

test("PDF/A sample project provides PDF/A-2B, single sheet compliance, and embedded digital signature", () => {
  const pdf = SMARTCHECK_SAMPLE_PROJECTS["pdfa-pafta-iso216"];
  assert.equal(pdf.artifactType, "pdf_preflight");
  assert.equal(pdf.rows.length, 0);
  const payload = pdf.artifactPayload as {
    file: { pageCount: number };
    pdfa: { claimed: { part: string; conformance: string } };
    eSignature: { present: boolean };
    summary: { hata: number; uyari: number };
  };
  assert.equal(payload.file.pageCount, 1);
  assert.equal(payload.pdfa.claimed.part, "2");
  assert.equal(payload.pdfa.claimed.conformance, "B");
  assert.equal(payload.eSignature.present, true);
  assert.equal(payload.summary.hata, 0);
  assert.equal(payload.summary.uyari, 0);
});

test("Sample price catalog seed covers both concrete (15.150.1005) and flooring (15.390.1002) positions", () => {
  const codes = SAMPLE_PRICE_CATALOG_SEED.map((item) => item.positionCode);
  assert.deepEqual(codes, ["15.150.1005", "15.390.1002"]);
});
