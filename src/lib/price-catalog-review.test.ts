import assert from "node:assert/strict";
import test from "node:test";
import { detectPriceCatalogColumns, parsePriceCatalogCsv, readPriceCatalogCsvTable } from "./price-catalog-import";
import { reviewPriceCatalog } from "./price-catalog-review";

const NOW = new Date("2026-10-26T12:00:00Z");

test("column detection reports which file header feeds each catalogue field", () => {
  const [header] = readPriceCatalogCsvTable("Poz No;Açıklama;Birim;Birim Fiyat;Not\n15.1;Beton;m³;3450;x");
  const columns = detectPriceCatalogColumns(header);
  const byField = Object.fromEntries(columns.map((column) => [column.field, column]));
  assert.equal(byField.positionCode.header, "Poz No");
  assert.equal(byField.amount.header, "Birim Fiyat");
  assert.equal(byField.amount.required, true);
  assert.equal(byField.currency.index, -1, "missing optional column is reported, not invented");
  assert.equal(byField.validUntil.header, null);
});

test("catalogue review counts what the owner must see before approving, without changing any value", () => {
  const rows = parsePriceCatalogCsv([
    "Poz No;Açıklama;Birim;Birim Fiyat;Para Birimi;Geçerlilik Tarihi",
    "15.150.1006;C30 beton;m³;3.450,00;TRY;2026-12-31",
    "15.150.1006;C30 beton;m3;3.600,00;TRY;2026-12-31",
    ";Kalıp;m²;650;TRY;2026-01-31",
    "04.001;Donatı;ton;42000;USD;",
    "Y.01;Özel iş;götürü;1000;TRY;",
  ].join("\n"));
  const review = reviewPriceCatalog(rows, { now: NOW });
  assert.equal(review.rowCount, 5);
  assert.equal(review.nonTryCount, 1);
  assert.equal(review.expiredCount, 1);
  assert.equal(review.openEndedCount, 2);
  assert.equal(review.missingPozCount, 1);
  assert.deepEqual(review.conflictingPozKeys, ["15.150.1006 · m3"], "m³ and m3 are the same unit, so two prices conflict");
  assert.deepEqual(review.units.find((unit) => unit.unit === "götürü"), { unit: "götürü", count: 1, known: false });
  assert.equal(review.units.find((unit) => unit.unit === "m³")?.known, true);
  assert.equal(rows[0].amount, 3450, "review never rewrites parsed rows");
});

test("a catalogue-wide validity date closes open-ended rows", () => {
  const rows = parsePriceCatalogCsv("Açıklama;Birim;Birim Fiyat\nBeton;m3;3450");
  assert.equal(reviewPriceCatalog(rows, { now: NOW }).openEndedCount, 1);
  assert.equal(reviewPriceCatalog(rows, { now: NOW, catalogValidUntil: "2026-12-31" }).openEndedCount, 0);
  assert.equal(reviewPriceCatalog(rows, { now: NOW, catalogValidUntil: "2026-01-01" }).expiredCount, 1);
});
