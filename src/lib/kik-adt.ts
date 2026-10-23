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
 * 7. Kamu İhale Genel Tebliği m.45.1.2 uyarınca idarenin yaklaşık maliyet cetvelindeki iş kalemleri büyükten küçüğe
 *    sıralanır; yaklaşık maliyetin %80'ine ulaşılana kadar olan kalemler açıklama istenecek sıralı iş kalemleridir.
 *    İsteklinin teklif kalemleri bu resmî listenin kaynağı değildir; yalnız ayrı bir danışma analizi üretir.
 */

export type KikWorkCategory = "ust_yapi" | "alt_yapi";

export const KIK_ADT_SOURCE_CITATION =
  "4734 Sayılı Kamu İhale Kanunu m.38 ve Kamu İhale Genel Tebliği m.45.1.1–45.1.2; RG 29.12.2010/27800 6. Mükerrer değişiklik metni ve m.45.2 örneği: https://www.resmigazete.gov.tr/eskiler/2010/12/20101229M6-13.htm ; m.45.1.2 idare yaklaşık maliyet dağılımı için KİK kararı: https://ekap.kik.gov.tr/EKAP/Vatandas/KurulKararGoster.aspx?KararId=26178bd78b9730925abbf20cecee0c1b9668cd30333cd4f9b4e9dde116a58a53";

export interface KikLineItemInput {
  id: string;
  code?: string;
  description: string;
  totalAmount: number;
}

export interface KikAdtInput {
  /** İdare Yaklaşık Maliyeti (YM - TL). Girilmediyse sınır değer ve resmî %80 listesi hesaplanmaz. */
  estimatedCostTry?: number | null;
  /** İhale ilk oturumundaki geçerli teklifler (TL). */
  validBidsTry?: number[];
  ourBidTry: number;
  workCategory?: KikWorkCategory;
  nCoefficientOverride?: number;
  /** İdarenin yaklaşık maliyet cetvelindeki iş kalemleri. Resmî m.45.1.2 listesi yalnız bu veriyle hesaplanır. */
  administrationEstimatedCostItems?: KikLineItemInput[];
  /** İdare cetvelini tekil olarak tanımlayan ihale/doküman/sürüm kimliği. */
  administrationEstimatedCostSourceIdentity?: string;
  /** Verified identity of the administration artifact. User-entered labels remain advisory. */
  administrationEstimatedCostSourceVerification?: {
    status: "user_asserted" | "verified";
    issuer: string;
    documentId: string;
    sha256: string;
  };
  /** @deprecated İsteklinin teklif kalemleri; yalnız danışma analizi üretir, resmî m.45.1.2 listesine girmez. */
  lineItems?: KikLineItemInput[];
}

export interface KikRankedLineItem extends KikLineItemInput {
  shareRatio: number;
  cumulativeRatio: number;
  requiresExplanation: boolean;
}

