/**
 * TS EN ISO 19650-1 / 19650-2, EN 17412-1 (LOIN) & RG 33331 (05.08.2026 — #1.pdf, #2.pdf, EKLER.pdf)
 * Information Management & Container Compliance Rule Engine.
 *
 * Validates:
 * 1. RG 33331 (#1.pdf m.6 & EKLER.pdf EK-2) 9-part underscore container naming convention
 *    (`ProjeKodu(6)_BinaKodu(2)_Disiplin(2)_AltDisiplin(4)_DosyaTuru(2)_DosyaTipi(3)_KatKonum(3)_SiraNo(2)_RevizyonNo(3)`)
 *    verified against the official `ek2_disiplinler.json` dictionary tables, plus ISO 19650-2 7-part hyphenated template.
 * 2. Common Data Environment (CDE) State (WIP S0 / SHARED S1..S7 / PUBLISHED A1..A7 / ARCHIVED B)
 *    and Revision Code (Preliminary Pxx.xx vs Contractual Cxx / EK-2 000..999) consistency ONLY when explicit
 *    CDE metadata is provided (`cdeEvaluationStatus: "not_evaluated"` when absent — no hardcoded defaults).
 * 3. Level of Information Need (LOIN — EN 17412-1 & RG 33331 #1.pdf m.12/m.14 EK-6/EK-8 LOD 300):
 *    - Geometric completeness (admissible QTO / 3D geometry ratio)
 *    - Alphanumeric completeness (real storey + material/poz metadata without fallback inflation)
 *    - GlobalId uniqueness & traceability across elements
 */

import ek2Raw from "../../../workers/ifc/vendor/ifc_ruhsat/ekler/ek2_disiplinler.json";

export type CdeState = "WIP" | "SHARED" | "PUBLISHED" | "ARCHIVED";

export type SuitabilityCode =
  | "S0"
  | "S1"
  | "S2"
  | "S3"
  | "S4"
  | "S6"
  | "S7"
  | "A1"
  | "A2"
  | "A3"
  | "A4"
  | "A5"
  | "A6"
  | "A7"
  | "B";

export type EirDeliveryMilestone =
  | "CONCEPT"
  | "DEFINITIVE"
  | "IMPLEMENTATION"
  | "AS_BUILT";

export interface Iso19650ElementSample {
  id: string;
  guid?: string | null;
  type: string;
  name?: string | null;
  storey?: string | null;
  material?: string | null;
  pozNo?: string | null;
  loadBearing?: boolean | null;
  fireRating?: string | null;
  hasAdmissibleQuantity: boolean;
}

export interface Iso19650ValidationInput {
  fileName: string;
  cdeState?: CdeState | null;
  suitabilityCode?: SuitabilityCode | null;
  revisionCode?: string | null;
  targetDeliveryStage?: "COORDINATION" | "TENDER_OR_PERMIT" | null;
  eirMilestone?: EirDeliveryMilestone | null;
  elements: Iso19650ElementSample[];
}

export interface ParsedContainerIdentity {
  namingStandard: "ISO_19650_2" | "RG_33331_EK2" | "NON_CONFORMING";
  projectCode: string | null;
  originatorOrDiscipline: string | null;
  volumeOrSystem: string | null;
  levelOrLocation: string | null;
  informationType: string | null;
  roleOrStage: string | null;
  sequenceNumber: string | null;
  ek2DictionaryErrors?: string[];
}

export interface LoinMetrics {
  totalElements: number;
  geometricCompletenessRatio: number;
  alphanumericCompletenessRatio: number;
  uniqueGuidRatio: number;
  duplicateGuidCount: number;
  pozCoverageRatio?: number;
}

export interface LoinMilestoneEvaluation {
  milestone: EirDeliveryMilestone;
  milestoneTitle: string;
  targetLod: "LOD 200" | "LOD 300" | "LOD 350" | "LOD 400";
  requiredAttributes: string[];
  attributeCompleteness: Record<string, number>;
  overallCompletenessPercent: number;
  minRequiredPercent: number;
  passesMilestoneThreshold: boolean;
  missingElementCount: number;
}

