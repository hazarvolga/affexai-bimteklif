import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTurkishPrice } from "./priceCrawlerService";

describe("priceCrawlerService", () => {
  describe("parseTurkishPrice", () => {
    it("parses Turkish dot-thousands and comma-decimals", () => {
      assert.strictEqual(parseTurkishPrice("38.200,50 TL"), 38200.5);
      assert.strictEqual(parseTurkishPrice("2.350,00 ₺"), 2350.0);
    });

    it("parses Turkish thousand-separated numbers with commas", () => {
      assert.strictEqual(parseTurkishPrice("38,200 TL"), 38200.0);
      assert.strictEqual(parseTurkishPrice("37,000 TL"), 37000.0);
    });

    it("parses plain integers and decimals", () => {
      assert.strictEqual(parseTurkishPrice("863 TL"), 863.0);
      assert.strictEqual(parseTurkishPrice("715,25 TL"), 715.25);
    });

    it("returns null on invalid non-price strings", () => {
      assert.strictEqual(parseTurkishPrice("Ankara Bölgesi"), null);
      assert.strictEqual(parseTurkishPrice(""), null);
    });
  });
});

it('rejects oversized price fields instead of returning fabricated precision', () => {
  assert.equal(parseTurkishPrice('1'.repeat(5000) + ' TL'), null);
});
