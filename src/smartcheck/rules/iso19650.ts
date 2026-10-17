/**
 * TS EN ISO 19650-1 / 19650-2 & EN 17412-1 (LOIN) Information Management Rule Engine.
 *
 * Validates:
 * 1. ISO 19650-2 National Annex & RG 33331 EK-2 Information Container Naming Convention
 * 2. Common Data Environment (CDE) State (WIP S0 / SHARED S1..S7 / PUBLISHED A1..A7 / ARCHIVED B)
 *    and Revision Code (Preliminary Pxx.xx vs Contractual Cxx) consistency
 * 3. Level of Information Need (LOIN — EN 17412-1):
 *    - Geometric completeness (admissible QTO / 3D geometry ratio)
 *    - Alphanumeric completeness (storey, material, classification/poz metadata)
 *    - GlobalId uniqueness & traceability across elements
 */

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
  guid?: string;
  type: string;
  name?: string;
  storey?: string;
  material?: string;
  pozNo?: string;
  hasAdmissibleQuantity: boolean;
}

export interface Iso19650ValidationInput {
  fileName: string;
  cdeState?: CdeState;
  suitabilityCode?: SuitabilityCode;
  revisionCode?: string;
  targetDeliveryStage?: "COORDINATION" | "TENDER_OR_PERMIT";
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
}

export interface LoinMetrics {
  totalElements: number;
  geometricCompletenessRatio: number;
  alphanumericCompletenessRatio: number;
  uniqueGuidRatio: number;
  duplicateGuidCount: number;
}

export interface Iso19650ValidationResult {
  rulePackVersion: "iso19650-2026.1";
  sourceCitation: string;
  isValid: boolean;
  score: number;
  cdeState: CdeState;
  suitabilityCode: SuitabilityCode;
  revisionCode: string;
  containerIdentity: ParsedContainerIdentity;
  loin: LoinMetrics;
  errors: string[];
  warnings: string[];
}

const ISO_19650_HYPHEN_REGEX =
  /^([A-Z0-9]{2,8})-([A-Z0-9]{2,6})-([A-Z0-9]{2,4})-([A-Z0-9]{2,4})-([A-Z0-9]{2,4})-([A-Z0-9]{1,4})-(\d{3,6})$/i;

const RG_33331_EK2_UNDERSCORE_REGEX =
  /^([A-Z0-9]{2,12})_([A-Z0-9]{2})_([A-Z]{2})_([A-Z0-9]{4})_([A-Z]{2})_([A-Z0-9]{3})_([A-Z0-9]{3})_(\d{2})_(\d{2,3})$/i;