export interface CdeTransitionRecord {
  fromState: CdeState | null;
  toState: CdeState;
  suitabilityCode: SuitabilityCode;
  revisionCode: string;
  actor: string;
  timestampIso: string;
  allowed: boolean;
  reason: string;
}

export interface Iso19650ValidationResult {
  rulePackVersion: "iso19650-2026.2";
  sourceCitation: string;
  isValid: boolean;
  score: number;
  cdeEvaluationStatus: "evaluated" | "not_evaluated";
  cdeState: CdeState | null;
  suitabilityCode: SuitabilityCode | null;
  revisionCode: string | null;
  containerIdentity: ParsedContainerIdentity;
  loin: LoinMetrics;
  loinMilestone?: LoinMilestoneEvaluation | null;
  errors: string[];
  warnings: string[];
}

const EK2_TABLES = ek2Raw as {
  disiplinler: Record<string, string>;
  alt_disiplinler: Record<string, string>;
  dosya_turleri: Record<string, string>;
  dosya_tipleri: Record<string, string>;
};

const ISO_19650_HYPHEN_REGEX =
  /^([A-Z0-9]{2,8})-([A-Z0-9]{2,6})-([A-Z0-9]{2,4})-([A-Z0-9]{2,4})-([A-Z0-9]{2,4})-([A-Z0-9]{1,4})-(\d{3,6})$/i;

const RG_33331_EK2_UNDERSCORE_REGEX =
  /^([A-Z0-9]{6})_([A-Z0-9]{2})_([A-Z]{2})_([A-Z0-9]{4})_([A-Z]{2})_([A-Z0-9]{3})_([A-Z0-9]{3})_(\d{2})_(\d{3})$/i;

const EK2_LEVEL_CODE_REGEX = /^(000|NNN|B\d{2}|K\d{2}|KAC|KAA|KTH)$/;

const PRELIMINARY_REV_REGEX = /^P\d{2}\.\d{2}$/;
const CONTRACTUAL_REV_REGEX = /^(C\d{2}|\d{3})$/;

function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10_000) / 10_000;
}

export function parseContainerIdentity(fileName: string): ParsedContainerIdentity {
  const base = fileName
    .trim()
    .replace(/^.*[\\/]/, "")
    .replace(/\.(ifc|ifczip|pdf|xlsx)$/i, "");

  const isoMatch = ISO_19650_HYPHEN_REGEX.exec(base);
  if (isoMatch) {
    return {
      namingStandard: "ISO_19650_2",
      projectCode: isoMatch[1].toUpperCase(),
      originatorOrDiscipline: isoMatch[2].toUpperCase(),
      volumeOrSystem: isoMatch[3].toUpperCase(),
      levelOrLocation: isoMatch[4].toUpperCase(),
      informationType: isoMatch[5].toUpperCase(),
      roleOrStage: isoMatch[6].toUpperCase(),
      sequenceNumber: isoMatch[7],
    };
  }

  const ek2Match = RG_33331_EK2_UNDERSCORE_REGEX.exec(base);
  if (ek2Match) {
    const projectCode = ek2Match[1].toUpperCase();
    const buildingCode = ek2Match[2].toUpperCase();
    const discipline = ek2Match[3].toUpperCase();
    const subDiscipline = ek2Match[4].toUpperCase();
    const fileGenre = ek2Match[5].toUpperCase();
    const fileType = ek2Match[6].toUpperCase();
    const levelCode = ek2Match[7].toUpperCase();
    const seqNo = ek2Match[8];
    const revNo = ek2Match[9];

    const ek2Errors: string[] = [];
    if (!(discipline in EK2_TABLES.disiplinler)) {
      ek2Errors.push(`Disiplin kodu '${discipline}' RG 33331 EK-2 tablosunda tanımlı değil.`);
    }
    if (!(subDiscipline in EK2_TABLES.alt_disiplinler)) {
      ek2Errors.push(`Alt disiplin kodu '${subDiscipline}' RG 33331 EK-2 tablosunda tanımlı değil.`);
    }
    if (!(fileGenre in EK2_TABLES.dosya_turleri)) {
      ek2Errors.push(`Dosya türü kodu '${fileGenre}' RG 33331 EK-2 tablosunda tanımlı değil.`);
    }
    if (!(fileType in EK2_TABLES.dosya_tipleri)) {
      ek2Errors.push(`Dosya tipi kodu '${fileType}' RG 33331 EK-2 tablosunda tanımlı değil.`);
    }
    if (!EK2_LEVEL_CODE_REGEX.test(levelCode)) {
      ek2Errors.push(
        `Kat/konum kodu '${levelCode}' RG 33331 EK-2 formatına (000, NNN, B01..B99, K00..K99, KAC, KAA, KTH) uymuyor.`,
      );
    }

    if (ek2Errors.length === 0) {
      return {
        namingStandard: "RG_33331_EK2",
        projectCode,
        originatorOrDiscipline: discipline,
        volumeOrSystem: subDiscipline,
        levelOrLocation: levelCode,
        informationType: fileGenre,
        roleOrStage: buildingCode,
        sequenceNumber: `${seqNo}_${revNo}`,
      };
    }

    return {
      namingStandard: "NON_CONFORMING",
      projectCode,
      originatorOrDiscipline: discipline,
      volumeOrSystem: subDiscipline,
      levelOrLocation: levelCode,
      informationType: fileGenre,
      roleOrStage: buildingCode,
      sequenceNumber: `${seqNo}_${revNo}`,
      ek2DictionaryErrors: ek2Errors,
    };
  }

  return {
    namingStandard: "NON_CONFORMING",
    projectCode: null,
    originatorOrDiscipline: null,
    volumeOrSystem: null,
    levelOrLocation: null,
    informationType: null,
    roleOrStage: null,
    sequenceNumber: null,
  };
}

