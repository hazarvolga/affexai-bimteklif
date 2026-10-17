/**
 * 4734 Sayılı Kamu İhale Kanunu (KİK) Madde 38 & Kamu İhale Genel Tebliği Madde 45.1.1
 * Yapım İşleri Aşırı Düşük Teklif (ADT) Sınır Değer (SD) ve Sıralı İş Kalemleri (%80 Pareto) Motoru.
 *
 * Resmi Formülasyon (Kamu İhale Genel Tebliği m.45.1.1, m.45.1.1.1, m.45.1.1.4 ve m.45.1.2):
 * 1. İdarece belirlenen Yaklaşık Maliyetin (YM) %120'sinin üzerindeki (> 1,20 * YM) ve
 *    %40'ının altındaki (< 0,40 * YM) teklifler dikkate alınmaz.
 * 2. [0,40 * YM, 1,20 * YM] aralığında kalan n adet geçerli teklifin aritmetik ortalaması (T_ort1)
 *    ve (n - 1) serbestlik dereceli standart sapması (sigma = sqrt(sum((T_i - T_ort1)^2) / (n - 1))) hesaplanır.
 * 3. [T_ort1 - sigma, T_ort1 + sigma] aralığında (sınırlar dahil) yer alan tekliflerin ikinci
 *    aritmetik ortalaması (T_ort2) alınır. (Tek geçerli teklif varsa m.45.1.1.4 uyarınca T_ort2 = T_1 alınır.)
 * 4. C = T_ort2 / YM oranı hesaplanır ve C değerine göre K katsayısı bulunur:
 *    - C < 0,60          => K = C
 *    - 0,60 <= C <= 1,00 => K = (3,2 * C - C^2 - 0,6) / (C + 1)
 *    - C > 1,00          => K = (C^2 - 0,8 * C + 1,4) / (C + 1)
 * 5. Sınır Değer Katsayısı (N — Tebliğ m.45.1.1.1):
 *    - Üstyapı (Bina), Elektrik, Mekanik Tesisat, Elektronik ve İletişim işleri: N = 1,00
 *    - Diğer Yapım İşleri (Altyapı vb.): N = 1,20
 * 6. Sınır Değer (SD) = (K * T_ort2) / (C * N).
 *    Tebliğ m.45.1.1.4 uyarınca %40-%120 aralığında geçerli teklif bulunmaması veya hesaplanan SD'nin
 *    0,40 * YM'nin altında çıkması halinde SD = 0,40 * YM olarak belirlenir.
 * 7. Kamu İhale Genel Tebliği m.45.1.2 uyarınca teklif kalemleri tutarlarına göre büyükten küçüğe sıralanır;
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
  /** İdare Yaklaşık Maliyeti (YM - TL). Girilmediyse (<= 0 veya null/undefined) sınır değer hesaplanmaz, yalnız Pareto çalışır. */
  estimatedCostTry?: number | null;
  /** İhale ilk oturumundaki geçerli teklifler (TL). */
  validBidsTry?: number[];
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
  ruleVersion: "kik-4734-m38-2026.3";
  sourceCitation: string;
  /** True only when real YM (> 0) and at least 1 valid bid were provided by the user. */
  hasTenderSessionInputs: boolean;
  estimatedCostTry: number;
  workCategory: KikWorkCategory;
  nCoefficient: number;
  admittedBidsTry: number[];
  excludedBelow40PercentYmBidsTry: number[];
  excludedAbove120PercentYmBidsTry: number[];
  /** Alias for bids excluded above 120% YM. */
  excludedAboveYmBidsTry: number[];
  firstMeanTry: number;
  standardDeviationTry: number;
  inBandBidsTry: number[];
  correctedMeanTry: number;
  cRatio: number;
  kFactor: number;
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

function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1_000) / 1_000;
}

function round6(n: number): number {
  return Math.round((n + Number.EPSILON) * 1_000_000) / 1_000_000;
}

export function computeKikKFactorExact(c: number): number {
  if (c < 0.6) {
    return c;
  }
  if (c <= 1.0) {
    return (3.2 * c - c * c - 0.6) / (c + 1);
  }
  return (c * c - 0.8 * c + 1.4) / (c + 1);
}

