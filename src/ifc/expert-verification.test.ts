import assert from "node:assert/strict";
import test from "node:test";
import type { CalmIcmalItem } from "./calm-icmal";
import {
  VERIFICATION_TOLERANCE_PCT, deviationPct, parseVerificationRecords, summarizeVerification, verificationReportCsv,
  type LineVerification,
} from "./expert-verification";

const item = (id: string, title: string, netQuantity: number): CalmIcmalItem => ({
  id, groupKey: "structural", title, subtitle: "", pozCode: "15.150.1006", unit: "m³", netQuantity, grossQuantity: netQuantity,
  deductedOpeningQuantity: 0, grossAvailable: false, defaultUnitPriceTry: 0, formulaNote: "", storeyBreakdown: [], sampleRooms: [],
});
const items = [item("a", "Betonarme", 100), item("b", "Kâgir duvar", 50), item("c", "Şap", 80)];
const at = "2026-10-24T20:00:00.000Z";

test("sapma uzman değerine göre hesaplanır ve %3 şirket toleransı ile karşılaştırılır", () => {
  assert.equal(VERIFICATION_TOLERANCE_PCT, 3);
  assert.equal(deviationPct(100, 97), 3.09);
  assert.equal(deviationPct(100, 100), 0);
  assert.equal(deviationPct(100, null), null);
  assert.equal(deviationPct(100, 0), null);
});

test("özet incelenen, doğru, düzeltme ve tolerans dışı satırları sayar", () => {
  const records: Record<string, LineVerification> = {
    a: { itemId: "a", status: "dogru", expertValue: 101, note: "", updatedAt: at },
    b: { itemId: "b", status: "duzeltme", expertValue: 45, note: "Baca dahil edilmiş", updatedAt: at },
  };
  assert.deepEqual(summarizeVerification(items, records), {
    total: 3, reviewed: 2, correct: 1, corrections: 1, unsure: 0, outsideTolerance: 1,
  });
});

test("rapor uzman kimliğini, her satırın sistem ve uzman değerini, sapmasını ve imza alanını içerir", () => {
  const records: Record<string, LineVerification> = {
    b: { itemId: "b", status: "duzeltme", expertValue: 45, note: "Baca dahil; çıkarılmalı", updatedAt: at },
  };
  const csv = verificationReportCsv({
    items, records, fileName: "proje.ifc", generatedAt: "24.10.2026 20:00",
    reviewer: { name: "Ad Soyad", title: "İnşaat Mühendisi", registrationNo: "12345" },
  });
  const lines = csv.slice(1).split("\r\n");
  assert.ok(lines.includes("Uzman;Ad Soyad"));
  assert.ok(lines.includes("Oda sicil no;12345"));
  assert.ok(lines.includes("Poz;Kalem;Birim;Sistem değeri;Uzman değeri;Sapma %;Tolerans;Karar;Not"));
  assert.ok(lines.includes("15.150.1006;Kâgir duvar;m³;50,000;45,000;11,11;Dışında;Düzeltme gerekli;Baca dahil; çıkarılmalı".replace("Baca dahil; çıkarılmalı", '"Baca dahil; çıkarılmalı"')));
  assert.ok(lines.includes("15.150.1006;Şap;m³;80,000;;;;İncelenmedi;"));
  assert.ok(lines.some((line) => line.startsWith("İmza")));
});

test("saklanan kayıtlar doğrulanarak okunur; bozuk veya yabancı veri yok sayılır", () => {
  const stored = JSON.stringify({
    a: { itemId: "a", status: "dogru", expertValue: 100, note: "", updatedAt: at },
    x: { itemId: "x", status: "hack", note: 1 },
  });
  assert.deepEqual(Object.keys(parseVerificationRecords(stored)), ["a"]);
  assert.deepEqual(parseVerificationRecords("{bozuk"), {});
  assert.deepEqual(parseVerificationRecords(null), {});
});