export function evaluateIso19650Compliance(
  input: Iso19650ValidationInput,
): Iso19650ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let penaltyPoints = 0;

  // 1. Bilgi Konteyneri Adlandırma Denetimi (RG 33331 #1.pdf m.6 / EKLER.pdf EK-2 & ISO 19650-2 §5.1.7)
  const containerIdentity = parseContainerIdentity(input.fileName);
  if (containerIdentity.namingStandard === "NON_CONFORMING") {
    const detail = containerIdentity.ek2DictionaryErrors?.length
      ? ` (${containerIdentity.ek2DictionaryErrors.join(" ")})`
      : "";
    warnings.push(
      `[RG 33331 m.6 EK-2 / ISO 19650-2 §5.1.7] Bilgi konteyneri dosya adı ('${input.fileName}') 9 parçalı RG 33331 EK-2 veya 7 parçalı ISO 19650-2 şablonuna uymuyor${detail}.`,
    );
    penaltyPoints += 15;
  }

  // 2. CDE Durumu (WIP / SHARED / PUBLISHED / ARCHIVED) ve Uygunluk / Revizyon Kodu Denetimi
  // Yalnızca açık CDE üstverisi sağlandığında değerlendirilir; sabit varsayılan değer uydurulmaz!
  const hasExplicitCdeMetadata = Boolean(
    input.cdeState || input.suitabilityCode || (input.revisionCode && input.revisionCode.trim()),
  );

  const cdeEvaluationStatus: "evaluated" | "not_evaluated" = hasExplicitCdeMetadata
    ? "evaluated"
    : "not_evaluated";
  const cdeState: CdeState | null = input.cdeState ?? null;
  const suitabilityCode: SuitabilityCode | null = input.suitabilityCode ?? null;
  const revisionCode: string | null = input.revisionCode?.trim() || null;
  const targetStage = input.targetDeliveryStage ?? null;

  if (!hasExplicitCdeMetadata) {
    warnings.push(
      "[ISO 19650-2 §5.6–5.7 CDE Durumu] Doküman üstverisinde CDE durumu (WIP/SHARED/PUBLISHED/ARCHIVED), uygunluk kodu veya revizyon kodu belirtilmediğinden CDE durum geçişi değerlendirilmedi.",
    );
  } else {
    if (cdeState === "WIP" && suitabilityCode && suitabilityCode !== "S0") {
      errors.push(
        `[ISO 19650-2 §5.6 CDE İhlali] WIP (Çalışma Aşaması) durumundaki bilgi konteynerinin uygunluk kodu yalnız 'S0' olabilir (mevcut: '${suitabilityCode}').`,
      );
      penaltyPoints += 25;
    }
    if (cdeState === "SHARED" && suitabilityCode && !suitabilityCode.startsWith("S")) {
      errors.push(
        `[ISO 19650-2 §5.6 CDE İhlali] SHARED (Paylaşılan) durumundaki bilgi konteynerinin uygunluk kodu S1–S7 aralığında olmalıdır (mevcut: '${suitabilityCode}').`,
      );
      penaltyPoints += 25;
    }
    if (cdeState === "PUBLISHED" && suitabilityCode && !suitabilityCode.startsWith("A")) {
      errors.push(
        `[ISO 19650-2 §5.7 CDE İhlali] PUBLISHED (Yayımlanan/Sözleşmesel) durumundaki bilgi konteynerinin uygunluk kodu A1–A7 aralığında olmalıdır (mevcut: '${suitabilityCode}').`,
      );
      penaltyPoints += 25;
    }

    if (revisionCode) {
      const isPrelimRev = PRELIMINARY_REV_REGEX.test(revisionCode);
      const isContractualRev = CONTRACTUAL_REV_REGEX.test(revisionCode);
      if (!isPrelimRev && !isContractualRev) {
        errors.push(
          `[ISO 19650-2 / RG 33331 EK-2 Revizyon Kuralı] Revizyon kodu ('${revisionCode}') geçersiz. Ön paylaşımlar için 'P01.01', yayımlanan/sözleşmesel teslimler için 'C01' veya EK-2 '000' formatı kullanılmalıdır.`,
        );
        penaltyPoints += 20;
      } else if (cdeState === "PUBLISHED" && !isContractualRev) {
        errors.push(
          `[ISO 19650-2 §5.7 Teslim İhlali] PUBLISHED (Yayımlanan) aşamasındaki model ön revizyon kodu ('${revisionCode}') taşıyamaz; sözleşmesel revizyon ('C01', 'C02' veya EK-2 '000') zorunludur.`,
        );
        penaltyPoints += 25;
      }
    }

    if (targetStage === "TENDER_OR_PERMIT" && cdeState === "WIP") {
      errors.push(
        "[ISO 19650-2 §5.6 Görev Teslim Kuralı] WIP (S0 — Kalite kontrolünden geçmemiş taslak) durumundaki bilgi konteyneri doğrudan ihale veya e-PYS ruhsat tesliminde kullanılamaz.",
      );
      penaltyPoints += 30;
    }
  }

  // 3. LOIN (EN 17412-1 / ISO 19650-1 §11 & RG 33331 m.12/m.14 EK-6/EK-8 LOD 300)
  const totalElements = input.elements.length;
  let geometricValidCount = 0;
  let alphanumericValidCount = 0;
  let pozValidCount = 0;
  const seenGuids = new Set<string>();
  let validUniqueGuidCount = 0;
  let duplicateGuidCount = 0;

  for (const el of input.elements) {
    if (el.hasAdmissibleQuantity) {
      geometricValidCount++;
    }
    const storey = el.storey?.trim();
    const hasStorey = Boolean(storey && storey !== "Bilinmeyen Kat");
    const hasMaterial = Boolean(el.material && el.material.trim());
    const hasPoz = Boolean(el.pozNo && el.pozNo.trim());
    if (hasPoz) {
      pozValidCount++;
    }
    const hasMaterialOrPoz = hasMaterial || hasPoz;
    if (hasStorey && hasMaterialOrPoz) {
      alphanumericValidCount++;
    }
    const guid = el.guid?.trim();
    if (guid) {
      if (seenGuids.has(guid)) {
        duplicateGuidCount++;
      } else {
        seenGuids.add(guid);
        validUniqueGuidCount++;
      }
    }
  }

  const geometricCompletenessRatio =
    totalElements > 0 ? round4(geometricValidCount / totalElements) : 0;
  const alphanumericCompletenessRatio =
    totalElements > 0 ? round4(alphanumericCompletenessRatioValue(alphanumericValidCount, totalElements)) : 0;
  const uniqueGuidRatio =
    totalElements > 0 ? round4(validUniqueGuidCount / totalElements) : 0;
  const pozCoverageRatio =
    totalElements > 0 ? round4(pozValidCount / totalElements) : 0;

  if (totalElements === 0) {
    errors.push("[ISO 19650-1 §11 LOIN] Bilgi konteynerinde denetlenebilir yapı elemanı bulunamadı.");
    penaltyPoints += 50;
  } else {
    if (duplicateGuidCount > 0) {
      errors.push(
        `[ISO 19650-2 / RG 33331 EK-9 GlobalId Bütünlüğü] Modelde ${duplicateGuidCount} adet mükerrer (çift) IFC GlobalId tespit edildi.`,
      );
      penaltyPoints += 25;
    }
    if (geometricCompletenessRatio < 0.95) {
      warnings.push(
        `[EN 17412-1 LOIN / RG 33331 EK-8 LOD 300 — Geometrik Bilgi] Elemanların %${(geometricCompletenessRatio * 100).toFixed(1)}'inde kanıtlı QTO/geometri verisi mevcut (hedef ≥ %95).`,
      );
      penaltyPoints += Math.round((1 - geometricCompletenessRatio) * 30);
    }
    if (alphanumericCompletenessRatio < 0.9) {
      warnings.push(
        `[EN 17412-1 LOIN / RG 33331 EK-6 — Alfa-Sayısal Bilgi] Elemanların %${(alphanumericCompletenessRatio * 100).toFixed(1)}'inde kat ve malzeme/poz üstverisi eksiksiz (hedef ≥ %90).`,
      );
      penaltyPoints += Math.round((1 - alphanumericCompletenessRatio) * 20);
    }
  }

  // 4. EIR Teslim Aşaması Bazlı LOIN Şablon Denetimi (Faz 2.2)
  const loinMilestone = input.eirMilestone
    ? evaluateLoinByMilestone(input.elements, input.eirMilestone)
    : null;

  if (loinMilestone && !loinMilestone.passesMilestoneThreshold) {
    warnings.push(
      `[EN 17412-1 EIR / LOIN — ${loinMilestone.milestoneTitle} (${loinMilestone.targetLod})] Aşama gereksinim tamlığı %${loinMilestone.overallCompletenessPercent.toFixed(1)} (minimum hedef ≥ %${loinMilestone.minRequiredPercent}, eksik eleman: ${loinMilestone.missingElementCount}).`,
    );
  }

  const score = Math.max(0, Math.min(100, Math.round(100 - penaltyPoints)));

  return {
    rulePackVersion: "iso19650-2026.2",
    sourceCitation:
      "TS EN ISO 19650-1:2018 §11, TS EN ISO 19650-2:2018 §5.1.7 / §5.6–5.7, TS EN 17412-1:2020 (LOIN) & RG 33331 (05.08.2026) EK-2 / EK-6 / EK-8",
    isValid: errors.length === 0,
    score,
    cdeEvaluationStatus,
    cdeState,
    suitabilityCode,
    revisionCode,
    containerIdentity,
    loin: {
      totalElements,
      geometricCompletenessRatio,
      alphanumericCompletenessRatio,
      uniqueGuidRatio,
      duplicateGuidCount,
      pozCoverageRatio,
    },
    loinMilestone,
    errors,
    warnings,
  };
}