/** Tebliğ m.45.1.1: K katsayısı sonucu 3 ondalık basamağa yuvarlanır. */
export function computeKikKFactor(c: number): number {
  return round3(computeKikKFactorExact(c));
}

export function evaluateKikAbnormallyLowBid(input: KikAdtInput): KikAdtResult {
  const rawYm = Number(input.estimatedCostTry);
  const ourBid = Math.max(0, Number(input.ourBidTry) || 0);
  const workCategory: KikWorkCategory = input.workCategory ?? "ust_yapi";
  // İdare, işin niteliğine göre N'yi 1,00–1,20 arasında belirleyebilir (ilan/idari şartnamede yayımlanır).
  // Aralık dışı bir değer sessizce kabul edilmez; yanlış sınır değer üretir.
  if (input.nCoefficientOverride !== undefined && input.nCoefficientOverride !== null) {
    const n = input.nCoefficientOverride;
    if (typeof n !== "number" || !Number.isFinite(n) || n < 1 || n > 1.2) {
      throw new Error("N katsayısı 1,00 ile 1,20 arasında olmalıdır.");
    }
  }
  const nCoefficient =
    typeof input.nCoefficientOverride === "number"
      ? input.nCoefficientOverride
      : workCategory === "alt_yapi"
        ? 1.2
        : 1.0;

  const rawBids = (input.validBidsTry ?? [])
    .map((b) => Number(b))
    .filter((b) => Number.isFinite(b) && b > 0);

  const hasTenderSessionInputs = Number.isFinite(rawYm) && rawYm > 0 && rawBids.length > 0;
  const ym = hasTenderSessionInputs ? rawYm : 0;

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

  if (!hasTenderSessionInputs) {
    return {
      ruleVersion: "kik-4734-m38-2026.3",
      sourceCitation:
        "4734 Sayılı Kamu İhale Kanunu m.38 & Kamu İhale Genel Tebliği m.45.1.1–45.1.2 (Yapım İşleri Sınır Değer ve %80 Sıralı İş Kalemleri)",
      hasTenderSessionInputs: false,
      estimatedCostTry: 0,
      workCategory,
      nCoefficient,
      admittedBidsTry: [],
      excludedBelow40PercentYmBidsTry: [],
      excludedAbove120PercentYmBidsTry: [],
      excludedAboveYmBidsTry: [],
      firstMeanTry: 0,
      standardDeviationTry: 0,
      inBandBidsTry: [],
      correctedMeanTry: 0,
      cRatio: 0,
      kFactor: 0,
      rFactor: 0,
      boundaryValueTry: 0,
      ourBidTry: round2(ourBid),
      isAbnormallyLow: false,
      marginToBoundaryPercent: 0,
      explanationRequiredItems,
      exemptMinorItems,
    };
  }

  const minAdmissibleBid = 0.4 * ym;
  const maxAdmissibleBid = 1.2 * ym;

  const excludedBelow40PercentYmBidsTry = rawBids.filter((b) => b < minAdmissibleBid - 1e-6);
  const excludedAbove120PercentYmBidsTry = rawBids.filter((b) => b > maxAdmissibleBid + 1e-6);
  const admittedBidsTry = rawBids.filter(
    (b) => b >= minAdmissibleBid - 1e-6 && b <= maxAdmissibleBid + 1e-6,
  );

  const n = admittedBidsTry.length;

  // Tebliğ m.45.1.1.4: %40 - %120 aralığında geçerli teklif bulunmaması durumunda sınır değer YM'nin %40'ıdır.
  if (n === 0) {
    const floorBoundary = round2(0.4 * ym);
    const isAbnormallyLow = ourBid < floorBoundary;
    const marginToBoundaryPercent =
      floorBoundary > 0 ? round2(((ourBid - floorBoundary) / floorBoundary) * 100) : 0;

    return {
      ruleVersion: "kik-4734-m38-2026.3",
      sourceCitation:
        "4734 Sayılı Kamu İhale Kanunu m.38 & Kamu İhale Genel Tebliği m.45.1.1–45.1.2 (Yapım İşleri Sınır Değer ve %80 Sıralı İş Kalemleri)",
      hasTenderSessionInputs: true,
      estimatedCostTry: round2(ym),
      workCategory,
      nCoefficient,
      admittedBidsTry: [],
      excludedBelow40PercentYmBidsTry,
      excludedAbove120PercentYmBidsTry,
      excludedAboveYmBidsTry: excludedAbove120PercentYmBidsTry,
      firstMeanTry: 0,
      standardDeviationTry: 0,
      inBandBidsTry: [],
      correctedMeanTry: 0,
      cRatio: 0,
      kFactor: 0,
      rFactor: 0.4,
      boundaryValueTry: floorBoundary,
      ourBidTry: round2(ourBid),
      isAbnormallyLow,
      marginToBoundaryPercent,
      explanationRequiredItems,
      exemptMinorItems,
    };
  }

  // Kamu İhale Genel Tebliği m.45.1.1 ve 45.2 örneği: her adımın sonucu, bir sonraki adımda yuvarlanmış haliyle
  // kullanılır. Tort1, σ ve Tort2 2 ondalık; C ve K 3 ondalık basamağa yuvarlanır.
  const firstMeanTry = round2(admittedBidsTry.reduce((sum, b) => sum + b, 0) / n);

  let standardDeviationTry = 0;
  if (n >= 2) {
    const variance = admittedBidsTry.reduce((acc, b) => acc + Math.pow(b - firstMeanTry, 2), 0) / (n - 1);
    standardDeviationTry = round2(Math.sqrt(variance));
  }

  // Tebliğ m.45.1.1.4: Tek geçerli teklif varsa T_ort2 = tek geçerli teklif;
  // n >= 2 ise [T_ort1 - σ, T_ort1 + σ] aralığındaki tekliflerin ortalaması.
  const lowerBand = firstMeanTry - standardDeviationTry;
  const upperBand = firstMeanTry + standardDeviationTry;

  const inBandBidsTry =
    n >= 2
      ? admittedBidsTry.filter((b) => b >= lowerBand - 1e-6 && b <= upperBand + 1e-6)
      : [...admittedBidsTry];

  const correctedMeanTry = round2(
    inBandBidsTry.length > 0
      ? inBandBidsTry.reduce((sum, b) => sum + b, 0) / inBandBidsTry.length
      : firstMeanTry,
  );

  const cRatio = round3(correctedMeanTry / ym);
  const kFactor = computeKikKFactor(cRatio);

  // SD = (K * T_ort2) / (C * N) ; m.45.1.1.4 uyarınca alt sınır 0,40 * YM
  const rawBoundaryTry = (kFactor * correctedMeanTry) / (cRatio * nCoefficient);
  const boundaryValueTry = round2(Math.max(0.4 * ym, rawBoundaryTry));
  const rFactor = round6(boundaryValueTry / ym);

  const isAbnormallyLow = ourBid < boundaryValueTry;
  const marginToBoundaryPercent =
    boundaryValueTry > 0 ? round2(((ourBid - boundaryValueTry) / boundaryValueTry) * 100) : 0;

  return {
    ruleVersion: "kik-4734-m38-2026.3",
    sourceCitation:
      "4734 Sayılı Kamu İhale Kanunu m.38 & Kamu İhale Genel Tebliği m.45.1.1–45.1.2 (Yapım İşleri Sınır Değer ve %80 Sıralı İş Kalemleri)",
    hasTenderSessionInputs: true,
    estimatedCostTry: round2(ym),
    workCategory,
    nCoefficient,
    admittedBidsTry,
    excludedBelow40PercentYmBidsTry,
    excludedAbove120PercentYmBidsTry,
    excludedAboveYmBidsTry: excludedAbove120PercentYmBidsTry,
    firstMeanTry,
    standardDeviationTry,
    inBandBidsTry,
    correctedMeanTry,
    cRatio,
    kFactor,
    rFactor,
    boundaryValueTry,
    ourBidTry: round2(ourBid),
    isAbnormallyLow,
    marginToBoundaryPercent,
    explanationRequiredItems,
    exemptMinorItems,
  };
}