const PRELIMINARY_REV_REGEX = /^P\d{2}\.\d{2}$/;
const CONTRACTUAL_REV_REGEX = /^C\d{2}$/;

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
    return {
      namingStandard: "RG_33331_EK2",
      projectCode: ek2Match[1].toUpperCase(),
      originatorOrDiscipline: ek2Match[3].toUpperCase(),
      volumeOrSystem: ek2Match[4].toUpperCase(),
      levelOrLocation: ek2Match[7].toUpperCase(),
      informationType: ek2Match[5].toUpperCase(),
      roleOrStage: ek2Match[2].toUpperCase(),
      sequenceNumber: `${ek2Match[8]}_${ek2Match[9]}`,
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

  const cdeState: CdeState = input.cdeState ?? "SHARED";
  const suitabilityCode: SuitabilityCode =
    input.suitabilityCode ??
    (cdeState === "WIP"
      ? "S0"
      : cdeState === "PUBLISHED"
        ? "A1"
        : cdeState === "ARCHIVED"
          ? "B"
          : "S3");
  const revisionCode = (input.revisionCode ?? (cdeState === "PUBLISHED" ? "C01" : "P01.01")).trim();
  const targetStage = input.targetDeliveryStage ?? "TENDER_OR_PERMIT";

  // 1. Bilgi Konteyneri Adlandırma Denetimi (ISO 19650-2 §5.1.7 & RG 33331 EK-2)
  const containerIdentity = parseContainerIdentity(input.fileName);
  if (containerIdentity.namingStandard === "NON_CONFORMING") {
    warnings.push(
      `[ISO 19650-2 §5.1.7 / RG 33331 EK-2] Bilgi konteyneri dosya adı ('${input.fileName}') standart 7 parçalı ISO 19650-2 (Proje-Kurum-Hacim-Kat-Tip-Rol-Sıra) veya 9 parçalı RG 33331 EK-2 şablonuna uymuyor.`,
    );
    penaltyPoints += 15;
  }

  // 2. CDE Durumu (WIP / SHARED / PUBLISHED / ARCHIVED) ve Uygunluk Kodu (S0..A7) Denetimi
  if (cdeState === "WIP" && suitabilityCode !== "S0") {
    errors.push(
      `[ISO 19650-2 §5.6 CDE İhlali] WIP (Çalışma Aşaması) durumundaki bilgi konteynerinin uygunluk kodu yalnız 'S0' olabilir (mevcut: '${suitabilityCode}').`,
    );
    penaltyPoints += 25;
  }
  if (cdeState === "SHARED" && !suitabilityCode.startsWith("S")) {
    errors.push(
      `[ISO 19650-2 §5.6 CDE İhlali] SHARED (Paylaşılan) durumundaki bilgi konteynerinin uygunluk kodu S1–S7 aralığında olmalıdır (mevcut: '${suitabilityCode}').`,
    );
    penaltyPoints += 25;
  }
  if (cdeState === "PUBLISHED" && !suitabilityCode.startsWith("A")) {
    errors.push(
      `[ISO 19650-2 §5.7 CDE İhlali] PUBLISHED (Yayımlanan/Sözleşmesel) durumundaki bilgi konteynerinin uygunluk kodu A1–A7 aralığında olmalıdır (mevcut: '${suitabilityCode}').`,
    );
    penaltyPoints += 25;
  }

  // 3. Revizyon Kodu (Pxx.xx Ön Revizyon vs Cxx Sözleşmesel Revizyon) Denetimi
  const isPrelimRev = PRELIMINARY_REV_REGEX.test(revisionCode);
  const isContractualRev = CONTRACTUAL_REV_REGEX.test(revisionCode);
  if (!isPrelimRev && !isContractualRev) {
    errors.push(
      `[ISO 19650-2 Ulusal Ek Revizyon Kuralı] Revizyon kodu ('${revisionCode}') geçersiz. Ön paylaşımlar için 'P01.01', yayımlanan/sözleşmesel teslimler için 'C01' formatı kullanılmalıdır.`,
    );
    penaltyPoints += 20;
  } else if (cdeState === "PUBLISHED" && !isContractualRev) {
    errors.push(
      `[ISO 19650-2 §5.7 Teslim İhlali] PUBLISHED (Yayımlanan) aşamasındaki model ön revizyon kodu ('${revisionCode}') taşıyamaz; sözleşmesel revizyon ('C01', 'C02' vb.) zorunludur.`,
    );
    penaltyPoints += 25;
  }

  if (targetStage === "TENDER_OR_PERMIT" && cdeState === "WIP") {
    errors.push(
      "[ISO 19650-2 §5.6 Görev Teslim Kuralı] WIP (S0 — Kalite kontrolünden geçmemiş taslak) durumundaki bilgi konteyneri doğrudan ihale veya ruhsat tesliminde kullanılamaz.",
    );
    penaltyPoints += 30;
  }

  // 4. LOIN (EN 17412-1 / ISO 19650-1 §11) Geometrik, Alfa-Sayısal ve GlobalId Bütünlüğü
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
    const hasStorey = Boolean(el.storey && el.storey.trim() && el.storey !== "Bilinmeyen Kat");
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
    totalElements > 0 ? round4(alphanumericValidCount / totalElements) : 0;
  const uniqueGuidRatio =
    totalElements > 0 ? round4(validUniqueGuidCount / totalElements) : 0;

  if (totalElements === 0) {
    errors.push("[ISO 19650-1 §11 LOIN] Bilgi konteynerinde denetlenebilir yapı elemanı bulunamadı.");
    penaltyPoints += 50;
  } else {
    if (duplicateGuidCount > 0) {
      errors.push(
        `[ISO 19650-2 / IFC GlobalId Bütünlüğü] Modelde ${duplicateGuidCount} adet mükerrer (çift) IFC GlobalId tespit edildi.`,
      );
      penaltyPoints += 25;
    }
    if (geometricCompletenessRatio < 0.95) {
      warnings.push(
        `[EN 17412-1 LOIN — Geometrik Bilgi] Elemanların %${(geometricCompletenessRatio * 100).toFixed(1)}'inde kanıtlı QTO/geometri verisi mevcut (hedef ≥ %95).`,
      );
      penaltyPoints += Math.round((1 - geometricCompletenessRatio) * 30);
    }
    if (alphanumericCompletenessRatio < 0.9) {
      warnings.push(
        `[EN 17412-1 LOIN — Alfa-Sayısal Bilgi] Elemanların %${(alphanumericCompletenessRatio * 100).toFixed(1)}'inde kat ve malzeme/poz üstverisi eksiksiz (hedef ≥ %90).`,
      );
      penaltyPoints += Math.round((1 - alphanumericCompletenessRatio) * 20);
    }
  }

  const score = Math.max(0, Math.min(100, Math.round(100 - penaltyPoints)));

  return {
    rulePackVersion: "iso19650-2026.1",
    sourceCitation:
      "TS EN ISO 19650-1:2018 §11, TS EN ISO 19650-2:2018 §5.1.7 / §5.6–5.7 & TS EN 17412-1:2020 (LOIN)",
    isValid: errors.length === 0,
    score,
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