function alphanumericCompletenessRatioValue(validCount: number, total: number): number {
  return total > 0 ? validCount / total : 0;
}

const EIR_MILESTONE_SPECS: Record<
  EirDeliveryMilestone,
  {
    title: string;
    targetLod: "LOD 200" | "LOD 300" | "LOD 350" | "LOD 400";
    requiredAttributes: Array<"guid" | "storey" | "quantity" | "material" | "pozNo">;
    minRequiredPercent: number;
  }
> = {
  CONCEPT: {
    title: "Avan Proje (Ön Tasarım)",
    targetLod: "LOD 200",
    requiredAttributes: ["guid", "storey", "quantity"],
    minRequiredPercent: 80,
  },
  DEFINITIVE: {
    title: "Kesin Proje (Disiplinlerarası Koordinasyon)",
    targetLod: "LOD 300",
    requiredAttributes: ["guid", "storey", "quantity", "material"],
    minRequiredPercent: 88,
  },
  IMPLEMENTATION: {
    title: "Uygulama Projesi & RG 33331 e-PYS Ruhsat/İhale Teslimi",
    targetLod: "LOD 350",
    requiredAttributes: ["guid", "storey", "quantity", "material", "pozNo"],
    minRequiredPercent: 92,
  },
  AS_BUILT: {
    title: "İş Sonu (As-Built) & İşletme Teslimi",
    targetLod: "LOD 400",
    requiredAttributes: ["guid", "storey", "quantity", "material", "pozNo"],
    minRequiredPercent: 96,
  },
};

