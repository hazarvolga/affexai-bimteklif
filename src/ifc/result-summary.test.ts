import assert from "node:assert/strict";
import test from "node:test";
import { buildResultSummary } from "./result-summary";

const base = {
  totalElementCount: 3,
  measuredElementCount: 3,
  pozMatchedElementCount: 3,
  icmalItemCount: 2,
  pricedItemCount: 0,
  openings: "unknown" as const,
  hasQuotation: false,
};

test("a fully matched model with no prices does not read as finished", () => {
  const summary = buildResultSummary(base);
  assert.deepEqual(summary.lines.map(line => [line.key, line.tone]), [
    ["source", "ok"],
    ["quantity", "ok"],
    ["poz", "ok"],
    ["price", "attention"],
    ["openings", "attention"],
    ["review", "pending"],
  ]);
  assert.equal(summary.lines.find(line => line.key === "price")?.text, "2 kalem fiyat bekliyor (0/2 fiyatlandı).");
  assert.match(summary.lines.find(line => line.key === "openings")!.text, /değerlendirilemedi/);
  assert.equal(summary.nextStep.action, "add_prices");
  assert.equal(summary.readyForOffer, false);
});

test("unmeasured and unmatched elements are reported, not hidden behind a percentage", () => {
  const summary = buildResultSummary({ ...base, measuredElementCount: 2, pozMatchedElementCount: 1 });
  assert.equal(summary.lines.find(line => line.key === "quantity")?.tone, "attention");
  assert.equal(summary.lines.find(line => line.key === "quantity")?.text, "Miktarı okunan eleman: 2/3; ölçülemeyen: 1.");
  assert.equal(summary.lines.find(line => line.key === "poz")?.text, "Poza eşleşen eleman: 1/3; eşleşmeyen: 2.");
});

test("once every line is priced the next step is the offer, and review stays pending", () => {
  const priced = { ...base, pricedItemCount: 2, openings: "present" as const };
  assert.equal(buildResultSummary(priced).nextStep.action, "create_offer");
  const withQuote = buildResultSummary({ ...priced, hasQuotation: true });
  assert.equal(withQuote.nextStep.action, "transfer_to_offer");
  assert.equal(withQuote.readyForOffer, true);
  assert.equal(withQuote.lines.find(line => line.key === "review")?.text, "Uzman incelemesi bekliyor; bu sonuç bağımsız mühendis onayı değildir.");
  assert.equal(withQuote.lines.find(line => line.key === "openings")?.tone, "ok");
});

test("a model without doors and windows is a known state, not a failure", () => {
  const summary = buildResultSummary({ ...base, openings: "none_in_model" });
  assert.equal(summary.lines.find(line => line.key === "openings")?.tone, "ok");
  assert.match(summary.lines.find(line => line.key === "openings")!.text, /kapı\/pencere yok/);
});

test("without a consistency report element counts are said to be unknown", () => {
  const summary = buildResultSummary({ ...base, totalElementCount: null, measuredElementCount: null, pozMatchedElementCount: null });
  assert.equal(summary.lines.find(line => line.key === "quantity")?.tone, "unknown");
  assert.match(summary.lines.find(line => line.key === "quantity")!.text, /belirlenemedi/);
});

test("elements without quantity evidence are not reported as read", () => {
  const summary = buildResultSummary({ ...base, totalElementCount: 1731, measuredElementCount: 1731, pozMatchedElementCount: 160, evidenceElementCount: 160 });
  const quantity = summary.lines.find(line => line.key === "quantity")!;
  assert.equal(quantity.tone, "attention");
  assert.match(quantity.text, /160\/1731/);
  assert.match(quantity.text, /1571/);
  assert.match(quantity.text, /geometri/);
});

test("when every element has quantity evidence the quantity line stays confirmed", () => {
  const summary = buildResultSummary({ ...base, evidenceElementCount: 3 });
  assert.equal(summary.lines.find(line => line.key === "quantity")?.tone, "ok");
});

test("elements that were read but matched no line say so, instead of blaming the file", () => {
  const summary = buildResultSummary({ ...base, icmalItemCount: 0, totalElementCount: 1655, measuredElementCount: 1655, pozMatchedElementCount: 0 });
  assert.equal(summary.nextStep.action, "check_file");
  assert.match(summary.nextStep.text, /1655 eleman okundu/);
  assert.match(summary.nextStep.text, /malzeme/);
});

test("openings read from the model are not described as applied to the lines", () => {
  const summary = buildResultSummary({ ...base, openings: "present" });
  const text = summary.lines.find(line => line.key === "openings")!.text;
  assert.match(text, /okundu/);
  assert.doesNotMatch(text, /kalem bazında gösteriliyor/);
});

test("an empty icmal asks the user to check the file instead of pricing", () => {
  const summary = buildResultSummary({ ...base, icmalItemCount: 0 });
  assert.equal(summary.nextStep.action, "check_file");
  assert.equal(summary.lines.find(line => line.key === "source")?.tone, "attention");
});
