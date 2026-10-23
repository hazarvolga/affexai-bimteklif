import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CSB_2026_TUIK_SUB_INDICES,
  computeContractPriceEscalation4735,
  evaluateContractPriceEscalation4735,
  indexOutOfPeriodUnitPrice,
  resolveTuikSubIndexForPoz,
} from './price-escalation';

const evidenceInput = {
  tenderDate: '2025-09-15',
  contractDate: '2025-10-01',
  contractReference: 'Sözleşme md. 14 / EK-2',
  progressPaymentAmountTl: 1_000_000,
  bFactor: 0.9,
  bFactorSource: 'Sözleşme md. 14.2',
  constantWeight: 0,
  weightsSource: 'Sözleşme EK-2 fiyat farkı tablosu',
  workSchedulePeriod: '2026-01',
  applicationPeriod: '2026-01',
  delayResponsibility: 'none' as const,
  delayLegalBasis: 'Onaylı iş programına uygun imalat',
  advancePaymentAmountTl: 200_000,
  advanceDeductionAmountTl: 100_000,
  advanceDeductionSource: 'Hakediş no 4 avans mahsup satırı',
  components: [{
    indexCode: 'TUIK-TUFE-GENEL' as const,
    weight: 1,
    baseIndex: 100,
    currentIndex: 120,
    seriesId: 'TÜFE 2023=100 / Genel',
    basePeriod: '2025-09',
    currentPeriod: '2026-01',
    sourceUrl: 'https://data.tuik.gov.tr/',
    sourcePublicationDate: '2026-02-03',
  }],
};

test('T21: 1.9.2025 sonrası normal uygulama ayında sözleşme ve endeks kanıtıyla değerlendirir; mahsup A_n bazından düşülür', () => {
  const result = evaluateContractPriceEscalation4735(evidenceInput);
  assert.equal(result.status, 'evaluated');
  if (result.status !== 'evaluated') return;
  assert.equal(result.regime, 'RG_32971_EFFECTIVE_2025_09_01');
  assert.equal(result.eligibleProgressPaymentAmountTl, 900_000);
  assert.equal(result.calculation.priceDifferenceTl, 162_000);
  assert.equal(result.assurance, 'CALCULATED_REVIEW_REQUIRED');
  assert.equal(result.isOfficialDetermination, false);
  assert.deepEqual(result.evidence.components, evidenceInput.components);
  assert.notEqual(result.evidence.components, evidenceInput.components);
  assert.ok(Object.isFrozen(result.evidence.components));
  assert.ok(Object.isFrozen(result.evidence.components[0]));
});

test('T21: gecikmeli uygulama ayında sorumluluk ve hukuki neden yoksa manuel inceleme ister', () => {
  const result = evaluateContractPriceEscalation4735({
    ...evidenceInput,
    applicationPeriod: '2026-02',
    delayResponsibility: 'contractor',
    delayLegalBasis: 'İdare gecikme tutanağı 2026/2',
  });
  assert.equal(result.status, 'manual_review');
  if (result.status === 'manual_review') assert.match(result.reasons.join(' '), /gecikme|hukuki/i);
});

test('T21: eski rejimi uydurmaz; 1.9.2025 öncesi ihale için manuel inceleme verir', () => {
  const result = evaluateContractPriceEscalation4735({ ...evidenceInput, tenderDate: '2025-08-31' });
  assert.equal(result.status, 'manual_review');
  if (result.status === 'manual_review') assert.match(result.reasons.join(' '), /önceki.*rejim/i);
});

test('T21: avans/mahsup, sözleşme B-ağırlık kaynağı veya endeks seri/dönem/kaynağı eksikse hesaplamaz', () => {
  const noEvidence = evaluateContractPriceEscalation4735({
    ...evidenceInput,
    bFactorSource: '',
    advanceDeductionAmountTl: undefined,
    components: [{ ...evidenceInput.components[0], sourceUrl: '', currentIndex: Number.NaN }],
  });
  assert.equal(noEvidence.status, 'not_evaluated');
  if (noEvidence.status === 'not_evaluated') {
    assert.match(noEvidence.missing.join(' '), /B katsayısı.*kaynağı/i);
    assert.match(noEvidence.missing.join(' '), /mahsup/i);
    assert.match(noEvidence.missing.join(' '), /endeks/i);
  }
});

test('T21: negatif fiyat farkını korur ve keyfi katsayıyı resmî sonuç olarak işaretlemez', () => {
  const result = evaluateContractPriceEscalation4735({
    ...evidenceInput,
    bFactor: 1,
    bFactorSource: 'Sözleşme özel şartname 9.1',
    advanceDeductionAmountTl: 0,
    components: [{ ...evidenceInput.components[0], currentIndex: 90 }],
  });
  assert.equal(result.status, 'evaluated');
  if (result.status !== 'evaluated') return;
  assert.equal(result.calculation.priceDifferenceTl, -100_000);
  assert.equal(result.isOfficialDetermination, false);
});

test('T21: sözleşme ve endeks kronolojisi tersse veya kaynak TÜİK değilse fail-closed kalır', () => {
  const reversedContract = evaluateContractPriceEscalation4735({ ...evidenceInput, contractDate: '2025-09-01' });
  assert.equal(reversedContract.status, 'manual_review');

  const reversedPeriod = evaluateContractPriceEscalation4735({
    ...evidenceInput,
    components: [{ ...evidenceInput.components[0], basePeriod: '2026-02', currentPeriod: '2026-01' }],
  });
  assert.equal(reversedPeriod.status, 'manual_review');

  const untrustedUrl = evaluateContractPriceEscalation4735({
    ...evidenceInput,
    components: [{ ...evidenceInput.components[0], sourceUrl: 'https://example.com/index' }],
  });
  assert.equal(untrustedUrl.status, 'not_evaluated');
});

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

test("Golden 6: sabit katsayı (a) ağırlık toplamına dahildir ve Pn'e a × 1 olarak girer", () => {
  // a = 0,10; tek endeks ağırlığı 0,90; E_n/E_0 = 1,20 → Pn = 0,10 + 0,90 × 1,20 = 1,18
  const r = computeContractPriceEscalation4735({
    progressPaymentAmountTl: 1_000_000,
    bFactor: 0.9,
    constantWeight: 0.1,
    components: [{ indexCode: "TUIK-TUFE-GENEL", weight: 0.9, baseIndex: 100, currentIndex: 120 }],
  });
  assert.equal(r.pnFactor, 1.18);
  assert.equal(r.constantWeight, 0.1);
  assert.equal(r.priceDifferenceTl, 162000); // 1.000.000 × 0,90 × 0,18
});

test("Golden 7: sabit katsayı dahil toplam 1,00 değilse reddedilir; geçersiz a reddedilir", () => {
  assert.throws(() =>
    computeContractPriceEscalation4735({
      progressPaymentAmountTl: 1000,
      constantWeight: 0.1,
      components: [{ indexCode: "TUIK-TUFE-GENEL", weight: 1, baseIndex: 100, currentIndex: 110 }],
    }),
  );
  assert.throws(() =>
    computeContractPriceEscalation4735({
      progressPaymentAmountTl: 1000,
      constantWeight: 1.5,
      components: [{ indexCode: "TUIK-TUFE-GENEL", weight: 1, baseIndex: 100, currentIndex: 110 }],
    }),
  );
});
