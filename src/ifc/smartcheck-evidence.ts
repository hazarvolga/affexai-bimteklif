import { classifyAuthoringSoftware, type AuthoringSoftwareDetection } from "./authoring-software-diagnostics";
import type { Finding, ParsedQuantityRow } from "@/smartcheck/import/normalize";
import { validateRows } from "@/smartcheck/import/normalize";
import type { IfcConsistencyReport, IfcParseSummary, IfcParserContract, IfcSourceIdentity, ParsedIfcElement, ParsedOpening, TrPsetCsbProjectCompliance } from "./types";
import type { IfcRuleEvaluations } from "@/smartcheck/rules/ifc-rule-run";
import { hasDirectIfcRebarMassEvidence } from "./rebar-evidence";

export interface IfcEvidenceDocumentContext {
  fileName: string;
  checksumSha256?: string;
  schemaName?: string;
  parserVersion?: string;
}

export interface IfcSmartCheckEvidenceRow {
  sheetName: string;
  sourceRowNumber: number;
  sourceCellRange: string;
  rawDescription: string;
  rawPositionCode: string;
  rawUnit: string;
  rawQuantity: string;
  rawPrice: string;
  rawWastePercent: string;
  formulaJson: Record<string, string>;
  normalizedDescription: string | null;
  normalizedPositionCode: string | null;
  normalizedUnit: string | null;
  normalizedQuantity: string | null;
  normalizedPrice: string | null;
  normalizedWastePercent: string;
  quantitySource: "ifc_property" | "ifc_qto";
  priceSource: "manual_required";
  mappingConfidence: string;
  reviewStatus: "pending_review";
  findingsJson: Finding[];
  sourceIdentity?: IfcSourceIdentity;
}

export interface IfcBlockedEvidenceElement {
  elementId: string;
  globalId: string;
  elementType: ParsedIfcElement["type"];
  code:
    | "IFC_ESTIMATE_QUANTITY_BLOCKED"
    | "IFC_GEOMETRY_FALLBACK_BLOCKED"
    | "IFC_REBAR_EVIDENCE_POLICY_PENDING"
    | "IFC_QUALITY_GATE_BLOCKED"
    | "IFC_PARSE_FAILED";
  reason: string;
  sourceReference: string;
  sourceIdentity?: IfcSourceIdentity;
}

export interface IfcSmartCheckEvidenceArtifact {
  schemaVersion: 1;
  kind: "ifc_smartcheck_quantity_evidence";
  document: IfcEvidenceDocumentContext;
  summary: {
    parseStatus: IfcParseSummary["parseStatus"];
    extractionMode: IfcParseSummary["extractionMode"];
    totalElements: number;
    evidenceRowCount: number;
    blockedElementCount: number;
    qtoQuantityCount: number;
    propertyQuantityCount: number;
    geometryBlockedCount: number;
    rebarBlockedCount: number;
    formworkEstimateBlockedCount: number;
    spatiallyAssignedEvidenceRowCount: number;
    elementsWithPozNoCount: number;
    elementsMissingPozNoCount: number;
    trPsetCsb: TrPsetCsbProjectCompliance;
    /** Kaynak yazılım tespiti (IFC başlığı / IfcApplication); tespit edilemediyse yok. */
    authoringSoftware?: AuthoringSoftwareDetection;
    /** Kapı/pencere listesi (sözleşmesel minha için); yoksa yok. */
    openings?: ParsedOpening[];
    /** IFC Tutarlılık ve Metraj Kapsama Raporu (Rev. 36). */
    consistencyReport?: IfcConsistencyReport;
    parserContract?: IfcParserContract;
  };
  rows: IfcSmartCheckEvidenceRow[];
  blockedElements: IfcBlockedEvidenceElement[];
  /** Server-side rule pack results (3x3, e-PYS), stored as run evidence. */
  ruleEvaluations?: IfcRuleEvaluations;
}

function formatQuantity(value: number): string {
  return Number.isFinite(value) ? Number(value.toFixed(12)).toString() : "";
}

function isSourceBackedRebar(element: ParsedIfcElement): boolean {
  return hasDirectIfcRebarMassEvidence(element);
}

