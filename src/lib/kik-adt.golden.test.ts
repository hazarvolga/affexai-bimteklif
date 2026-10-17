import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateKikAbnormallyLowBid } from './kik-adt';

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
 */

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
  // K = (3,2*0,80 - 0,64 - 0,60) / 1,80 = 1,32 / 1,80 = 0,733333
  // N = 1,00 => SD = (K * Tort2) / (C * 1,00) = K * YM = 73.333.333,33 TL
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
  assert.equal(res.kFactor, 0.733333);
  assert.equal(res.nCoefficient, 1.0);
  assert.equal(res.boundaryValueTry, 73_333_333.33);
  assert.equal(res.isAbnormallyLow, true);
});

test('Golden 2 (0,60 <= C <= 1,00 & Altyapı N=1,20): Aynı teklif dağılımında altyapı sınır değeri', () => {
  // Aynı dağılımda N = 1,20 olduğunda:
  // SD = (K * Tort2) / (C * 1,20) = 73.333.333,333... / 1,20 = 61.111.111,11 TL
  const res = evaluateKikAbnormallyLowBid({
    estimatedCostTry: 100_000_000,
    workCategory: 'alt_yapi',
    validBidsTry: [72_000_000, 76_000_000, 80_000_000, 84_000_000, 88_000_000],
    ourBidTry: 65_000_000,
  });

  assert.equal(res.nCoefficient, 1.2);
  assert.equal(res.boundaryValueTry, 61_111_111.11);
  assert.equal(res.isAbnormallyLow, false);
});

test('Golden 3 (C > 1,00 bölgesi): 1,00 < C <= 1,20 aralığında K = (C^2 - 0,8C + 1,4)/(C + 1) formülü', () => {
  // YM = 50.000.000 TL
  // Teklifler: 52.500.000, 55.000.000, 57.500.000 (hepsi <= %120 YM = 60M)
  // Tort1 = 55.000.000, σ = 2.500.000 -> Tort2 = 55.000.000
  // C = 55M / 50M = 1,10
  // K = (1,21 - 0,88 + 1,40) / 2,10 = 1,73 / 2,10 = 0,823810
  // N = 1,00 => SD = K * YM = 41.190.476,19 TL
  const res = evaluateKikAbnormallyLowBid({
    estimatedCostTry: 50_000_000,
    workCategory: 'ust_yapi',
    validBidsTry: [52_500_000, 55_000_000, 57_500_000],
    ourBidTry: 52_500_000,
  });

  assert.equal(res.cRatio, 1.1);
  assert.equal(res.kFactor, 0.82381);
  assert.equal(res.boundaryValueTry, 41_190_476.19);
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
    lineItems: [
      { id: '1', code: '15.150.1005', description: 'C30/37 Beton', totalAmount: 6_500_000 },
      { id: '2', code: '15.160.1003', description: 'B420C Nervürlü Donatı', totalAmount: 5_200_000 },
      { id: '3', code: '15.180.1002', description: 'Plywood Kalıp', totalAmount: 2_300_000 },
      { id: '4', code: '15.270.1002', description: 'İç Cephe Sıva', totalAmount: 1_200_000 },
      { id: '5', code: '15.540.1101', description: 'Su Bazlı Boya', totalAmount: 800_000 },
    ],
  });

  // Tek teklifte C = 0,80 -> K = 1,32/1,80 -> SD = 20M * 0,733333... = 14.666.666,67 TL
  assert.equal(res.firstMeanTry, 16_000_000);
  assert.equal(res.correctedMeanTry, 16_000_000);
  assert.equal(res.boundaryValueTry, 14_666_666.67);

  // Toplam teklif = 16.000.000 TL; %80 eşiği = 12.800.000 TL
  // Kalem 1 (6,5M -> %40,63) + Kalem 2 (5,2M -> kümülatif 11,7M = %73,13) + Kalem 3 (2,3M -> kümülatif 14,0M = %87,50)
  // İlk 3 kalem açıklama istenilecek iş kalemleridir; 4. ve 5. kalem analizden muaftır.
  assert.equal(res.explanationRequiredItems.length, 3);
  assert.deepEqual(
    res.explanationRequiredItems.map((i) => i.code),
    ['15.150.1005', '15.160.1003', '15.180.1002'],
  );
  assert.equal(res.exemptMinorItems.length, 2);
});
