import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CSB_2026_TUIK_SUB_INDICES,
  computeContractPriceEscalation4735,
  indexOutOfPeriodUnitPrice,
  resolveTuikSubIndexForPoz,
} from './price-escalation';

test('Faz 2.5 Golden 1: CSB_2026_TUIK_SUB_INDICES contains all 21 official ÇŞB 2026 – TÜİK sub-indices', () => {
  assert.equal(CSB_2026_TUIK_SUB_INDICES.length, 21);
  const codes = new Set(CSB_2026_TUIK_SUB_INDICES.map((x) => x.code));
  assert.equal(codes.size, 21);
  assert.equal(codes.has('TUIK-TUFE-GENEL'), true);
  assert.equal(codes.has('TUIK-23.6-HAZIR-BETON'), true);
  assert.equal(codes.has('TUIK-24.1-DEMIR-CELIK'), true);
  assert.equal(codes.has('TUIK-27.3-KABLO'), true);
  assert.equal(codes.has('TUIK-28.2-KLIMA-HAVALANDIRMA'), true);
});

test('Faz 2.5 Golden 2: computeContractPriceEscalation4735 calculates F = A_n * B * (P_n - 1) with exact kuruş precision', () => {
  // 10.000.000 TL hakediş, B = 0,90
  // İşçilik (0,35): 100 -> 125 (1,25 -> 0,4375)
  // Hazır Beton (0,25): 100 -> 120 (1,20 -> 0,3000)
  // Demir-Çelik (0,25): 100 -> 116 (1,16 -> 0,2900)
  // Kereste/Kalıp (0,15): 100 -> 115 (1,15 -> 0,1725)
  // P_n = 0,4375 + 0,3000 + 0,2900 + 0,1725 = 1,200000
  // F = 10.000.000 * 0,90 * (1,20 - 1) = 1.800.000,00 TL
  const res = computeContractPriceEscalation4735({
    progressPaymentAmountTl: 10_000_000,
    bFactor: 0.9,
    components: [
      { indexCode: 'TUIK-TUFE-GENEL', weight: 0.35, baseIndex: 100, currentIndex: 125 },
      { indexCode: 'TUIK-23.6-HAZIR-BETON', weight: 0.25, baseIndex: 100, currentIndex: 120 },
      { indexCode: 'TUIK-24.1-DEMIR-CELIK', weight: 0.25, baseIndex: 100, currentIndex: 116 },
      { indexCode: 'TUIK-16.1-KERESTE', weight: 0.15, baseIndex: 100, currentIndex: 115 },
    ],
  });

  assert.equal(res.totalWeight, 1.0);
  assert.equal(res.pnFactor, 1.2);
  assert.equal(res.pnMinusOne, 0.2);
  assert.equal(res.priceDifferenceTl, 1_800_000);
  assert.equal(res.adjustedTotalTl, 11_800_000);
  assert.equal(res.effectiveEscalationPct, 18);
});

test('Faz 2.5 Golden 3: computeContractPriceEscalation4735 rejects weights that do not sum to 1.00', () => {
  assert.throws(
    () =>
      computeContractPriceEscalation4735({
        progressPaymentAmountTl: 1_000_000,
        bFactor: 0.9,
        components: [
          { indexCode: 'TUIK-TUFE-GENEL', weight: 0.5, baseIndex: 100, currentIndex: 120 },
          { indexCode: 'TUIK-23.6-HAZIR-BETON', weight: 0.3, baseIndex: 100, currentIndex: 120 },
        ],
      }),
    /ağırlık katsayıları toplamı 1,00 olmalıdır/,
  );
});

test('Faz 2.5 Golden 4: indexOutOfPeriodUnitPrice updates expired March 2026 unit price and tags as TUIK_INDEXED_ESTIMATE', () => {
  // C30/37 Hazır Beton pozu (15.150.1006): Mart 2026 baz fiyatı 2.650,00 TL/m³
  // Katalog bitişi: 2026-03-31, Değerlendirme tarihi: 2026-10-17
  // Yİ-ÜFE 23.6 Hazır Beton Endeksi: Mart 2026 E_0 = 240,00 -> Ekim 2026 E_n = 276,00 (oran = 1,15)
  const outOfPeriod = indexOutOfPeriodUnitPrice({
    itemCode: '15.150.1006',
    itemName: 'C30/37 Hazır Beton Dökülmesi',
    baseUnitPriceTl: 2650,
    catalogValidityEnd: '2026-03-31',
    evaluationDate: '2026-10-17',
    baseIndex: 240,
    currentIndex: 276,
  });

  assert.equal(outOfPeriod.isCatalogExpired, true);
  assert.equal(outOfPeriod.indexCode, 'TUIK-23.6-HAZIR-BETON');
  assert.equal(outOfPeriod.escalationRatio, 1.15);
  assert.equal(outOfPeriod.indexedUnitPriceTl, 3047.5);
  assert.equal(outOfPeriod.priceOrigin, 'TUIK_INDEXED_ESTIMATE');
  assert.ok(outOfPeriod.warningLabel?.includes('TÜİK Endeksiyle Güncellenmiş Tahmini Birim Fiyat'));

  // Dönem içi sorguda (2026-03-15 <= 2026-03-31) fiyat değiştirilmez ve OFFICIAL_PERIOD_VALID döner
  const inPeriod = indexOutOfPeriodUnitPrice({
    itemCode: '15.150.1006',
    itemName: 'C30/37 Hazır Beton Dökülmesi',
    baseUnitPriceTl: 2650,
    catalogValidityEnd: '2026-03-31',
    evaluationDate: '2026-03-15',
    baseIndex: 240,
    currentIndex: 276,
  });

  assert.equal(inPeriod.isCatalogExpired, false);
  assert.equal(inPeriod.indexedUnitPriceTl, 2650);
  assert.equal(inPeriod.priceOrigin, 'OFFICIAL_PERIOD_VALID');
  assert.equal(inPeriod.warningLabel, null);
});

test('Faz 2.5 Golden 5: resolveTuikSubIndexForPoz maps construction, rebar, formwork, cable, and HVAC items accurately', () => {
  assert.equal(resolveTuikSubIndexForPoz('15.150.1005 C25/30 Beton').code, 'TUIK-23.6-HAZIR-BETON');
  assert.equal(resolveTuikSubIndexForPoz('15.160.1003 Nervürlü Demir').code, 'TUIK-24.1-DEMIR-CELIK');
  assert.equal(resolveTuikSubIndexForPoz('15.180.1002 Ahşap Kalıp').code, 'TUIK-16.1-KERESTE');
  assert.equal(resolveTuikSubIndexForPoz('35.120.1001 N2XH Kablo').code, 'TUIK-27.3-KABLO');
  assert.equal(resolveTuikSubIndexForPoz('Klima Santrali ve Havalandırma').code, 'TUIK-28.2-KLIMA-HAVALANDIRMA');
});
