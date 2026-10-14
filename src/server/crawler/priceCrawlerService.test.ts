import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTurkishPrice } from "./priceCrawlerService";
import { inferCrawledItemUnit } from "./price-parser";

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

  describe("inferCrawledItemUnit", () => {
    it("infers standard construction units for concrete, steel, and area items", () => {
      assert.strictEqual(inferCrawledItemUnit("C 30/37 Hazır Beton", "market_concrete_marmara", "Hazır Beton", "kaynak birimi"), "m³");
      assert.strictEqual(inferCrawledItemUnit("Ankara Ø12-32 mm Demir", "market_steel_karabuk", "İnşaat Demiri", "kaynak birimi"), "ton");
      assert.strictEqual(inferCrawledItemUnit("Plywood Kalıp İşçiliği", "custom", "Kalıp", "m2"), "m²");
    });
  });
});

it('rejects oversized price fields instead of returning fabricated precision', () => {
  assert.equal(parseTurkishPrice('1'.repeat(5000) + ' TL'), null);
});

