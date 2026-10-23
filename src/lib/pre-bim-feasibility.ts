import { detectCsvDelimiter, parseCsv, serializeCsv, type TabularCell } from "./tabular-data";

/**
 * IFC öncesi ön teklif / kat karşılığı fizibilite motoru (Paket M-3)
 *
 * Saha dayanağı: Uzman saha geri bildirimi (17 Ekim 2026, Tespit 4–5). Müteahhit
 * işi almadan önce IFC çizmez; Arsa m², TAKS, KAKS (emsal) ve çoklu parsel Excel'iyle
 * ön teklif verir ve kat maliklerine düşen dairelerin brüt/net m²'sini hesaplar.
 *
 * Dürüstlük kuralları:
 * - Her sayısal girdi (arsa, TAKS, KAKS, pay oranı, net/brüt oranı, birim maliyet,
 *   maliyet yüzde dağılımı, vaat edilen m²) kullanıcıdan gelir. Gizli varsayılan,
 *   piyasa ortalaması veya "tipik dağılım" YOKTUR. Girilmeyen değer için çıktı `null`.
 * - İmar değerleri (TAKS, KAKS, plan notları) kullanıcının imar durumu belgesinden
 *   alması gereken girdilerdir; bu modül imar mevzuatını yorumlamaz.
 * - "Vaat kapasiteyi aşıyor" yalnızca aritmetiktir. Aşan alanın nasıl karşılanacağı
 *   hakkında (kalite, malzeme vb.) hüküm VERİLMEZ; açıklama istenmesi önerilir.
 */

export interface ParcelInput {
  name: string;
  areaM2: number | null;
  /** Taban alanı kat sayısı (0 < TAKS ≤ 1). */
  taks: number | null;
  /** Emsal / KAKS (> 0). */
  kaks: number | null;
  /** Emsale dahil olmayan inşaat alanı (bodrum, sığınak vb.), kullanıcı girer; boşsa 0 sayılır ve uyarılır. */
  emsalHariciAreaM2?: number | null;
  /**
   * Kaynaklı alan cetveli. Satırlar aynı fiziksel alanı temsil etmeyecek şekilde
   * kararlı ve parsel içinde benzersiz `id` taşır.
   */
  areaLines?: ParcelAreaLine[];
  /** Yerel plan notu / imar durumu kanıtı. Yokluğu aritmetiği engellemez, uygunluk beyanını engeller. */
  localPlanEvidence?: LocalPlanEvidence | null;
}

export type ParcelAreaCategory = "included" | "limited_exempt" | "fully_exempt";

export interface ParcelAreaLine {
  id: string;
  label: string;
  category: ParcelAreaCategory;
  areaM2: number;
  sourceReference: string;
}

