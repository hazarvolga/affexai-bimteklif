import assert from "node:assert/strict";
import test from "node:test";
import { appliesOpeningDeduction, parseThresholdInput, summarizeOpeningsMinha } from "./openings-minha";
import type { ParsedOpening } from "./types";

const openings: ParsedOpening[] = [
  { id: "1", kind: "window", widthM: 0.6, heightM: 0.8 }, // 0,48 m²
  { id: "2", kind: "window", widthM: 1.0, heightM: 1.2 }, // 1,20 m²
  { id: "3", kind: "door", widthM: 0.9, heightM: 2.1 }, // 1,89 m²
  { id: "4", kind: "door", widthM: 2.0, heightM: 2.2 }, // 4,40 m²
  { id: "5", kind: "window", widthM: null, heightM: null }, // ölçüsüz
];

test("ÇŞB sıva/boya: ölçülen dört boşluğun hepsi düşülür; ölçüsüz sayılır", () => {
  const r = summarizeOpeningsMinha(openings, "CSB_2026", null);
  assert.equal(r.status, "ok");
  assert.equal(r.thresholdM2, 0);
  assert.equal(r.totalCount, 5);
  assert.equal(r.measuredCount, 4);
  assert.equal(r.unmeasuredCount, 1);
  assert.equal(r.notDeductedCount, 0);
  assert.equal(r.notDeductedAreaM2, 0);
  assert.equal(r.deductedCount, 4);
  assert.equal(r.deductedAreaM2, 7.97);
  assert.equal(r.applicationStatus, "summary_only");
  assert.match(r.applicationNote, /kalem/i);
  assert.equal(r.profile.version, "minha-2026.4");
  assert.ok(r.profile.sourceReference.length > 0);
});

test("DIN 18350 2,50 m²: 0,48, 1,20 ve 1,89 düşülmez; yalnız 4,40 düşülür", () => {
  const r = summarizeOpeningsMinha(openings, "DIN_18350", null);
  assert.equal(r.thresholdM2, 2.5);
  assert.equal(r.notDeductedCount, 3);
  assert.equal(r.deductedCount, 1);
  assert.equal(r.deductedAreaM2, 4.4);
});

test("özel şartname: eşik girilmeden hesap yapılmaz; girilince eşik tekil alana uygulanır", () => {
  assert.equal(summarizeOpeningsMinha(openings, "CUSTOM_CONTRACT", null).status, "threshold_required");
  const r = summarizeOpeningsMinha(openings, "CUSTOM_CONTRACT", 1.5);
  assert.equal(r.status, "ok");
  assert.equal(r.thresholdM2, 1.5);
  assert.equal(r.deductedCount, 2); // 1,89 ve 4,40
  assert.equal(r.notDeductedCount, 2); // 0,48 ve 1,20
});

test("boşluk listesi yoksa no_openings döner; eşik girdisi ayrıştırılır", () => {
  assert.equal(summarizeOpeningsMinha(undefined, "CSB_2026", null).status, "no_openings");
  assert.equal(parseThresholdInput("1,5"), 1.5);
  assert.equal(parseThresholdInput(""), null);
  assert.equal(parseThresholdInput("-2"), null);
  assert.equal(parseThresholdInput("x"), null);
});

test("an opening deduction is only meaningful on a line measured in square metres", () => {
  assert.equal(appliesOpeningDeduction("m²"), true);
  assert.equal(appliesOpeningDeduction("m2"), true);
  for (const unit of ["m³", "adet", "mtül", "kg", ""]) assert.equal(appliesOpeningDeduction(unit), false, unit);
});
