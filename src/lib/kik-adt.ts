/**
 * 4734 Sayılı Kamu İhale Kanunu (KİK) Madde 38 & Kamu İhale Genel Tebliği Madde 45
 * Yapım İşleri Aşırı Düşük Teklif (ADT) Sınır Değer ve Sıralı İş Kalemleri (%80 Pareto) Motoru.
 *
 * Resmi Formülasyon:
 * 1. Yaklaşık Maliyetin (YM) üzerindeki teklifler sınır değer hesabına katılmaz.
 * 2. Geçerli tekliflerin (T_i <= YM) aritmetik ortalaması (T_ort1) ve standart sapması (sigma) hesaplanır.
 *    (Teklif sayısı n >= 3 ise örneklem standart sapması s = sqrt(sum((T_i - T_ort1)^2) / (n - 1)) kullanılır.)
 * 3. [T_ort1 - sigma, T_ort1 + sigma] aralığında kalan tekliflerin ikinci aritmetik ortalaması (T_ort2) alınır.
 * 4. C = T_ort2 / YM oranı hesaplanır:
 *    - C < 0,60         => R = 0,60 * N
 *    - 0,60 <= C <= 1,00 => R = C * N
 *    - C > 1,00         => R = 1,00 * N
 *    Burada N katsayısı: Üstyapı (Bina) işlerinde N = 1,00; Altyapı işlerinde N = 0,80.
 * 5. Sınır Değer (SD) = R * YM. SD'nin altındaki teklifler Aşırı Düşük Teklif (ADT) olarak sınıflandırılır.
 * 6. Kamu İhale Genel Tebliği m.45.1.2 uyarınca teklif kalemleri tutarlarına göre büyükten küçüğe sıralanır;
 *    toplam teklif tutarının %80'ine ulaşılana kadar olan kalemler "Açıklama İstenecek Sıralı İş Kalemleri"dir.
 */

export type KikWorkCategory = "ust_yapi" | "alt_yapi";

export interface KikLineItemInput {
  id: string;
  code?: string;
  description: string;
  totalAmount: number;
}

export interface KikAdtInput {
  estimatedCostTry: number;
  validBidsTry: number[];
  ourBidTry: number;
  workCategory?: KikWorkCategory;
  nCoefficientOverride?: number;
  lineItems?: KikLineItemInput[];
}

export interface KikRankedLineItem extends KikLineItemInput {
  shareRatio: number;
  cumulativeRatio: number;
  requiresExplanation: boolean;
}