function buildParsedQuantityRow(element: ParsedIfcElement, sourceRowNumber: number): ParsedQuantityRow {
  const evidencePath = element.quantitySourcePath ?? `IFC#${element.id}`;
  const formulaJson: Record<string, string> = {
    elementStepId: `#${element.id}`,
    globalId: element.guid,
    quantitySourcePath: element.quantitySourcePath ?? "",
    storeySourcePath: element.storeySourcePath ?? "",
    pozNoSourcePath: element.pozNoSourcePath ?? "",
  };
  if (typeof element.loadBearing === "boolean") formulaJson.loadBearing = String(element.loadBearing);
  if (element.exposure) formulaJson.exposure = element.exposure;
  if (element.surfaceCondition) formulaJson.surfaceCondition = element.surfaceCondition;
  if (element.exposureClass) formulaJson.exposureClass = element.exposureClass;
  if (typeof element.coverMm === "number" && Number.isFinite(element.coverMm)) formulaJson.coverMm = String(element.coverMm);
  if (element.discipline) formulaJson.discipline = element.discipline;
  if (typeof element.expectedQuantity === "number" && Number.isFinite(element.expectedQuantity)) {
    formulaJson.expectedQuantity = formatQuantity(element.expectedQuantity);
  }
  if (typeof element.grossAreaM2 === "number" && Number.isFinite(element.grossAreaM2)) {
    formulaJson.grossAreaM2 = formatQuantity(element.grossAreaM2);
  }
  if (typeof element.openingAreaM2 === "number" && Number.isFinite(element.openingAreaM2)) {
    formulaJson.openingAreaM2 = formatQuantity(element.openingAreaM2);
  }
  if (typeof element.lengthM === "number" && Number.isFinite(element.lengthM)) {
    formulaJson.lengthM = formatQuantity(element.lengthM);
  }
  if (typeof element.rebarDiameterMm === "number" && Number.isFinite(element.rebarDiameterMm)) {
    formulaJson.rebarDiameterMm = formatQuantity(element.rebarDiameterMm);
  }
  if (Array.isArray(element.materialLayers) && element.materialLayers.length > 0) {
    formulaJson.materialLayers = JSON.stringify(element.materialLayers);
  }
  if (element.coveringPredefinedType) {
    formulaJson.coveringPredefinedType = element.coveringPredefinedType;
  }
  if (element.spaceCode) {
    formulaJson.spaceCode = element.spaceCode;
  }
  if (element.spaceName) {
    formulaJson.spaceName = element.spaceName;
  }
  if (element.zoneName) {
    formulaJson.zoneName = element.zoneName;
  }
  const isSkirtingLinear =
    element.type === "IfcCovering" &&
    (element.coveringPredefinedType === "SKIRTINGBOARD" || /süpürgelik/i.test(element.name)) &&
    typeof element.lengthM === "number" &&
    element.lengthM > 0;
  const isCoveringArea = element.type === "IfcCovering" && typeof element.areaM2 === "number" && element.areaM2 > 0;
  const isRebarMass = isSourceBackedRebar(element);
  return {
    sheetName: "IFC",
    sourceRowNumber,
    sourceCellRange: `IFC#${element.id}`,
    rawDescription: isRebarMass
      ? `${element.type} ${element.name} donatı kütlesi · ${element.storey} · ${evidencePath}`
      : isSkirtingLinear
      ? `${element.type} ${element.name} süpürgelik metrajı · ${element.storey} · ${evidencePath}`
      : isCoveringArea
        ? `${element.type} ${element.name} kaplama alanı · ${element.storey} · ${evidencePath}`
        : `${element.type} ${element.name} beton hacmi · ${element.storey} · ${evidencePath}`,
    // TREpys_PozOzellikSeti.PozNo / Tr_Pset_CSB.PozNo IFC dosyasından okunur; bulunamazsa boş bırakılır ve
    // validateRows() bunu MISSING_POSITION_CODE bulgusu olarak işaretler —
    // tip-bazlı bir yer tutucu (örn. "IFC-BEAM-CONCRETE") kullanılmaz.
    rawPositionCode: element.pozNo ?? "",
    rawUnit: isRebarMass ? "kg" : isSkirtingLinear ? "m" : isCoveringArea ? "m2" : "m3",
    rawQuantity: isRebarMass
      ? formatQuantity(element.rebarKg)
      : isSkirtingLinear
      ? formatQuantity(element.lengthM!)
      : isCoveringArea
        ? formatQuantity(element.areaM2!)
        : formatQuantity(element.volumeM3),
    rawPrice: "",
    rawWastePercent: "0",
    formulaJson,
  };
}

