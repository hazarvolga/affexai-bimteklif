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

export interface Iso19650ElementSample {
  id: string;
  guid?: string | null;
  type: string;
  name?: string | null;
  storey?: string | null;
  material?: string | null;
  pozNo?: string | null;
  hasAdmissibleQuantity: boolean;
}

export interface Iso19650ValidationInput {
  fileName: string;
  cdeState?: CdeState | null;
  suitabilityCode?: SuitabilityCode | null;
  revisionCode?: string | null;
  targetDeliveryStage?: "COORDINATION" | "TENDER_OR_PERMIT" | null;
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
  const seenGuids = new Set<string>();
  let validUniqueGuidCount = 0;
  let duplicateGuidCount = 0;

  for (const el of input.elements) {
    if (el.hasAdmissibleQuantity) {
      geometricValidCount++;
    }
    const storey = el.storey?.trim();
    const hasStorey = Boolean(storey && storey !== "Bilinmeyen Kat");
    const hasMaterialOrPoz = Boolean(
      (el.material && el.material.trim()) || (el.pozNo && el.pozNo.trim()),
    );
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
    },
    errors,
    warnings,
  };
}

function alphanumericCompletenessRatioValue(validCount: number, total: number): number {
  return total > 0 ? validCount / total : 0;
}
