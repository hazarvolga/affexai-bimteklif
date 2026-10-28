import type { ParsedIfcElement } from "../types";
import { isIfcGeometryQuantity } from "../evidence-policy";

export type IfcParserEngine = "browser" | "worker";
export type IfcSchemaFamily = "IFC2X3" | "IFC4" | "IFC4X3";
export type IfcQuantityDimension = "volume" | "area" | "length" | "mass" | "none";

export interface IfcParserCapabilitySet {
  qtoPriority: boolean;
  independentUnits: boolean;
  typeInheritance: boolean;
  aggregateSuppression: boolean;
  materialLayers: boolean;
  geometryFallback: boolean;
}

export const IFC_PARSER_CAPABILITIES: Readonly<Record<IfcParserEngine, Readonly<IfcParserCapabilitySet>>> = Object.freeze({
  browser: Object.freeze({
    qtoPriority: true,
    independentUnits: false,
    typeInheritance: false,
    aggregateSuppression: false,
    materialLayers: false,
    geometryFallback: false,
  }),
  worker: Object.freeze({
    qtoPriority: true,
    independentUnits: true,
    typeInheritance: true,
    aggregateSuppression: true,
    materialLayers: true,
    geometryFallback: true,
  }),
});

export interface IfcElementIdentityInput {
  fileSha256: string;
  runId: string;
  stepId: string;
  globalId: string;
}

export interface IfcElementIdentity extends IfcElementIdentityInput {
  elementKey: string;
}

export interface NormalizedIfcQuantityEvidence {
  dimension: IfcQuantityDimension;
  value: number | null;
  unit: "m3" | "m2" | "m" | "kg" | null;
  source: ParsedIfcElement["quantitySource"];
  sourcePath: string | null;
  confidence: number | null;
}

export interface NormalizedIfcParityElement {
  identity: IfcElementIdentity;
  ifcClass: string;
  name: string;
  storey: string;
  storeySource: ParsedIfcElement["storeySource"];
  quantity: NormalizedIfcQuantityEvidence;
  inheritedFromType: boolean;
}

function assertIdentityPart(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`IFC_IDENTITY_INVALID: ${label} is required`);
  if (label === "fileSha256" && !/^[a-f0-9]{64}$/i.test(normalized)) {
    throw new Error("IFC_IDENTITY_INVALID: fileSha256 must be a SHA-256 hex digest");
  }
  return normalized;
}