function buildFindings(element: ParsedIfcElement, validationFindings: Finding[]): Finding[] {
  const findings = [...validationFindings];
  if (element.smartCheckNote?.includes("IFC_QUANTITY_CONFLICT")) {
    findings.push({ code: "IFC_QUANTITY_CONFLICT", severity: "high", message: element.smartCheckNote,
      ruleVersion: "ifc-evidence-v1", suggestion: "Net/gross ve alternatif miktar kaynaklarını inceleyip ölçüm esasını doğrulayın." });
  }
  if (element.storeySource !== "ifc_spatial") {
    findings.push({
      code: "IFC_SPATIAL_SOURCE_MISSING",
      severity: "medium",
      message: "Kat bilgisi IFC spatial containment yerine tahmini kaynaktan geliyor.",
      ruleVersion: "ifc-evidence-v1",
      suggestion: "IfcRelContainedInSpatialStructure / IfcBuildingStorey ilişkisini doğrulayın veya reviewer notu ile istisna girin.",
    });
  }
  if (!element.quantitySourcePath) {
    findings.push({
      code: "IFC_QUANTITY_SOURCE_PATH_MISSING",
      severity: "high",
      message: "IFC miktarı için STEP kaynak yolu eksik.",
      ruleVersion: "ifc-evidence-v1",
      suggestion: "Miktarın hangi QTO/property set ve STEP satırından geldiğini kaydedin.",
    });
  }
  return findings;
}

function blockElement(element: ParsedIfcElement): IfcBlockedEvidenceElement {
  if (element.type === "IfcReinforcingBar") {
    return {
      elementId: element.id,
      globalId: element.guid,
      elementType: element.type,
      code: "IFC_REBAR_EVIDENCE_POLICY_PENDING",
      reason: "Rebar evidence requires a positive direct Weight/Mass value from IfcQuantityWeight or an attributable IFC property path; zero, nominal-derived, estimated, or unattributed quantities remain blocked.",
      sourceReference: element.quantitySourcePath ?? `IFC#${element.id}`,
      sourceIdentity: element.sourceIdentity,
    };
  }
  if (element.quantitySource === "geometry") {
    return {
      elementId: element.id,
      globalId: element.guid,
      elementType: element.type,
      code: "IFC_GEOMETRY_FALLBACK_BLOCKED",
      reason: "Geometry-derived IFC quantities are blocked until deterministic unit handling, opening deductions, net/gross rules, tolerance limits, and reviewer evidence are implemented.",
      sourceReference: element.quantitySourcePath ?? `IFC#${element.id}`,
      sourceIdentity: element.sourceIdentity,
    };
  }
  return {
    elementId: element.id,
    globalId: element.guid,
    elementType: element.type,
    code: "IFC_ESTIMATE_QUANTITY_BLOCKED",
    reason: "Demo/estimated IFC quantities are not admitted into SmartCheck evidence rows without QTO, approved property, geometry, or reviewer-backed source evidence.",
    sourceReference: `IFC#${element.id}`,
    sourceIdentity: element.sourceIdentity,
  };
}

function resolveAuthoringSoftware(summary: IfcParseSummary): AuthoringSoftwareDetection | undefined {
  if (summary.authoringSoftware) return summary.authoringSoftware;
  if (summary.authoringSoftwareRaw) return classifyAuthoringSoftware(summary.authoringSoftwareRaw);
  return undefined;
}

