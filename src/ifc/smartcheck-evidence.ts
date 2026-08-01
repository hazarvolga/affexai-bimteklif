import type { Finding, ParsedQuantityRow } from "@/smartcheck/import/normalize";
import { validateRows } from "@/smartcheck/import/normalize";
import type { IfcParseSummary, ParsedIfcElement } from "./types";

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
}

export interface IfcBlockedEvidenceElement {
  elementId: string;
  globalId: string;
  elementType: ParsedIfcElement["type"];
  code: "IFC_ESTIMATE_QUANTITY_BLOCKED" | "IFC_PARSE_FAILED";
  reason: string;
  sourceReference: string;
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
    spatiallyAssignedEvidenceRowCount: number;
  };
  rows: IfcSmartCheckEvidenceRow[];
  blockedElements: IfcBlockedEvidenceElement[];
}

const POSITION_BY_TYPE: Record<ParsedIfcElement["type"], string> = {
  IfcBeam: "IFC-BEAM-CONCRETE",
  IfcColumn: "IFC-COLUMN-CONCRETE",
  IfcSlab: "IFC-SLAB-CONCRETE",
  IfcWall: "IFC-WALL-CONCRETE",
  IfcReinforcingBar: "IFC-REBAR",
};

function formatQuantity(value: number): string {
  return Number.isFinite(value) ? Number(value.toFixed(12)).toString() : "";
}

function buildParsedQuantityRow(element: ParsedIfcElement, sourceRowNumber: number): ParsedQuantityRow {
  const evidencePath = element.quantitySourcePath ?? `IFC#${element.id}`;
  return {
    sheetName: "IFC",
    sourceRowNumber,
    sourceCellRange: `IFC#${element.id}`,
    rawDescription: `${element.type} ${element.name} beton hacmi · ${element.storey} · ${evidencePath}`,
    rawPositionCode: POSITION_BY_TYPE[element.type],
    rawUnit: "m3",
    rawQuantity: formatQuantity(element.volumeM3),
    rawPrice: "",
    rawWastePercent: "0",
    formulaJson: {
      elementStepId: `#${element.id}`,
      globalId: element.guid,
      quantitySourcePath: element.quantitySourcePath ?? "",
      storeySourcePath: element.storeySourcePath ?? "",
    },
  };
}

function buildFindings(element: ParsedIfcElement, validationFindings: Finding[]): Finding[] {
  const findings = [...validationFindings];
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
  return {
    elementId: element.id,
    globalId: element.guid,
    elementType: element.type,
    code: "IFC_ESTIMATE_QUANTITY_BLOCKED",
    reason: "Demo/estimated IFC quantities are not admitted into SmartCheck evidence rows without QTO, approved property, geometry, or reviewer-backed source evidence.",
    sourceReference: `IFC#${element.id}`,
  };
}

export function buildIfcSmartCheckEvidenceArtifact(
  elements: ParsedIfcElement[],
  summary: IfcParseSummary,
  document: IfcEvidenceDocumentContext,
): IfcSmartCheckEvidenceArtifact {
  if (summary.parseStatus !== "succeeded") {
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
        spatiallyAssignedEvidenceRowCount: 0,
      },
      rows: [],
      blockedElements: elements.map((element) => ({
        ...blockElement(element),
        code: "IFC_PARSE_FAILED",
        reason: "IFC parsing failed; no SmartCheck evidence rows can be admitted.",
      })),
    };
  }

  const evidenceElements = elements.filter((element) => (element.quantitySource === "qto" || element.quantitySource === "property") && element.volumeM3 > 0);
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
      spatiallyAssignedEvidenceRowCount: evidenceElements.filter((element) => element.storeySource === "ifc_spatial").length,
    },
    rows,
    blockedElements,
  };
}
