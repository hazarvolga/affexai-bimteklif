import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateKikAbnormallyLowBid } from './kik-adt';

const VERIFIED_ADMIN_SOURCE = { status: "verified" as const, issuer: "Test İdaresi", documentId: "YM-TEST", sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" };

/**
 * 4734 KİK m.38 & Kamu İhale Genel Tebliği m.45.1.1 / m.45.1.1.1 / m.45.1.1.4 / m.45.1.2
 * Altın Örnek (Golden) Doğrulama Test Seti — Faz 1.6
 *
 * Resmi Tebliğ Formülü:
 * - Geçerli teklif bandı: 0,40 * YM <= T_i <= 1,20 * YM
 * - Aritmetik ortalama: Tort1 = (Σ T_i) / n
 * - Örneklem standart sapması: σ = sqrt( Σ (T_i - Tort1)^2 / (n - 1) )
 * - İkinci ortalama: [Tort1 - σ, Tort1 + σ] içindeki tekliflerin ortalaması Tort2 (tek teklif varsa Tort2 = T1)
 * - C = Tort2 / YM
 * - K katsayısı:
 *     C < 0,60           => K = C
 *     0,60 <= C <= 1,00  => K = (3,2*C - C^2 - 0,6) / (C + 1)
 *     C > 1,00           => K = (C^2 - 0,8*C + 1,4) / (C + 1)
 * - N katsayısı:
 *     Üstyapı (Bina/Tesisat/Elektrik) = 1,00
 *     Diğer Yapım / Altyapı           = 1,20
 * - Sınır Değer:
 *     SD = max( 0,40 * YM, (K * Tort2) / (C * N) )
 * - Yuvarlama (Tebliğ m.45.1.1 ve 45.2 örneği): Tort1, σ, Tort2 → 2 ondalık; C, K → 3 ondalık.
 *   Her adımın yuvarlanmış sonucu bir sonraki adımda kullanılır.
 */

// Resmî doğrulama: Kamu İhale Genel Tebliği "45.2" sayısal örneği (YM = 100.000 TL, N = 1,20, 17 teklifin 12'si geçerli).
// Kaynak: Resmî Gazete 29.12.2010 (6. Mükerrer, 27800) ile değişik Tebliğ metni; beklenen değerler Tebliğ'deki örnekten aynen alınmıştır
// (Tort1 = 66.270,00; σ = 20.317,05; aralık 45.952,95–86.587,05; Tort2 = 63.237,50; C = 0,632; K = 0,627; SD = 52.281,00).
test('Resmî örnek (Tebliğ 45.2): 12 geçerli teklif, N = 1,20 -> SD = 52.281,00 TL', () => {
  const res = evaluateKikAbnormallyLowBid({
    estimatedCostTry: 100_000,
    workCategory: 'alt_yapi', // N = 1,20
    validBidsTry: [38_700, 44_000, 48_000, 49_500, 55_000, 62_000, 68_200, 69_000, 72_200, 82_000, 112_800, 123_300],
    ourBidTry: 49_500,
  });

  assert.equal(res.nCoefficient, 1.2);
  assert.deepEqual(res.excludedBelow40PercentYmBidsTry, [38_700]);
  assert.deepEqual(res.excludedAbove120PercentYmBidsTry, [123_300]);
  assert.equal(res.admittedBidsTry.length, 10);
  assert.equal(res.firstMeanTry, 66_270);
  assert.equal(res.standardDeviationTry, 20_317.05);
  assert.deepEqual(res.inBandBidsTry, [48_000, 49_500, 55_000, 62_000, 68_200, 69_000, 72_200, 82_000]);
  assert.equal(res.correctedMeanTry, 63_237.5);
  assert.equal(res.cRatio, 0.632);
  assert.equal(res.kFactor, 0.627);
  assert.equal(res.boundaryValueTry, 52_281);
  // Tebliğ örneği: SD'nin altında kalan 44.000, 48.000 ve 49.500 TL'lik teklifler aşırı düşüktür (38.700 TL baştan elendi).
  assert.equal(res.isAbnormallyLow, true);
});


test('Golden 1 (0,60 <= C <= 1,00 & Üstyapı N=1,00): 7 teklifli kamu bina ihalesi sınır değer hesabı', () => {
  // YM = 100.000.000 TL
  // Teklifler:
  //   38.000.000 (< %40 YM -> elenir)
  //   72.000.000 (geçerli)
  //   76.000.000 (geçerli)
  //   80.000.000 (geçerli)
  //   84.000.000 (geçerli)
  //   88.000.000 (geçerli)
  //  125.000.000 (> %120 YM -> elenir)
  // Geçerli 5 teklif: 72M, 76M, 80M, 84M, 88M -> Tort1 = 80.000.000 TL
  // Varyans = ((64 + 16 + 0 + 16 + 64) * 10^12) / 4 = 40 * 10^12 -> σ = 6.324.555,32 TL
  // [73.675.444,68 ; 86.324.555,32] aralığındaki teklifler: 76M, 80M, 84M -> Tort2 = 80.000.000 TL
  // C = 80.000.000 / 100.000.000 = 0,80
  // K = (3,2*0,80 - 0,64 - 0,60) / 1,80 = 1,32 / 1,80 = 0,7333... -> 3 ondalığa yuvarlanır: 0,733
  // N = 1,00 => SD = (0,733 * 80.000.000) / (0,800 * 1,00) = 73.300.000,00 TL
  const res = evaluateKikAbnormallyLowBid({
    estimatedCostTry: 100_000_000,
    workCategory: 'ust_yapi',
    validBidsTry: [
      38_000_000,
      72_000_000,
      76_000_000,
      80_000_000,
      84_000_000,
      88_000_000,
      125_000_000,
    ],
    ourBidTry: 71_500_000,
  });

  assert.equal(res.hasTenderSessionInputs, true);
  assert.deepEqual(res.excludedBelow40PercentYmBidsTry, [38_000_000]);
  assert.deepEqual(res.excludedAbove120PercentYmBidsTry, [125_000_000]);
  assert.equal(res.admittedBidsTry.length, 5);
  assert.equal(res.firstMeanTry, 80_000_000);
  assert.equal(res.correctedMeanTry, 80_000_000);
  assert.equal(res.cRatio, 0.8);
  assert.equal(res.kFactor, 0.733);
  assert.equal(res.nCoefficient, 1.0);
  assert.equal(res.boundaryValueTry, 73_300_000);
  assert.equal(res.isAbnormallyLow, true);
});

test('Golden 2 (0,60 <= C <= 1,00 & Altyapı N=1,20): Aynı teklif dağılımında altyapı sınır değeri', () => {
  // Aynı dağılımda N = 1,20 olduğunda:
  // SD = (0,733 * 80.000.000) / (0,800 * 1,20) = 58.640.000 / 0,96 = 61.083.333,33 TL
  const res = evaluateKikAbnormallyLowBid({
    estimatedCostTry: 100_000_000,
    workCategory: 'alt_yapi',
    validBidsTry: [72_000_000, 76_000_000, 80_000_000, 84_000_000, 88_000_000],
    ourBidTry: 65_000_000,
  });

  assert.equal(res.nCoefficient, 1.2);
  assert.equal(res.boundaryValueTry, 61_083_333.33);
  assert.equal(res.isAbnormallyLow, false);
});

test('Golden 3 (C > 1,00 bölgesi): 1,00 < C <= 1,20 aralığında K = (C^2 - 0,8C + 1,4)/(C + 1) formülü', () => {
  // YM = 50.000.000 TL
  // Teklifler: 52.500.000, 55.000.000, 57.500.000 (hepsi <= %120 YM = 60M)
  // Tort1 = 55.000.000, σ = 2.500.000 -> Tort2 = 55.000.000
  // C = 55M / 50M = 1,10
  // K = (1,21 - 0,88 + 1,40) / 2,10 = 1,73 / 2,10 = 0,82381 -> 0,824
  // N = 1,00 => SD = (0,824 * 55.000.000) / (1,100 * 1,00) = 41.200.000,00 TL
  const res = evaluateKikAbnormallyLowBid({
    estimatedCostTry: 50_000_000,
    workCategory: 'ust_yapi',
    validBidsTry: [52_500_000, 55_000_000, 57_500_000],
    ourBidTry: 52_500_000,
  });

  assert.equal(res.cRatio, 1.1);
  assert.equal(res.kFactor, 0.824);
  assert.equal(res.boundaryValueTry, 41_200_000);
});

test('Golden 4 (C < 0,60 bölgesi & %40 YM taban koruması): K = C ve SD >= 0,40 * YM', () => {
  // YM = 10.000.000 TL
  // Teklifler: 4.800.000, 5.000.000, 5.200.000 -> Tort2 = 5.000.000 -> C = 0,50 (< 0,60) => K = 0,50
  // Üstyapı (N = 1,00): (K * Tort2) / (C * 1,00) = 5.000.000 TL
  const ust = evaluateKikAbnormallyLowBid({
    estimatedCostTry: 10_000_000,
    workCategory: 'ust_yapi',
    validBidsTry: [4_800_000, 5_000_000, 5_200_000],
    ourBidTry: 4_800_000,
  });
  assert.equal(ust.cRatio, 0.5);
  assert.equal(ust.kFactor, 0.5);
  assert.equal(ust.boundaryValueTry, 5_000_000);

  // Altyapı (N = 1,20) ve Tort2 = 4.500.000 (C = 0,45 => K = 0,45):
  // Ham SD = 4.500.000 / 1,20 = 3.750.000 TL < %40 YM (4.000.000 TL) -> SD = 4.000.000 TL
  const alt = evaluateKikAbnormallyLowBid({
    estimatedCostTry: 10_000_000,
    workCategory: 'alt_yapi',
    validBidsTry: [4_400_000, 4_500_000, 4_600_000],
    ourBidTry: 3_900_000,
  });
  assert.equal(alt.boundaryValueTry, 4_000_000);
});

test('Golden 5 (Tebliğ m.45.1.1.4 Tek Geçerli Teklif & m.45.1.2 %80 Pareto Sıralı İş Kalemleri)', () => {
  const res = evaluateKikAbnormallyLowBid({
    estimatedCostTry: 20_000_000,
    workCategory: 'ust_yapi',
    validBidsTry: [16_000_000], // Tek geçerli teklif -> Tort1 = Tort2 = 16M, C = 0,80
    ourBidTry: 16_000_000,
    administrationEstimatedCostSourceIdentity: 'İdare yaklaşık maliyet cetveli / Golden 5',
    administrationEstimatedCostSourceVerification: VERIFIED_ADMIN_SOURCE,
    administrationEstimatedCostItems: [
      { id: '1', code: '15.150.1005', description: 'C30/37 Beton', totalAmount: 8_000_000 },
      { id: '2', code: '15.160.1003', description: 'B420C Nervürlü Donatı', totalAmount: 6_000_000 },
      { id: '3', code: '15.180.1002', description: 'Plywood Kalıp', totalAmount: 3_000_000 },
      { id: '4', code: '15.270.1002', description: 'İç Cephe Sıva', totalAmount: 2_000_000 },
      { id: '5', code: '15.540.1101', description: 'Su Bazlı Boya', totalAmount: 1_000_000 },
    ],
  });

  // Tek teklifte C = 0,800 -> K = 0,733 -> SD = (0,733 * 16.000.000) / 0,800 = 14.660.000,00 TL
  assert.equal(res.firstMeanTry, 16_000_000);
  assert.equal(res.correctedMeanTry, 16_000_000);
  assert.equal(res.boundaryValueTry, 14_660_000);

  // İdare yaklaşık maliyet kalemleri toplamı = YM = 20.000.000 TL; %80 eşiği = 16.000.000 TL.
  // Kalem 1 (8M -> %40) + Kalem 2 (6M -> %70) + Kalem 3 (3M -> %85); sınırı geçen kalem dahildir.
  // İlk 3 kalem açıklama istenilecek iş kalemleridir; 4. ve 5. kalem analizden muaftır.
  assert.equal(res.explanationRequiredItems.length, 3);
  assert.deepEqual(
    res.explanationRequiredItems.map((i) => i.code),
    ['15.150.1005', '15.160.1003', '15.180.1002'],
  );
  assert.equal(res.exemptMinorItems.length, 2);
});