export interface LocalPlanEvidence {
  sourceReference: string;
  /** Kanıtın belge/teyit tarihi; YYYY-MM-DD. */
  asOf: string;
  /** Belgedeki parsel-özel sınırlı muaf havuz oranı. Girilmezse resmî uygunluk değerlendirilmez. */
  limitedExemptCapPercent: number;
  /** Only independently verified artifacts may drive an official planning decision. */
  verificationStatus?: "user_asserted" | "verified";
  issuer?: string;
  documentId?: string;
  sha256?: string;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export type ShareBase = "EMSAL" | "TOTAL";

export interface CostSplitPercent {
  kabaYapi: number | null;
  inceYapi: number | null;
  mekanik: number | null;
  elektrik: number | null;
  peyzajAltyapi: number | null;
}

export interface FeasibilityInput {
  parcels: ParcelInput[];
  /** Arsa sahiplerine verilen pay (%), kullanıcı girer. */
  landownerSharePercent: number | null;
  /** Payın hesaplandığı taban: yalnız emsal alanı mı, emsal + emsal harici toplam mı. */
  shareBase: ShareBase | null;
  /** Net / brüt oranı (0 < r ≤ 1), proje mimarından alınır. */
  netToGrossRatio: number | null;
  landownerUnitCount: number | null;
  /** Müteahhidin kat maliklerine daire başına vaat ettiği brüt alan (m²). */
  promisedGrossPerUnitM2: number | null;
  /** İnşaat birim maliyeti (TL/m²), kullanıcı veya müteahhit beyanı. */
  unitCostTryPerM2: number | null;
  costSplit?: CostSplitPercent | null;
}

export interface ParcelResult {
  name: string;
  valid: boolean;
  errors: string[];
  footprintM2: number | null;
  emsalAreaM2: number | null;
  emsalHariciAreaM2: number;
  areaLines: ParcelAreaLine[];
  /** Kaynaklı alan cetvelindeki emsale dahil toplam; satır yoksa null. */
  declaredIncludedAreaM2: number | null;
  limitedExemptAreaM2: number;
  fullyExemptAreaM2: number;
  limitedExemptPoolLimitM2: number | null;
  arithmeticExemptionStatus: "not_evaluated" | "within_limit" | "exceeds_limit";
  planningComplianceStatus: "not_evaluated" | "within_limit" | "exceeds_limit";
  totalConstructionM2: number | null;
  /** Emsal / taban alanından yaklaşık kat adedi (yukarı yuvarlanır); yalnızca bilgi. */
  approxFloorCount: number | null;
}

export type PromiseStatus = "not_evaluated" | "within_capacity" | "exceeds_capacity";

export interface PromiseCheck {
  status: PromiseStatus;
  promisedTotalGrossM2: number | null;
  capacityGrossM2: number | null;
  excessTotalM2: number | null;
  excessPerUnitM2: number | null;
  /** Aşan alanın birim maliyetle çarpımı (TL); birim maliyet girilmediyse null. */
  excessCostTry: number | null;
}

export interface CostBreakdownLine {
  key: keyof CostSplitPercent;
  label: string;
  percent: number;
  amountTry: number;
}

export interface FeasibilityResult {
  parcels: ParcelResult[];
  totalFootprintM2: number | null;
  totalEmsalAreaM2: number | null;
  totalEmsalHariciM2: number | null;
  totalLimitedExemptM2: number | null;
  totalFullyExemptM2: number | null;
  totalConstructionM2: number | null;
  shareBaseM2: number | null;
  landownerGrossM2: number | null;
  contractorGrossM2: number | null;
  landownerNetM2: number | null;
  perUnitGrossM2: number | null;
  perUnitNetM2: number | null;
  totalConstructionCostTry: number | null;
  costBreakdown: CostBreakdownLine[] | null;
  promise: PromiseCheck;
  warnings: string[];
}

const COST_LABELS: Record<keyof CostSplitPercent, string> = {
  kabaYapi: "Kaba yapı",
  inceYapi: "İnce yapı",
  mekanik: "Mekanik",
  elektrik: "Elektrik",
  peyzajAltyapi: "Peyzaj ve altyapı",
};

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

function isPos(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

function isNonNeg(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

function computeParcel(p: ParcelInput, warnings: string[]): ParcelResult {
  const errors: string[] = [];
  const label = p.name.trim() || "Adsız parsel";
  if (!isPos(p.areaM2)) errors.push("Arsa alanı pozitif olmalı.");
  if (!isPos(p.taks) || p.taks > 1) errors.push("TAKS 0 ile 1 arasında olmalı (ör. 0,40).");
  if (!isPos(p.kaks)) errors.push("KAKS/Emsal pozitif olmalı (ör. 2,00).");
  if (p.emsalHariciAreaM2 != null && !isNonNeg(p.emsalHariciAreaM2)) {
    errors.push("Emsal harici alan negatif olamaz.");
  }

  const explicitLines = p.areaLines ?? [];
  if (explicitLines.length > 0 && isNonNeg(p.emsalHariciAreaM2) && p.emsalHariciAreaM2 > 0) {
    errors.push("Eski emsalHariciAreaM2 toplamı ile kaynaklı areaLines birlikte verilemez; çift sayım riski.");
  }
  const legacyLine: ParcelAreaLine[] = explicitLines.length === 0 && isNonNeg(p.emsalHariciAreaM2) && p.emsalHariciAreaM2 > 0
    ? [{
        id: "legacy-emsal-harici",
        label: "Eski emsal harici alan girdisi",
        category: "limited_exempt",
        areaM2: p.emsalHariciAreaM2,
        sourceReference: "legacy:emsalHariciAreaM2:user_input",
      }]
    : [];
  const areaLines = explicitLines.length > 0 ? explicitLines.map((line) => ({ ...line })) : legacyLine;
  const seenLineIds = new Set<string>();
  for (const line of areaLines) {
    const id = line.id.trim();
    if (!id) errors.push("Alan satırı kimliği boş olamaz.");
    else if (seenLineIds.has(id)) errors.push(`Alan satırı kimliği tekrar ediyor: ${id}.`);
    else seenLineIds.add(id);
    if (!line.label.trim()) errors.push(`${id || "Alan satırı"}: açıklama boş olamaz.`);
    if (!line.sourceReference.trim()) errors.push(`${id || "Alan satırı"}: kaynak referansı boş olamaz.`);
    if (!isNonNeg(line.areaM2)) errors.push(`${id || "Alan satırı"}: alan negatif veya geçersiz olamaz.`);
    if (!["included", "limited_exempt", "fully_exempt"].includes(line.category)) {
      errors.push(`${id || "Alan satırı"}: alan kategorisi desteklenmiyor.`);
    }
  }

  if (errors.length > 0) {
    return {
      name: label,
      valid: false,
      errors,
      footprintM2: null,
      emsalAreaM2: null,
      emsalHariciAreaM2: 0,
      areaLines,
      declaredIncludedAreaM2: null,
      limitedExemptAreaM2: 0,
      fullyExemptAreaM2: 0,
      limitedExemptPoolLimitM2: null,
      arithmeticExemptionStatus: "not_evaluated",
      planningComplianceStatus: "not_evaluated",
      totalConstructionM2: null,
      approxFloorCount: null,
    };
  }

  const area = p.areaM2 as number;
  const taks = p.taks as number;
  const kaks = p.kaks as number;
  const limitedExempt = round(areaLines
    .filter((line) => line.category === "limited_exempt")
    .reduce((total, line) => total + line.areaM2, 0), 2);
  const fullyExempt = round(areaLines
    .filter((line) => line.category === "fully_exempt")
    .reduce((total, line) => total + line.areaM2, 0), 2);
  const harici = round(limitedExempt + fullyExempt, 2);
  const includedLines = areaLines.filter((line) => line.category === "included");
  const declaredIncluded = includedLines.length > 0
    ? round(includedLines.reduce((total, line) => total + line.areaM2, 0), 2)
    : null;
  if (areaLines.length === 0 && p.emsalHariciAreaM2 == null) {
    warnings.push(`${label}: emsal harici alan girilmedi; kaynaklı sınırlı/tam muaf alan 0 m² kabul edildi.`);
  }
  if (kaks < taks) {
    warnings.push(`${label}: KAKS (${kaks}) TAKS'tan (${taks}) küçük; tek katlı bile sığmaz, imar değerlerini kontrol edin.`);
  }

  const footprint = round(area * taks, 2);
  const emsal = round(area * kaks, 2);
  const planCapPercent = p.localPlanEvidence?.limitedExemptCapPercent;
  const validPlanCap = typeof planCapPercent === "number" && Number.isFinite(planCapPercent) && planCapPercent >= 0 && planCapPercent <= 100;
  const advisoryCapPercent = validPlanCap ? planCapPercent : 30;
  const limitedPoolLimit = round(emsal * (advisoryCapPercent / 100), 2);
  const includedExceedsCapacity = declaredIncluded !== null && declaredIncluded > emsal + 0.005;
  const arithmeticExemptionStatus = limitedExempt > limitedPoolLimit + 0.005 || includedExceedsCapacity
    ? "exceeds_limit"
    : "within_limit";
  const hasLocalPlanEvidence = Boolean(
    p.localPlanEvidence?.verificationStatus === "verified" &&
    p.localPlanEvidence.sourceReference.trim() &&
    p.localPlanEvidence.issuer?.trim() &&
    p.localPlanEvidence.documentId?.trim() &&
    /^[a-f0-9]{64}$/i.test(p.localPlanEvidence.sha256?.trim() ?? "") &&
    isValidIsoDate(p.localPlanEvidence.asOf) &&
    validPlanCap,
  );
  const planningComplianceStatus = hasLocalPlanEvidence ? arithmeticExemptionStatus : "not_evaluated";
  if (!hasLocalPlanEvidence) {
    warnings.push(`${label}: doğrulanmış yerel plan/imar artifact kimliği (kurum, belge no, SHA-256 ve geçerli tarih) yok; resmî plan uygunluğu değerlendirilmedi (not_evaluated). Oran karşılaştırması yalnız aritmetik danışmanlıktır.`);
  }
  if (limitedExempt > limitedPoolLimit + 0.005) {
    warnings.push(
      `${label}: sınırlı muaf alan (${limitedExempt} m²), emsal alanının (${emsal} m²) %${advisoryCapPercent}'unu (${limitedPoolLimit} m²) aşıyor. Planlı Alanlar İmar Yönetmeliği için yapılan bu aritmetik kontrolde tam muaf olarak sınıflandırılan ${fullyExempt} m² havuza ikinci kez katılmadı; sınıflandırmayı imar durum belgesi ve belediye plan notuyla teyit edin.`,
    );
  }
  if (includedExceedsCapacity) {
    warnings.push(`${label}: kaynaklı emsale dahil alan (${declaredIncluded} m²), KAKS aritmetik kapasitesini (${emsal} m²) aşıyor; yerel plan/imar belgesiyle inceleyin.`);
  }
  return {
    name: label,
    valid: true,
    errors: [],
    footprintM2: footprint,
    emsalAreaM2: emsal,
    emsalHariciAreaM2: round(harici, 2),
    areaLines,
    declaredIncludedAreaM2: declaredIncluded,
    limitedExemptAreaM2: limitedExempt,
    fullyExemptAreaM2: fullyExempt,
    limitedExemptPoolLimitM2: limitedPoolLimit,
    arithmeticExemptionStatus,
    planningComplianceStatus,
    totalConstructionM2: round((declaredIncluded ?? emsal) + harici, 2),
    approxFloorCount: footprint > 0 ? Math.ceil(emsal / footprint - 1e-9) : null,
  };
}

/**
 * Saha Doğrulaması (17 Ekim 2026):
 * 6-Villa Projesi Gerçek Piyasa Maliyet Dağılımı Referansı (27 Kalem).
 *
 * Kaynak: Uzman saha yanıtı ve `6-villa 2 A'dan Z'ye piyasa maliyetii.pdf` dökümü.
 * Toplam inşaat maliyeti: 4.135.752,77 TL (tam %100,00).
 * Bu referans, kullanıcılara karşılaştırma ve piyasa kontrol göstergesi olarak sunulur;
 * gizli varsayılan olarak hesaba otomatik uygulanmaz (kullanıcı kendi yüzdelerini girer).
 */
export interface CostBenchmarkItem {
  id: string;
  name: string;
  percent: number;
  sampleAmountTry: number;
  category: "ruhsat_proje" | "santiye_kamu" | "kaba_yapi" | "tesisat" | "ince_yapi" | "cevre_diger";
}

export const VILLA_MARKET_COST_BENCHMARK_2026: {
  readonly source: string;
  readonly asOf: string;
  readonly location: string;
  readonly sample: { readonly projectType: "6-villa"; readonly itemCount: 27 };
  readonly stale: boolean;
  readonly staleReason: string;
  readonly sampleTotalCostTry: number;
  readonly items: readonly CostBenchmarkItem[];
} = {
  source: "6-Villa Projesi Gerçek Piyasa Maliyet Analizi (17 Ekim 2026)",
  asOf: "2026-10-17",
  location: "Konum kaynak dökümünde belirtilmemiştir",
  sample: { projectType: "6-villa", itemCount: 27 },
  stale: true,
  staleReason: "Tek projeye ait tarihsel örnektir; güncel piyasa fiyatı veya bölgesel endeks değildir.",
  sampleTotalCostTry: 4135752.77,
  items: [
    { id: "projelendirme", name: "Projelendirme", percent: 7.13, sampleAmountTry: 295000.0, category: "ruhsat_proje" },
    { id: "santiye_kurulumu", name: "Şantiye Kurulumu", percent: 8.1, sampleAmountTry: 335000.0, category: "santiye_kamu" },
    { id: "hafriyat", name: "Hafriyat", percent: 0.86, sampleAmountTry: 35590.53, category: "kaba_yapi" },
    { id: "aylik_odemeler", name: "Aylık Ödemeler", percent: 2.32, sampleAmountTry: 96000.0, category: "santiye_kamu" },
    { id: "kamu_odemeler", name: "Kamu Ödemeleri", percent: 7.03, sampleAmountTry: 290825.51, category: "ruhsat_proje" },
    { id: "is_makinalari", name: "İş Makinaları", percent: 1.33, sampleAmountTry: 55012.5, category: "kaba_yapi" },
    { id: "beton_demir", name: "Beton-Demir", percent: 20.43, sampleAmountTry: 844810.0, category: "kaba_yapi" },
    { id: "su_yalitimi_drenaj", name: "Su Yalıtımı ve Drenaj", percent: 1.2, sampleAmountTry: 49681.0, category: "kaba_yapi" },
    { id: "duvar", name: "Duvar", percent: 2.26, sampleAmountTry: 93584.0, category: "kaba_yapi" },
    { id: "cati", name: "Çatı", percent: 4.32, sampleAmountTry: 178794.2, category: "kaba_yapi" },
    { id: "dis_cephe", name: "Dış Cephe", percent: 4.03, sampleAmountTry: 166557.0, category: "ince_yapi" },
    { id: "isitma_sogutma", name: "Isıtma ve Soğutma", percent: 5.27, sampleAmountTry: 218141.0, category: "tesisat" },
    { id: "sap", name: "Şap", percent: 1.0, sampleAmountTry: 41457.78, category: "ince_yapi" },
    { id: "seramik", name: "Seramik", percent: 2.75, sampleAmountTry: 113605.25, category: "ince_yapi" },
    { id: "mermer", name: "Mermer", percent: 2.36, sampleAmountTry: 97631.0, category: "ince_yapi" },
    { id: "elektrik", name: "Elektrik", percent: 6.35, sampleAmountTry: 262792.0, category: "tesisat" },
    { id: "siva", name: "Sıva", percent: 1.95, sampleAmountTry: 80688.0, category: "ince_yapi" },
    { id: "boya", name: "Boya", percent: 1.8, sampleAmountTry: 74360.0, category: "ince_yapi" },
    { id: "alcipan", name: "Alçıpan", percent: 0.42, sampleAmountTry: 17430.0, category: "ince_yapi" },
    { id: "pencere", name: "Pencere", percent: 4.84, sampleAmountTry: 200241.0, category: "ince_yapi" },
    { id: "parke", name: "Parke", percent: 0.66, sampleAmountTry: 27300.0, category: "ince_yapi" },
    { id: "celik_kapi", name: "Çelik Kapı", percent: 1.03, sampleAmountTry: 42680.0, category: "ince_yapi" },
    { id: "ic_kapilar", name: "İç Kapılar", percent: 1.0, sampleAmountTry: 41400.0, category: "ince_yapi" },
    { id: "ahsap_isleri_dolap", name: "Ahşap İşleri ve Dolap", percent: 3.54, sampleAmountTry: 146250.0, category: "ince_yapi" },
    { id: "ankastre", name: "Ankastre", percent: 3.49, sampleAmountTry: 144362.0, category: "ince_yapi" },
    { id: "balkon_korkuluk", name: "Balkon ve Korkuluk", percent: 0.76, sampleAmountTry: 31500.0, category: "ince_yapi" },
    { id: "peyzaj", name: "Peyzaj", percent: 3.75, sampleAmountTry: 155060.0, category: "cevre_diger" },
  ],
};

export function computeFeasibility(input: FeasibilityInput): FeasibilityResult {
  const warnings: string[] = [];
  const parcels = input.parcels.map((p) => computeParcel(p, warnings));
  const valid = parcels.filter((p) => p.valid);

  if (input.parcels.length === 0) warnings.push("En az bir parsel girin.");
  if (valid.length < parcels.length) warnings.push("Geçersiz parseller toplamlara dahil edilmedi.");

  const sum = (pick: (p: ParcelResult) => number) =>
    valid.length > 0 ? round(valid.reduce((a, p) => a + pick(p), 0), 2) : null;

  const totalFootprint = sum((p) => p.footprintM2 ?? 0);
  const totalEmsal = sum((p) => p.emsalAreaM2 ?? 0);
  const totalHarici = sum((p) => p.emsalHariciAreaM2);
  const totalLimitedExempt = sum((p) => p.limitedExemptAreaM2);
  const totalFullyExempt = sum((p) => p.fullyExemptAreaM2);
  const totalConstruction = sum((p) => p.totalConstructionM2 ?? 0);

  // Kat karşılığı paylaşımı
  let shareBaseM2: number | null = null;
  if (input.shareBase === "EMSAL") shareBaseM2 = totalEmsal;
  else if (input.shareBase === "TOTAL") shareBaseM2 = totalConstruction;
  else if (valid.length > 0) warnings.push("Pay tabanını (yalnız emsal / emsal + emsal harici) seçin; seçilmeden paylaşım hesaplanmaz.");

  let landownerGross: number | null = null;
  let contractorGross: number | null = null;
  if (shareBaseM2 !== null) {
    if (isNonNeg(input.landownerSharePercent) && input.landownerSharePercent <= 100) {
      landownerGross = round(shareBaseM2 * (input.landownerSharePercent / 100), 2);
      contractorGross = round(shareBaseM2 - landownerGross, 2);
    } else {
      warnings.push("Arsa sahibi payı 0–100 arasında bir yüzde olarak girilmeli.");
    }
  }

  let landownerNet: number | null = null;
  if (landownerGross !== null) {
    if (isPos(input.netToGrossRatio) && input.netToGrossRatio <= 1) {
      landownerNet = round(landownerGross * input.netToGrossRatio, 2);
    } else {
      warnings.push("Net/brüt oranı girilmedi veya 0–1 dışında; net alan hesaplanmadı (oran proje mimarından alınır).");
    }
  }

  const units = isPos(input.landownerUnitCount) && Number.isInteger(input.landownerUnitCount) ? input.landownerUnitCount : null;
  const perUnitGross = landownerGross !== null && units !== null ? round(landownerGross / units, 2) : null;
  const perUnitNet = landownerNet !== null && units !== null ? round(landownerNet / units, 2) : null;

  const unitCost = isPos(input.unitCostTryPerM2) ? input.unitCostTryPerM2 : null;
  const totalCost = unitCost !== null && totalConstruction !== null ? round(totalConstruction * unitCost, 2) : null;

  // Maliyet yüzde dağılımı: yalnızca kullanıcı girdiyse ve toplamı %100 ise
  let costBreakdown: CostBreakdownLine[] | null = null;
  if (input.costSplit && totalCost !== null) {
    const keys = Object.keys(COST_LABELS) as Array<keyof CostSplitPercent>;
    const values = keys.map((k) => input.costSplit![k]);
    if (values.every((v) => isNonNeg(v))) {
      const total = (values as number[]).reduce((a, b) => a + b, 0);
      if (Math.abs(total - 100) <= 0.01) {
        costBreakdown = keys.map((k) => ({
          key: k,
          label: COST_LABELS[k],
          percent: input.costSplit![k] as number,
          amountTry: round(totalCost * ((input.costSplit![k] as number) / 100), 2),
        }));
      } else {
        warnings.push(`Maliyet yüzde dağılımı toplamı %${round(total, 2)}; %100 olmalı. Dağılım gösterilmedi.`);
      }
    } else {
      warnings.push("Maliyet yüzde dağılımının beş kaleminin tamamı girilmeli; dağılım gösterilmedi.");
    }
  }

  // Vaat / kapasite kontrolü (yalnızca aritmetik)
  let promise: PromiseCheck = {
    status: "not_evaluated",
    promisedTotalGrossM2: null,
    capacityGrossM2: landownerGross,
    excessTotalM2: null,
    excessPerUnitM2: null,
    excessCostTry: null,
  };
  if (landownerGross !== null && units !== null && isPos(input.promisedGrossPerUnitM2)) {
    const promisedTotal = round(input.promisedGrossPerUnitM2 * units, 2);
    const excess = round(promisedTotal - landownerGross, 2);
    promise = {
      status: excess > 0.005 ? "exceeds_capacity" : "within_capacity",
      promisedTotalGrossM2: promisedTotal,
      capacityGrossM2: landownerGross,
      excessTotalM2: excess > 0.005 ? excess : 0,
      excessPerUnitM2: excess > 0.005 ? round(excess / units, 2) : 0,
      excessCostTry: excess > 0.005 && unitCost !== null ? round(excess * unitCost, 2) : null,
    };
  }

  return {
    parcels,
    totalFootprintM2: totalFootprint,
    totalEmsalAreaM2: totalEmsal,
    totalEmsalHariciM2: totalHarici,
    totalLimitedExemptM2: totalLimitedExempt,
    totalFullyExemptM2: totalFullyExempt,
    totalConstructionM2: totalConstruction,
    shareBaseM2,
    landownerGrossM2: landownerGross,
    contractorGrossM2: contractorGross,
    landownerNetM2: landownerNet,
    perUnitGrossM2: perUnitGross,
    perUnitNetM2: perUnitNet,
    totalConstructionCostTry: totalCost,
    costBreakdown,
    promise,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// CSV içe/dışa aktarım (Excel TR ile uyumlu: ; ayracı, UTF-8 BOM)
// ---------------------------------------------------------------------------

export const PARCEL_CSV_HEADER = [
  "parsel_adi", "alan_m2", "taks", "kaks",
  "emsale_dahil_m2", "emsale_dahil_kaynak",
  "sinirli_muaf_m2", "sinirli_muaf_kaynak",
  "tam_muaf_m2", "tam_muaf_kaynak",
  "yerel_plan_kaynak", "yerel_plan_tarih", "yerel_plan_sinirli_muaf_orani",
] as const;

export function buildParcelCsvTemplate(): string {
  // Örnek satır YOK: şablon uydurma imar değeri taşımaz.
  return serializeCsv([PARCEL_CSV_HEADER], { delimiter: ";", bom: true });
}

export interface ParcelCsvParseResult {
  parcels: ParcelInput[];
  errors: string[];
}

export type SheetCell = string | number | null | undefined;

function parseNumberTr(raw: SheetCell, delimiter: string): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (raw === null || raw === undefined) return null;
  let t = raw.trim().replace(/\s/g, "");
  if (t === "") return null;
  if (delimiter !== ",") {
    // Ondalık virgül; binlik nokta olabilir (1.250,50)
    if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * CSV ve .xlsx için ortak parsel satırı ayrıştırıcısı. İlk satır başlıktır.
 * `numberDelimiter`: metin hücrelerindeki sayı biçimini belirler (";" / tab → Türkçe, "," → İngilizce).
 */
export function parseParcelRows(rows: SheetCell[][], numberDelimiter = ";"): ParcelCsvParseResult {
  const errors: string[] = [];
  if (rows.length === 0) return { parcels: [], errors: ["Dosya boş."] };

  const header = rows[0].map((h) => String(h ?? "").trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const requiredHeader = ["parsel_adi", "alan_m2", "taks", "kaks"];
  const missing = requiredHeader.filter((h) => idx(h) === -1);
  if (missing.length > 0) {
    return { parcels: [], errors: [`Eksik sütun: ${missing.join(", ")}`] };
  }

  const parcels: ParcelInput[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    if (cells.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;
    const get = (name: string): SheetCell => (idx(name) >= 0 ? cells[idx(name)] : undefined);
    const area = parseNumberTr(get("alan_m2"), numberDelimiter);
    const taks = parseNumberTr(get("taks"), numberDelimiter);
    const kaks = parseNumberTr(get("kaks"), numberDelimiter);
    const legacyHarici = parseNumberTr(get("emsal_harici_m2"), numberDelimiter);
    const includedArea = parseNumberTr(get("emsale_dahil_m2"), numberDelimiter);
    const limitedExempt = parseNumberTr(get("sinirli_muaf_m2"), numberDelimiter);
    const fullyExempt = parseNumberTr(get("tam_muaf_m2"), numberDelimiter);
    if (area === null || taks === null || kaks === null) {
      errors.push(`Satır ${i + 1}: alan_m2, taks ve kaks sayı olmalı.`);
      continue;
    }
    const areaLines: ParcelAreaLine[] = [];
    if (includedArea !== null) {
      const sourceReference = String(get("emsale_dahil_kaynak") ?? "").trim();
      if (!sourceReference) {
        errors.push(`Satır ${i + 1}: emsale dahil alan için kaynak zorunludur.`);
        continue;
      }
      areaLines.push({ id: `row-${i + 1}-included`, label: "Emsale dahil alan", category: "included", areaM2: includedArea, sourceReference });
    }
    if (limitedExempt !== null) {
      const sourceReference = String(get("sinirli_muaf_kaynak") ?? "").trim();
      if (!sourceReference) {
        errors.push(`Satır ${i + 1}: sınırlı muaf alan için kaynak zorunludur.`);
        continue;
      }
      areaLines.push({ id: `row-${i + 1}-limited`, label: "Sınırlı muaf alan", category: "limited_exempt", areaM2: limitedExempt, sourceReference });
    }
    if (fullyExempt !== null) {
      const sourceReference = String(get("tam_muaf_kaynak") ?? "").trim();
      if (!sourceReference) {
        errors.push(`Satır ${i + 1}: tam muaf alan için kaynak zorunludur.`);
        continue;
      }
      areaLines.push({ id: `row-${i + 1}-fully`, label: "Tam muaf alan", category: "fully_exempt", areaM2: fullyExempt, sourceReference });
    }
    const localPlanSource = String(get("yerel_plan_kaynak") ?? "").trim();
    const localPlanAsOf = String(get("yerel_plan_tarih") ?? "").trim();
    const parcel: ParcelInput = {
      name: String(get("parsel_adi") ?? "").trim() || `Parsel ${parcels.length + 1}`,
      areaM2: area,
      taks,
      kaks,
    };
    if (areaLines.length > 0) parcel.areaLines = areaLines;
    else parcel.emsalHariciAreaM2 = legacyHarici;
    if (localPlanSource && localPlanAsOf) {
      const cap = parseNumberTr(get("yerel_plan_sinirli_muaf_orani"), numberDelimiter);
      if (cap !== null) parcel.localPlanEvidence = { sourceReference: localPlanSource, asOf: localPlanAsOf, limitedExemptCapPercent: cap };
    }
    parcels.push(parcel);
  }
  return { parcels, errors };
}

export function parseParcelCsv(text: string): ParcelCsvParseResult {
  const clean = text.replace(/^\uFEFF/, "");
  if (!clean.trim()) return { parcels: [], errors: ["Dosya boş."] };
  const delimiter = detectCsvDelimiter(clean);
  try {
    return parseParcelRows(parseCsv(clean, { delimiter }), delimiter);
  } catch {
    return { parcels: [], errors: ["CSV tırnak veya satır yapısı geçersiz."] };
  }
}

function fmtCsv(v: number | null): string {
  return v === null ? "" : String(v).replace(".", ",");
}

export function exportFeasibilityCsv(result: FeasibilityResult): string {
  const rows: TabularCell[][] = [];
  rows.push(["parsel_adi", "taban_alani_m2", "emsal_alani_m2", "emsal_harici_m2", "toplam_insaat_m2", "yaklasik_kat", "sinirli_muaf_m2", "tam_muaf_m2", "aritmetik_durum", "plan_uygunluk_durumu"]);
  for (const p of result.parcels) {
    rows.push([
      p.name,
      fmtCsv(p.footprintM2),
      fmtCsv(p.emsalAreaM2),
      p.valid ? fmtCsv(p.emsalHariciAreaM2) : "",
      fmtCsv(p.totalConstructionM2),
      p.approxFloorCount === null ? "" : String(p.approxFloorCount),
      p.valid ? fmtCsv(p.limitedExemptAreaM2) : "",
      p.valid ? fmtCsv(p.fullyExemptAreaM2) : "",
      p.arithmeticExemptionStatus,
      p.planningComplianceStatus,
    ]);
  }
  rows.push([]);
  rows.push(["alan_satiri_id", "parsel_adi", "kategori", "alan_m2", "kaynak"]);
  for (const p of result.parcels) {
    for (const line of p.areaLines) {
      rows.push([line.id, p.name, line.category, fmtCsv(line.areaM2), line.sourceReference]);
    }
  }
  rows.push([]);
  rows.push(["ozet", "deger"]);
  rows.push(["toplam_insaat_m2", fmtCsv(result.totalConstructionM2)]);
  rows.push(["arsa_sahibi_brut_m2", fmtCsv(result.landownerGrossM2)]);
  rows.push(["arsa_sahibi_net_m2", fmtCsv(result.landownerNetM2)]);
  rows.push(["muteahhit_brut_m2", fmtCsv(result.contractorGrossM2)]);
  rows.push(["daire_basi_brut_m2", fmtCsv(result.perUnitGrossM2)]);
  rows.push(["daire_basi_net_m2", fmtCsv(result.perUnitNetM2)]);
  rows.push(["toplam_maliyet_tl", fmtCsv(result.totalConstructionCostTry)]);
  rows.push(["vaat_durumu", result.promise.status]);
  rows.push(["vaat_asan_m2", fmtCsv(result.promise.excessTotalM2)]);
  rows.push(["vaat_asan_maliyet_tl", fmtCsv(result.promise.excessCostTry)]);
  return serializeCsv(rows, { delimiter: ";", bom: true });
}