export function buildIfcElementIdentity(input: IfcElementIdentityInput): IfcElementIdentity {
  const fileSha256 = assertIdentityPart(input.fileSha256, "fileSha256").toLowerCase();
  const runId = assertIdentityPart(input.runId, "runId");
  const stepId = assertIdentityPart(input.stepId.replace(/^#/, ""), "stepId");
  const globalId = assertIdentityPart(input.globalId, "globalId");
  return Object.freeze({
    fileSha256,
    runId,
    stepId,
    globalId,
    elementKey: `${fileSha256}:${runId}:#${stepId}`,
  });
}

function quantityEvidence(element: ParsedIfcElement): NormalizedIfcQuantityEvidence {
  const source = isIfcGeometryQuantity(element) ? "geometry" : element.quantitySource;
  if (element.type === "IfcCovering" && (element.coveringPredefinedType === "SKIRTINGBOARD" || /süpürgelik/i.test(element.name)) && Number.isFinite(element.lengthM) && (element.lengthM ?? 0) > 0) {
    return { dimension: "length", value: element.lengthM!, unit: "m", source, sourcePath: element.quantitySourcePath ?? null, confidence: element.quantityConfidence ?? null };
  }
  if (element.type === "IfcCovering" && Number.isFinite(element.areaM2) && (element.areaM2 ?? 0) > 0) {
    return { dimension: "area", value: element.areaM2!, unit: "m2", source, sourcePath: element.quantitySourcePath ?? null, confidence: element.quantityConfidence ?? null };
  }
  if (element.type === "IfcCovering" && Number.isFinite(element.lengthM) && (element.lengthM ?? 0) > 0) {
    return { dimension: "length", value: element.lengthM!, unit: "m", source, sourcePath: element.quantitySourcePath ?? null, confidence: element.quantityConfidence ?? null };
  }
  if (element.type === "IfcReinforcingBar" && Number.isFinite(element.rebarKg) && element.rebarKg > 0) {
    return { dimension: "mass", value: element.rebarKg, unit: "kg", source, sourcePath: element.quantitySourcePath ?? null, confidence: element.quantityConfidence ?? null };
  }
  if (Number.isFinite(element.volumeM3) && element.volumeM3 > 0) {
    return { dimension: "volume", value: element.volumeM3, unit: "m3", source, sourcePath: element.quantitySourcePath ?? null, confidence: element.quantityConfidence ?? null };
  }
  return { dimension: "none", value: null, unit: null, source, sourcePath: element.quantitySourcePath ?? null, confidence: element.quantityConfidence ?? null };
}

function normalizeStoreyLabel(value: string): string {
  return value.trim().replace(/\((-?\d+(?:\.\d+)?)\s*m\)$/i, (_, elevation: string) => `(${Number(elevation)} m)`);
}

export function normalizeIfcElementsForParity(
  elements: readonly ParsedIfcElement[],
  context: { engine: IfcParserEngine; fileSha256: string; runId: string },
): { elements: NormalizedIfcParityElement[]; requiresWorker: boolean; unsupportedReasons: string[] } {
  const capabilities = IFC_PARSER_CAPABILITIES[context.engine];
  const unsupportedReasons = context.engine === "browser"
    ? [
        "Browser parser does not resolve independent area, volume, mass and length units.",
        "Browser parser does not support IFC type inheritance.",
        "Browser parser does not suppress aggregate children with quantified parents.",
        "Browser parser does not provide material-layer or geometry fallback evidence.",
      ]
    : [];

  return {
    elements: elements.map((element) => ({
      identity: buildIfcElementIdentity({ fileSha256: context.fileSha256, runId: context.runId, stepId: element.id, globalId: element.guid }),
      ifcClass: element.ifcClass ?? element.type,
      name: element.name,
      storey: normalizeStoreyLabel(element.storey),
      storeySource: element.storeySource,
      quantity: quantityEvidence(element),
      inheritedFromType: element.inheritedFromType === true,
    })),
    requiresWorker: !Object.values(capabilities).every(Boolean),
    unsupportedReasons,
  };
}

export function normalizeIfcSchemaFamily(schema: string): IfcSchemaFamily | null {
  const value = schema.trim().toUpperCase().replace(/[-_]/g, "");
  if (["IFC2X3", "IFC2X3TC1", "IFC2X3TC2"].includes(value)) return "IFC2X3";
  if (["IFC4X3", "IFC4X3ADD1", "IFC4X3ADD2"].includes(value)) return "IFC4X3";
  if (["IFC4", "IFC4ADD1", "IFC4ADD2", "IFC4X1", "IFC4X2"].includes(value)) return "IFC4";
  return null;
}

export interface IfcQualityGateResult {
  passed: boolean;
  schemaFamily: IfcSchemaFamily | null;
  blockingReasons: string[];
  blockingFindingCodes: string[];
  measuredCount: number;
  unmeasuredCount: number;
  excludedElementCount: number;
  suppressedAssemblyPartCount: number;
  totals: { volumeM3: number; areaM2: number; lengthM: number; massKg: number; formworkAreaM2: number };
}

export function evaluateIfcQualityGate(input: {
  schema: string;
  elements: readonly ParsedIfcElement[];
  excludedElementCount: number;
  suppressedAssemblyPartCount: number;
  findings?: ReadonlyArray<{ code: string; severity: "high" | "medium" }>;
}): IfcQualityGateResult {
  const schemaFamily = normalizeIfcSchemaFamily(input.schema);
  const blockingReasons: string[] = [];
  const blockingFindingCodes = new Set(
    (input.findings ?? []).filter((finding) => finding.severity === "high").map((finding) => finding.code),
  );
  if (!schemaFamily) blockingReasons.push(`Unsupported IFC schema: ${input.schema}`);
  if (!Number.isInteger(input.excludedElementCount) || input.excludedElementCount < 0) blockingReasons.push("Excluded element count is invalid.");
  if (!Number.isInteger(input.suppressedAssemblyPartCount) || input.suppressedAssemblyPartCount < 0) blockingReasons.push("Suppressed assembly part count is invalid.");

  const totals = { volumeM3: 0, areaM2: 0, lengthM: 0, massKg: 0, formworkAreaM2: 0 };
  let measuredCount = 0;
  let unmeasuredCount = 0;
  for (const element of input.elements) {
    const values = [element.volumeM3, element.areaM2 ?? 0, element.lengthM ?? 0, element.rebarKg, element.formworkM2];
    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
      blockingReasons.push(`Element #${element.id} contains a negative or non-finite quantity.`);
      continue;
    }
    totals.volumeM3 += element.volumeM3;
    totals.areaM2 += element.areaM2 ?? 0;
    totals.lengthM += element.lengthM ?? 0;
    totals.massKg += element.rebarKg;
    totals.formworkAreaM2 += element.formworkM2;
    const quantity = quantityEvidence(element);
    if (quantity.dimension === "none") {
      unmeasuredCount += 1;
      blockingFindingCodes.add("MISSING_NET_QUANTITY");
      if (element.measured === true || element.measurementStatus === "ölçüldü") {
        blockingReasons.push(`Element #${element.id} is marked measured without a positive quantity.`);
      }
    } else {
      measuredCount += 1;
      if (element.measured === false || element.measurementStatus === "ölçülemedi") {
        blockingReasons.push(`Element #${element.id} has a positive quantity but is marked unmeasured.`);
      }
    }
  }

  return {
    passed: blockingReasons.length === 0 && blockingFindingCodes.size === 0,
    schemaFamily,
    blockingReasons,
    blockingFindingCodes: [...blockingFindingCodes].sort(),
    measuredCount,
    unmeasuredCount,
    excludedElementCount: input.excludedElementCount,
    suppressedAssemblyPartCount: input.suppressedAssemblyPartCount,
    totals: {
      volumeM3: Number(totals.volumeM3.toFixed(12)),
      areaM2: Number(totals.areaM2.toFixed(12)),
      lengthM: Number(totals.lengthM.toFixed(12)),
      massKg: Number(totals.massKg.toFixed(12)),
      formworkAreaM2: Number(totals.formworkAreaM2.toFixed(12)),
    },
  };
}