export function buildIfcSmartCheckEvidenceArtifact(
  elements: ParsedIfcElement[],
  summary: IfcParseSummary,
  document: IfcEvidenceDocumentContext,
): IfcSmartCheckEvidenceArtifact {
  const qualityGateBlocked = summary.parserContract?.qualityGate.passed === false;
  if (summary.parseStatus !== "succeeded" || qualityGateBlocked) {
    return {
      schemaVersion: 1,
      kind: "ifc_smartcheck_quantity_evidence",
      document,
      summary: {
        parseStatus: summary.parseStatus,
        extractionMode: summary.extractionMode,
        totalElements: summary.totalElements,
        evidenceRowCount: 0,
        blockedElementCount: elements.length,
        qtoQuantityCount: 0,
        propertyQuantityCount: 0,
        geometryBlockedCount: 0,
        rebarBlockedCount: 0,
        formworkEstimateBlockedCount: 0,
        spatiallyAssignedEvidenceRowCount: 0,
        elementsWithPozNoCount: summary.elementsWithPozNoCount,
        elementsMissingPozNoCount: summary.elementsMissingPozNoCount,
        trPsetCsb: summary.trPsetCsb,
        authoringSoftware: resolveAuthoringSoftware(summary),
        openings: summary.openings,
        consistencyReport: summary.consistencyReport,
        parserContract: summary.parserContract,
      },
      rows: [],
      blockedElements: elements.map((element) => ({
        ...blockElement(element),
        code: qualityGateBlocked ? "IFC_QUALITY_GATE_BLOCKED" : "IFC_PARSE_FAILED",
        reason: qualityGateBlocked
          ? `IFC quality gate failed (${summary.parserContract?.qualityGate.blockingFindingCodes.join(", ") || "invalid quantity evidence"}); no SmartCheck evidence rows can be admitted.`
          : "IFC parsing failed; no SmartCheck evidence rows can be admitted.",
      })),
    };
  }

  const evidenceElements = elements.filter(
    (element) =>
      (element.quantitySource === "qto" || element.quantitySource === "property") &&
      (element.type === "IfcReinforcingBar"
        ? isSourceBackedRebar(element)
        : element.volumeM3 > 0 || (element.type === "IfcCovering" && (element.areaM2 ?? 0) > 0)),
  );
  const parsedRows = evidenceElements.map((element, index) => buildParsedQuantityRow(element, index + 1));
  const validatedRows = validateRows(parsedRows);
  const rows = evidenceElements.map((element, index): IfcSmartCheckEvidenceRow => {
    const validated = validatedRows[index];
    return {
      ...validated.row,
      normalizedDescription: validated.normalized.description,
      normalizedPositionCode: validated.normalized.positionCode,
      normalizedUnit: validated.normalized.unit,
      normalizedQuantity: validated.normalized.quantity?.toString() ?? null,
      normalizedPrice: validated.normalized.price?.toString() ?? null,
      normalizedWastePercent: validated.normalized.wastePercent.toString(),
      quantitySource: element.quantitySource === "qto" ? "ifc_qto" : "ifc_property",
      priceSource: "manual_required",
      mappingConfidence: (element.quantityConfidence ?? 0.8).toFixed(2),
      reviewStatus: "pending_review",
      findingsJson: buildFindings(element, validated.findings),
      sourceIdentity: element.sourceIdentity,
    };
  });

  const evidenceIds = new Set(evidenceElements.map((element) => element.id));
  const blockedElements = elements
    .filter((element) => !evidenceIds.has(element.id))
    .map(blockElement);

  return {
    schemaVersion: 1,
    kind: "ifc_smartcheck_quantity_evidence",
    document,
    summary: {
      parseStatus: summary.parseStatus,
      extractionMode: summary.extractionMode,
      totalElements: summary.totalElements,
      evidenceRowCount: rows.length,
      blockedElementCount: blockedElements.length,
      qtoQuantityCount: evidenceElements.filter((element) => element.quantitySource === "qto").length,
      propertyQuantityCount: evidenceElements.filter((element) => element.quantitySource === "property").length,
      geometryBlockedCount: blockedElements.filter((element) => element.code === "IFC_GEOMETRY_FALLBACK_BLOCKED").length,
      rebarBlockedCount: blockedElements.filter((element) => element.code === "IFC_REBAR_EVIDENCE_POLICY_PENDING").length,
      formworkEstimateBlockedCount: elements.filter((element) => element.formworkM2 > 0).length,
      spatiallyAssignedEvidenceRowCount: evidenceElements.filter((element) => element.storeySource === "ifc_spatial").length,
      elementsWithPozNoCount: summary.elementsWithPozNoCount,
      elementsMissingPozNoCount: summary.elementsMissingPozNoCount,
      trPsetCsb: summary.trPsetCsb,
      authoringSoftware: resolveAuthoringSoftware(summary),
      openings: summary.openings,
      consistencyReport: summary.consistencyReport,
      parserContract: summary.parserContract,
    },
    rows,
    blockedElements,
  };
}