export interface KikAdtResult {
  ruleVersion: "kik-4734-m38-2026.1";
  sourceCitation: string;
  estimatedCostTry: number;
  workCategory: KikWorkCategory;
  nCoefficient: number;
  admittedBidsTry: number[];
  excludedAboveYmBidsTry: number[];
  firstMeanTry: number;
  standardDeviationTry: number;
  inBandBidsTry: number[];
  correctedMeanTry: number;
  cRatio: number;
  rFactor: number;
  boundaryValueTry: number;
  ourBidTry: number;
  isAbnormallyLow: boolean;
  marginToBoundaryPercent: number;
  explanationRequiredItems: KikRankedLineItem[];
  exemptMinorItems: KikRankedLineItem[];
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round6(n: number): number {
  return Math.round((n + Number.EPSILON) * 1_000_000) / 1_000_000;
}

export function evaluateKikAbnormallyLowBid(input: KikAdtInput): KikAdtResult {
  const ym = Math.max(0.01, Number(input.estimatedCostTry) || 0);
  const ourBid = Math.max(0, Number(input.ourBidTry) || 0);
  const workCategory: KikWorkCategory = input.workCategory ?? "ust_yapi";
  const nCoefficient =
    typeof input.nCoefficientOverride === "number" && input.nCoefficientOverride > 0
      ? input.nCoefficientOverride
      : workCategory === "alt_yapi"
        ? 0.8
        : 1.0;

  const rawBids = (input.validBidsTry ?? [])
    .map((b) => Number(b))
    .filter((b) => Number.isFinite(b) && b > 0);

  const admittedBidsTry = rawBids.filter((b) => b <= ym);
  const excludedAboveYmBidsTry = rawBids.filter((b) => b > ym);

  const n = admittedBidsTry.length;
  const firstMeanTry =
    n > 0 ? round2(admittedBidsTry.reduce((sum, b) => sum + b, 0) / n) : round2(ym);

  let standardDeviationTry = 0;
  if (n >= 2) {
    const variance =
      admittedBidsTry.reduce((acc, b) => acc + Math.pow(b - firstMeanTry, 2), 0) / (n - 1);
    standardDeviationTry = round2(Math.sqrt(variance));
  }

  const lowerBand = firstMeanTry - standardDeviationTry;
  const upperBand = firstMeanTry + standardDeviationTry;

  const inBandBidsTry =
    n >= 3
      ? admittedBidsTry.filter((b) => b >= lowerBand - 1e-6 && b <= upperBand + 1e-6)
      : [...admittedBidsTry];

  const correctedMeanTry =
    inBandBidsTry.length > 0
      ? round2(inBandBidsTry.reduce((sum, b) => sum + b, 0) / inBandBidsTry.length)
      : firstMeanTry;

  const cRatio = round6(correctedMeanTry / ym);

  let rFactor: number;
  if (cRatio < 0.6) {
    rFactor = round6(0.6 * nCoefficient);
  } else if (cRatio <= 1.0) {
    rFactor = round6(cRatio * nCoefficient);
  } else {
    rFactor = round6(1.0 * nCoefficient);
  }

  const boundaryValueTry = round2(rFactor * ym);
  const isAbnormallyLow = ourBid < boundaryValueTry;
  const marginToBoundaryPercent =
    boundaryValueTry > 0 ? round2(((ourBid - boundaryValueTry) / boundaryValueTry) * 100) : 0;

  // Kamu İhale Genel Tebliği m.45.1.2 — Sıralı İş Kalemleri (%80 Pareto Analizi)
  const sortedItems = [...(input.lineItems ?? [])]
    .filter((item) => Number(item.totalAmount) > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const totalLineItemsSum = sortedItems.reduce((sum, item) => sum + item.totalAmount, 0);
  const explanationRequiredItems: KikRankedLineItem[] = [];
  const exemptMinorItems: KikRankedLineItem[] = [];

  let cumulativeSum = 0;
  let reached80Percent = false;

  for (const item of sortedItems) {
    const prevCumulativeRatio = totalLineItemsSum > 0 ? cumulativeSum / totalLineItemsSum : 0;
    cumulativeSum += item.totalAmount;
    const shareRatio = totalLineItemsSum > 0 ? round6(item.totalAmount / totalLineItemsSum) : 0;
    const cumulativeRatio = totalLineItemsSum > 0 ? round6(cumulativeSum / totalLineItemsSum) : 0;

    // Tebliğ m.45.1.2: %80 oranına ulaşılana kadar olan kalemler sıralı iş kalemidir (80%'i geçiren kalem dahildir).
    const requiresExplanation = !reached80Percent && prevCumulativeRatio < 0.8;
    if (cumulativeRatio >= 0.8) {
      reached80Percent = true;
    }

    const ranked: KikRankedLineItem = {
      ...item,
      shareRatio,
      cumulativeRatio,
      requiresExplanation,
    };

    if (requiresExplanation) {
      explanationRequiredItems.push(ranked);
    } else {
      exemptMinorItems.push(ranked);
    }
  }

  return {
    ruleVersion: "kik-4734-m38-2026.1",
    sourceCitation:
      "4734 Sayılı Kamu İhale Kanunu m.38 & Kamu İhale Genel Tebliği m.45.1 (Yapım İşleri Sınır Değer ve %80 Sıralı İş Kalemleri)",
    estimatedCostTry: round2(ym),
    workCategory,
    nCoefficient,
    admittedBidsTry,
    excludedAboveYmBidsTry,
    firstMeanTry,
    standardDeviationTry,
    inBandBidsTry,
    correctedMeanTry,
    cRatio,
    rFactor,
    boundaryValueTry,
    ourBidTry: round2(ourBid),
    isAbnormallyLow,
    marginToBoundaryPercent,
    explanationRequiredItems,
    exemptMinorItems,
  };
}
