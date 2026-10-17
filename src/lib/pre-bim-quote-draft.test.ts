import assert from "node:assert/strict";
import test from "node:test";
import { computeFeasibility, type FeasibilityInput } from "./pre-bim-feasibility";
import { buildPreBimQuoteDraft, parsePreBimQuoteDraft } from "./pre-bim-quote-draft";

const input = (over: Partial<FeasibilityInput> = {}): FeasibilityInput => ({
  parcels: [{ name: "A", areaM2: 1000, taks: 0.4, kaks: 0.8, emsalHariciAreaM2: 0 }],
  landownerSharePercent: null,
  shareBase: null,
  netToGrossRatio: null,
  landownerUnitCount: null,
  promisedGrossPerUnitM2: null,
  unitCostTryPerM2: null,
  costSplit: null,
  ...over,
});
let n = 0;
const ids = () => `id-${++n}`;

test("birim maliyet yoksa tek kalem 0 ₺ fiyatla ve uyarıyla aktarılır (fiyat uydurulmaz)", () => {
  const i = input();
  const d = buildPreBimQuoteDraft(i, computeFeasibility(i), ids)!;
  assert.equal(d.items.length, 1);
  assert.equal(d.items[0].quantity, 800);
  assert.equal(d.items[0].unitPrice, 0);
  assert.ok(d.notes.includes("0 ₺"));
});

test("birim maliyet ve %100 dağılım girildiyse toplam tutar korunur (beş kalem)", () => {
  const i = input({
    unitCostTryPerM2: 50000,
    costSplit: { kabaYapi: 30, inceYapi: 40, mekanik: 10, elektrik: 10, peyzajAltyapi: 10 },
  });
  const d = buildPreBimQuoteDraft(i, computeFeasibility(i), ids)!;
  assert.equal(d.items.length, 5);
  const total = d.items.reduce((s, it) => s + (it.quantity as number) * (it.unitPrice as number), 0);
  assert.equal(Math.round(total), 800 * 50000);
});

test("dağılım toplamı %100 değilse tek kalem; paylaşım ve vaat aşımı notlara yazılır", () => {
  const i = input({
    unitCostTryPerM2: 40000,
    costSplit: { kabaYapi: 30, inceYapi: 40, mekanik: 10, elektrik: 10, peyzajAltyapi: 5 },
    shareBase: "EMSAL",
    landownerSharePercent: 50,
    netToGrossRatio: 0.85,
    landownerUnitCount: 2,
    promisedGrossPerUnitM2: 210,
  });
  const d = buildPreBimQuoteDraft(i, computeFeasibility(i), ids)!;
  assert.equal(d.items.length, 1);
  assert.equal(d.items[0].unitPrice, 40000);
  assert.ok(d.notes.includes("Arsa sahibi payı: 400,00 m² brüt / 340,00 m² net"));
  assert.ok(d.notes.includes("aşıyor"));
});

test("geçerli alan yoksa taslak üretilmez; bozuk sessionStorage verisi reddedilir", () => {
  const i = input({ parcels: [{ name: "X", areaM2: null, taks: null, kaks: null }] });
  assert.equal(buildPreBimQuoteDraft(i, computeFeasibility(i), ids), null);
  assert.equal(parsePreBimQuoteDraft(null), null);
  assert.equal(parsePreBimQuoteDraft("{bozuk"), null);
  assert.equal(parsePreBimQuoteDraft(JSON.stringify({ items: [{ description: "x", quantity: -1, unitPrice: 5 }] })), null);
  const ok = parsePreBimQuoteDraft(JSON.stringify({ items: [{ description: "x", quantity: 2, unitPrice: 5 }], notes: "n" }));
  assert.equal(ok?.items.length, 1);
  assert.equal(ok?.notes, "n");
});