export interface KikAdtResult {
  ruleVersion: "kik-4734-m38-2026.4";
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
  officialExplanationListStatus: "evaluated" | "not_evaluated";
  officialExplanationListReason: string | null;
  administrationEstimatedCostSourceIdentity: string | null;
  administrationEstimatedCostItemsTotalTry: number;
  explanationRequiredItems: KikRankedLineItem[];
  exemptMinorItems: KikRankedLineItem[];
  /** Teklif kalemleriyle yapılan ve hukuki m.45.1.2 listesi sayılmayan ayrı danışma analizi. */
  advisoryOfferExplanationRequiredItems: KikRankedLineItem[];
  advisoryOfferExemptMinorItems: KikRankedLineItem[];
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

interface RankedPartition {
  explanationRequiredItems: KikRankedLineItem[];
  exemptMinorItems: KikRankedLineItem[];
}

function compareText(a: string, b: string): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

function deterministicItemOrder(a: KikLineItemInput, b: KikLineItemInput): number {
  if (a.totalAmount !== b.totalAmount) return b.totalAmount - a.totalAmount;
  return compareText(a.code ?? "", b.code ?? "")
    || compareText(a.description, b.description)
    || compareText(a.id, b.id);
}

function partitionAt80Percent(items: readonly KikLineItemInput[], denominatorTry: number): RankedPartition {
  const sortedItems = [...items].sort(deterministicItemOrder);
  const explanationRequiredItems: KikRankedLineItem[] = [];
  const exemptMinorItems: KikRankedLineItem[] = [];
  let cumulativeSum = 0;

  for (const item of sortedItems) {
    const prevCumulativeRatio = denominatorTry > 0 ? cumulativeSum / denominatorTry : 0;
    cumulativeSum += item.totalAmount;
    const ranked: KikRankedLineItem = {
      ...item,
      shareRatio: denominatorTry > 0 ? round6(item.totalAmount / denominatorTry) : 0,
      cumulativeRatio: denominatorTry > 0 ? round6(cumulativeSum / denominatorTry) : 0,
      requiresExplanation: prevCumulativeRatio < 0.8,
    };
    if (ranked.requiresExplanation) explanationRequiredItems.push(ranked);
    else exemptMinorItems.push(ranked);
  }
  return { explanationRequiredItems, exemptMinorItems };
}

function isValidLineItem(item: KikLineItemInput): boolean {
  return typeof item.id === "string" && item.id.trim() !== ""
    && typeof item.description === "string" && item.description.trim() !== ""
    && Number.isFinite(item.totalAmount) && item.totalAmount > 0;
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

  const hasValidEstimatedCost = Number.isFinite(rawYm) && rawYm > 0;
  const hasTenderSessionInputs = hasValidEstimatedCost && rawBids.length > 0;
  const ym = hasTenderSessionInputs ? rawYm : 0;

  // Kamu İhale Genel Tebliği m.45.1.2: resmî liste idarenin YM cetvelinden gelir.
  const administrationItems = input.administrationEstimatedCostItems ?? [];
  const administrationSourceIdentity = input.administrationEstimatedCostSourceIdentity?.trim() || null;
  const sourceVerification = input.administrationEstimatedCostSourceVerification;
  const sourceVerified = sourceVerification?.status === "verified"
    && Boolean(sourceVerification.issuer.trim())
    && Boolean(sourceVerification.documentId.trim())
    && /^[a-f0-9]{64}$/i.test(sourceVerification.sha256.trim());
  const administrationItemsValid = administrationItems.length > 0 && administrationItems.every(isValidLineItem);
  const administrationTotalCents = administrationItemsValid
    ? administrationItems.reduce((sum, item) => sum + Math.round(item.totalAmount * 100), 0)
    : 0;
  const ymCents = hasValidEstimatedCost ? Math.round(rawYm * 100) : 0;
  const administrationEstimatedCostItemsTotalTry = round2(administrationTotalCents / 100);

  let officialExplanationListStatus: KikAdtResult["officialExplanationListStatus"] = "not_evaluated";
  let officialExplanationListReason: string | null = null;
  let officialPartition: RankedPartition = { explanationRequiredItems: [], exemptMinorItems: [] };

  if (!hasValidEstimatedCost) {
    officialExplanationListReason = "Geçerli yaklaşık maliyet bulunmadığı için resmî liste değerlendirilmedi.";
  } else if (administrationItems.length === 0) {
    officialExplanationListReason = "İdarenin yaklaşık maliyet iş kalemleri girilmediği için resmî liste değerlendirilmedi.";
  } else if (!administrationSourceIdentity) {
    officialExplanationListReason = "İdare yaklaşık maliyet cetvelinin kaynak kimliği girilmediği için resmî liste değerlendirilmedi.";
  } else if (!sourceVerified) {
    officialExplanationListReason = "İdare yaklaşık maliyet cetveli yalnız kullanıcı beyanı; kurum, belge kimliği ve SHA-256 ile doğrulanmış artifact bulunmadığı için resmî liste değerlendirilmedi.";
  } else if (!administrationItemsValid) {
    officialExplanationListReason = "İdare yaklaşık maliyet cetvelinde kimliği, açıklaması veya pozitif tutarı geçersiz kalem bulunduğu için resmî liste değerlendirilmedi.";
  } else if (administrationTotalCents !== ymCents) {
    officialExplanationListReason = `İdare kalemleri toplamı ${administrationEstimatedCostItemsTotalTry.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL, yaklaşık maliyet ${round2(rawYm).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL ile kuruş düzeyinde eşleşmediği için resmî liste değerlendirilmedi.`;
  } else {
    officialExplanationListStatus = "evaluated";
    officialPartition = partitionAt80Percent(administrationItems, rawYm);
  }

  const validAdvisoryItems = (input.lineItems ?? []).filter(isValidLineItem);
  const advisoryTotal = validAdvisoryItems.reduce((sum, item) => sum + item.totalAmount, 0);
  const advisoryPartition = advisoryTotal > 0
    ? partitionAt80Percent(validAdvisoryItems, advisoryTotal)
    : { explanationRequiredItems: [], exemptMinorItems: [] };
  const paretoResultFields = {
    officialExplanationListStatus,
    officialExplanationListReason,
    administrationEstimatedCostSourceIdentity: administrationSourceIdentity,
    administrationEstimatedCostItemsTotalTry,
    explanationRequiredItems: officialPartition.explanationRequiredItems,
    exemptMinorItems: officialPartition.exemptMinorItems,
    advisoryOfferExplanationRequiredItems: advisoryPartition.explanationRequiredItems,
    advisoryOfferExemptMinorItems: advisoryPartition.exemptMinorItems,
  };

  if (!hasTenderSessionInputs) {
    return {
      ruleVersion: "kik-4734-m38-2026.4",
      sourceCitation: KIK_ADT_SOURCE_CITATION,
      hasTenderSessionInputs: false,
      estimatedCostTry: hasValidEstimatedCost ? round2(rawYm) : 0,
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
      ...paretoResultFields,
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
      ruleVersion: "kik-4734-m38-2026.4",
      sourceCitation: KIK_ADT_SOURCE_CITATION,
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
      ...paretoResultFields,
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
    ruleVersion: "kik-4734-m38-2026.4",
    sourceCitation: KIK_ADT_SOURCE_CITATION,
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
    ...paretoResultFields,
  };
}