/**
 * Faz 2.2 — EN 17412-1 (LOIN) & EIR Teslim Aşaması Gereksinim Şablonu Değerlendiricisi
 */
export function evaluateLoinByMilestone(
  elements: Iso19650ElementSample[],
  milestone: EirDeliveryMilestone,
): LoinMilestoneEvaluation {
  const spec = EIR_MILESTONE_SPECS[milestone];
  const total = elements.length;
  if (total === 0) {
    return {
      milestone,
      milestoneTitle: spec.title,
      targetLod: spec.targetLod,
      requiredAttributes: [...spec.requiredAttributes],
      attributeCompleteness: {},
      overallCompletenessPercent: 0,
      minRequiredPercent: spec.minRequiredPercent,
      passesMilestoneThreshold: false,
      missingElementCount: 0,
    };
  }

  const counts: Record<string, number> = {};
  for (const attr of spec.requiredAttributes) {
    counts[attr] = 0;
  }

  let fullyCompliantElements = 0;

  for (const el of elements) {
    const hasGuid = Boolean(el.guid && el.guid.trim());
    const hasStorey = Boolean(el.storey && el.storey.trim() && el.storey.trim() !== "Bilinmeyen Kat");
    const hasQuantity = Boolean(el.hasAdmissibleQuantity);
    const hasMaterial = Boolean(el.material && el.material.trim());
    const hasPozOrMaterial = Boolean((el.pozNo && el.pozNo.trim()) || hasMaterial);

    const checkMap: Record<string, boolean> = {
      guid: hasGuid,
      storey: hasStorey,
      quantity: hasQuantity,
      material: hasMaterial,
      pozNo: hasPozOrMaterial,
    };

    let allPresent = true;
    for (const attr of spec.requiredAttributes) {
      if (checkMap[attr]) {
        counts[attr]++;
      } else {
        allPresent = false;
      }
    }
    if (allPresent) {
      fullyCompliantElements++;
    }
  }

  const attributeCompleteness: Record<string, number> = {};
  let sumRatios = 0;
  for (const attr of spec.requiredAttributes) {
    const pct = Math.round(((counts[attr] / total) * 100 + Number.EPSILON) * 10) / 10;
    attributeCompleteness[attr] = pct;
    sumRatios += pct;
  }

  const overallCompletenessPercent =
    Math.round(((sumRatios / spec.requiredAttributes.length) + Number.EPSILON) * 10) / 10;

  return {
    milestone,
    milestoneTitle: spec.title,
    targetLod: spec.targetLod,
    requiredAttributes: [...spec.requiredAttributes],
    attributeCompleteness,
    overallCompletenessPercent,
    minRequiredPercent: spec.minRequiredPercent,
    passesMilestoneThreshold: overallCompletenessPercent >= spec.minRequiredPercent,
    missingElementCount: total - fullyCompliantElements,
  };
}

