import assert from "node:assert/strict";
import test from "node:test";
import { evaluateEscalationForm } from "./escalation-form";
import { evaluateKikForm, parseKikLineItems } from "./kik-form";

test("KİK formu: zorunlu girdi eksikse hesap yapılmaz", () => {
  const r = evaluateKikForm({ ym: "", category: "", bids: "", ourBid: "", items: "" });
  assert.equal(r.status, "incomplete");
  assert.equal(r.status === "incomplete" && r.missing.length, 3);
});

test("KİK formu: Türkçe biçimli girdilerle motor sonucu üretilir; kendi teklif boşsa hüküm gösterilmez", () => {
  const r = evaluateKikForm({
    ym: "100.000.000",
    category: "ust_yapi",
    bids: "70.000.000\n80.000.000\n90.000.000\n85.000.000\n75.000.000",
    ourBid: "",
    items: "",
  });
  assert.equal(r.status, "ok");
  if (r.status !== "ok") return;
  assert.equal(r.hasOurBid, false);
  assert.equal(r.result.hasTenderSessionInputs, true);
  assert.equal(r.result.nCoefficient, 1);
  assert.ok(r.result.boundaryValueTry >= 40_000_000);
});

test("KİK formu: aynı veride motor doğrudan çağrısıyla aynı sınır değeri verir (form katmanı sonucu değiştirmez)", async () => {
  const { evaluateKikAbnormallyLowBid } = await import("../kik-adt");
  const bids = [70_000_000, 80_000_000, 90_000_000, 85_000_000, 75_000_000];
  const direct = evaluateKikAbnormallyLowBid({
    estimatedCostTry: 100_000_000,
    validBidsTry: bids,
    ourBidTry: 60_000_000,
    workCategory: "ust_yapi",
  });
  const viaForm = evaluateKikForm({
    ym: "100000000",
    category: "ust_yapi",
    bids: bids.join(";"),
    ourBid: "60000000",
    items: "",
  });
  assert.equal(viaForm.status, "ok");
  if (viaForm.status === "ok") {
    assert.equal(viaForm.result.boundaryValueTry, direct.boundaryValueTry);
    assert.equal(viaForm.result.isAbnormallyLow, direct.isAbnormallyLow);
  }
});

test("KİK formu: okunamayan teklif ve kalem satırı hata olarak bildirilir", () => {
  const r = evaluateKikForm({ ym: "100", category: "alt_yapi", bids: "90;x", ourBid: "-5", items: "kalem;abc" });
  assert.equal(r.status, "error");
  if (r.status === "error") assert.equal(r.errors.length, 3);
  const items = parseKikLineItems("Beton;1.000,50\nHatalı satır");
  assert.equal(items.items.length, 1);
  assert.equal(items.items[0].totalAmount, 1000.5);
  assert.equal(items.invalid.length, 1);
});

test("4735 formu: B zorunludur, varsayılan yoktur", () => {
  const r = evaluateEscalationForm({
    progressPayment: "1.000.000",
    bFactor: "",
    constantWeight: "",
    rows: [{ indexCode: "TUIK-TUFE-GENEL", weight: "1", baseIndex: "100", currentIndex: "120" }],
  });
  assert.equal(r.status, "incomplete");
});

test("4735 formu: sabit katsayı ve Türkçe girdilerle F = A × B × (Pn − 1)", () => {
  const r = evaluateEscalationForm({
    progressPayment: "1.000.000",
    bFactor: "0,90",
    constantWeight: "0,10",
    rows: [{ indexCode: "TUIK-TUFE-GENEL", weight: "0,90", baseIndex: "100", currentIndex: "120" }],
  });
  assert.equal(r.status, "ok");
  if (r.status === "ok") {
    assert.equal(r.result.pnFactor, 1.18);
    assert.equal(r.result.priceDifferenceTl, 162000);
  }
});

test("4735 formu: ağırlık toplamı 1 değilse motor hatası kullanıcıya iletilir", () => {
  const r = evaluateEscalationForm({
    progressPayment: "1000",
    bFactor: "0,9",
    constantWeight: "",
    rows: [{ indexCode: "TUIK-TUFE-GENEL", weight: "0,5", baseIndex: "100", currentIndex: "110" }],
  });
  assert.equal(r.status, "error");
  if (r.status === "error") assert.ok(r.errors[0].includes("1,00"));
});