/**
 * Faz 2.1 — TS EN ISO 19650-2 §5.6–5.7 CDE Durum Makinesi Geçiş Denetleyicisi
 *
 * Geçerli geçişler:
 * - null -> WIP | SHARED | PUBLISHED | ARCHIVED (ilk kayıt)
 * - WIP -> SHARED (kalite kontrol onayıyla paylaşım)
 * - SHARED -> PUBLISHED (müşteri/idare onayıyla sözleşmesel yayın; Cxx / 000 revizyonu ve A1..A7 kodu zorunlu)
 * - SHARED -> WIP (revizyon için geri çekme)
 * - PUBLISHED -> ARCHIVED (yeni sürüm yayımlandığında arşivleme; B kodu)
 * - PUBLISHED -> SHARED (yeni ön revizyon döngüsü)
 * Doğrudan WIP -> PUBLISHED geçişi (SHARED kalite kontrol adımını atladığı için) ISO 19650-2 §5.6 gereği engellenir!
 */
export function validateCdeStateTransition(params: {
  fromState: CdeState | null;
  toState: CdeState;
  suitabilityCode: SuitabilityCode;
  revisionCode: string;
  actor?: string;
  timestampIso?: string;
}): CdeTransitionRecord {
  const actor = params.actor?.trim() || "Proje BIM Koordinatörü";
  const timestampIso = params.timestampIso || new Date().toISOString();
  const rev = params.revisionCode.trim();

  if (params.fromState === "WIP" && params.toState === "PUBLISHED") {
    return {
      fromState: params.fromState,
      toState: params.toState,
      suitabilityCode: params.suitabilityCode,
      revisionCode: rev,
      actor,
      timestampIso,
      allowed: false,
      reason:
        "ISO 19650-2 §5.6–5.7 gereği WIP (Çalışma) durumundaki konteyner SHARED (Paylaşılan / Koordinasyon) onayından geçmeden doğrudan PUBLISHED (Yayımlanan) durumuna geçirilemez.",
    };
  }

  if (params.toState === "WIP" && params.suitabilityCode !== "S0") {
    return {
      fromState: params.fromState,
      toState: params.toState,
      suitabilityCode: params.suitabilityCode,
      revisionCode: rev,
      actor,
      timestampIso,
      allowed: false,
      reason: `WIP durumu yalnız 'S0' başlangıç uygunluk kodu ile kullanılabilir (seçilen: '${params.suitabilityCode}').`,
    };
  }

  if (params.toState === "SHARED" && !params.suitabilityCode.startsWith("S")) {
    return {
      fromState: params.fromState,
      toState: params.toState,
      suitabilityCode: params.suitabilityCode,
      revisionCode: rev,
      actor,
      timestampIso,
      allowed: false,
      reason: `SHARED durumu S1..S7 uygunluk kodu gerektirir (seçilen: '${params.suitabilityCode}').`,
    };
  }

  if (params.toState === "PUBLISHED") {
    if (!params.suitabilityCode.startsWith("A")) {
      return {
        fromState: params.fromState,
        toState: params.toState,
        suitabilityCode: params.suitabilityCode,
        revisionCode: rev,
        actor,
        timestampIso,
        allowed: false,
        reason: `PUBLISHED durumu A1..A7 yetkilendirme kodu gerektirir (seçilen: '${params.suitabilityCode}').`,
      };
    }
    if (!CONTRACTUAL_REV_REGEX.test(rev)) {
      return {
        fromState: params.fromState,
        toState: params.toState,
        suitabilityCode: params.suitabilityCode,
        revisionCode: rev,
        actor,
        timestampIso,
        allowed: false,
        reason: `PUBLISHED durumunda sözleşmesel revizyon kodu ('C01' veya EK-2 '000') zorunludur (mevcut: '${rev}').`,
      };
    }
  }

  if (params.toState === "ARCHIVED" && params.suitabilityCode !== "B") {
    return {
      fromState: params.fromState,
      toState: params.toState,
      suitabilityCode: params.suitabilityCode,
      revisionCode: rev,
      actor,
      timestampIso,
      allowed: false,
      reason: `ARCHIVED (Arşiv) durumu için uygunluk kodu 'B' olmalıdır (seçilen: '${params.suitabilityCode}').`,
    };
  }

  return {
    fromState: params.fromState,
    toState: params.toState,
    suitabilityCode: params.suitabilityCode,
    revisionCode: rev,
    actor,
    timestampIso,
    allowed: true,
    reason: `CDE durum geçişi (${params.fromState ?? "BAŞLANGIÇ"} → ${params.toState} · ${params.suitabilityCode} · ${rev}) TS EN ISO 19650-2 §5.6–5.7 kurallarına uygun olarak kaydedildi.`,
  };
}

