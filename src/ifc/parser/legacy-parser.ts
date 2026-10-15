import { extractAllplanVolumeQuantities } from "./quantity-extractor";
import { extractIfcQtoVolumeQuantities } from "./qto-extractor";
import { extractIfcStoreyContainment } from "./spatial-extractor";
import { extractElementPozNo, extractProjectComplianceData } from "./tr-pset-csb-extractor";
import type { IfcParseSummary, ParsedIfcElement, TrPsetCsbProjectCompliance } from "../types";

function selectQuantities<T extends { stepId: string; quantityName: string; normalizedValue: number; sourcePath: string }>(items: T[]) {
  const result = new Map<string, T>();
  for (const item of [...items].sort((a,b) => Number(!/net/i.test(a.quantityName)) - Number(!/net/i.test(b.quantityName)) || a.sourcePath.localeCompare(b.sourcePath))) {
    if (!result.has(item.stepId)) result.set(item.stepId, item);
  }
  return result;
}

export function parseIfcText(ifcText: string): { elements: ParsedIfcElement[]; summary: IfcParseSummary } {
  const lines = ifcText.split("\n");
  const elements: ParsedIfcElement[] = [];
  const properties = extractAllplanVolumeQuantities(ifcText).quantities;
  const qtos = extractIfcQtoVolumeQuantities(ifcText).quantities;
  const candidatesByStepId = new Map<string, Array<{ normalizedValue: number; sourcePath: string }>>();
  for (const quantity of [...qtos, ...properties]) {
    const existing = candidatesByStepId.get(quantity.stepId);
    if (existing) existing.push(quantity);
    else candidatesByStepId.set(quantity.stepId, [quantity]);
  }
  const propertyQuantityByStepId = selectQuantities(properties);
  const qtoQuantityByStepId = selectQuantities(qtos);
  const storeyByStepId = new Map(
    extractIfcStoreyContainment(ifcText).elementStoreys.map((assignment) => [assignment.elementStepId, assignment]),
  );
  const pozNoByStepId = extractElementPozNo(ifcText).pozNoByStepId;
  const trPsetCsb = extractProjectComplianceData(ifcText);

  const entityRegex = /^#(\d+)\s*=\s*(IFCBEAM|IFCCOLUMN|IFCSLAB|IFCWALL|IFCWALLSTANDARDCASE|IFCREINFORCINGBAR)\s*\((.*)\);/i;
  const materialRegex = /^#\d+\s*=\s*IFCMATERIAL\s*\(\s*'([^']*)'/i;
  const spaceRegex = /^#\d+\s*=\s*IFCSPACE\s*\(\s*'[^']*'\s*,\s*#[0-9]+\s*,\s*'([^']*)'/i;
  const materialNamesSet = new Set<string>();
  const spaceNamesSet = new Set<string>();

  let beamIdx = 1;
  let colIdx = 1;
  let slabIdx = 1;
  let wallIdx = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    const matMatch = trimmed.match(materialRegex);
    if (matMatch && matMatch[1]) {
      materialNamesSet.add(matMatch[1].trim());
      continue;
    }
    const spMatch = trimmed.match(spaceRegex);
    if (spMatch && spMatch[1]) {
      spaceNamesSet.add(spMatch[1].trim());
      continue;
    }
    const match = trimmed.match(entityRegex);
    if (!match) continue;

    const stepId = match[1];
    const rawType = match[2].toUpperCase();
    const rawArgs = match[3];
    const guidMatch = rawArgs.match(/'([A-Za-z0-9_$]{22})'/);
    const guid = guidMatch ? guidMatch[1] : `GUID-${stepId}`;
    const nameMatch = rawArgs.match(/'([^']*)'/g);
    const name = nameMatch && nameMatch.length > 2 ? nameMatch[2].replace(/'/g, "") : `${rawType}_${stepId}`;

    let type: ParsedIfcElement["type"] = "IfcBeam";
    let volumeM3 = 0;
    let formworkM2 = 0;
    let rebarKg = 0;
    let storey = "Kat 1 (Zemin)";
    let storeySource: ParsedIfcElement["storeySource"] = "estimate";
    let storeySourcePath: string | undefined = undefined;
    let rebarDiameterMm: number | undefined = undefined;

    if (rawType === "IFCBEAM") {
      type = "IfcBeam";
      storey = "Kat 1";
    } else if (rawType === "IFCCOLUMN") {
      type = "IfcColumn";
      storey = "Kat 1";
    } else if (rawType === "IFCSLAB") {
      type = "IfcSlab";
      storey = "Kat 1";
    } else if (rawType === "IFCWALL" || rawType === "IFCWALLSTANDARDCASE") {
      type = "IfcWall";
      storey = "Kat 1";
    } else if (rawType === "IFCREINFORCINGBAR") {
      type = "IfcReinforcingBar";
      storey = "Genel Donatı";
    }

    let smartCheckStatus: ParsedIfcElement["smartCheckStatus"] = "review";
    let smartCheckNote = "QTO veya PropertySet metrajı bulunamadı; teknik inceleme gereklidir.";

    const qtoQuantity = qtoQuantityByStepId.get(stepId);
    const propertyQuantity = propertyQuantityByStepId.get(stepId);
    const explicitQuantity = qtoQuantity ?? propertyQuantity;
    if (explicitQuantity) {
      volumeM3 = explicitQuantity.normalizedValue;
      formworkM2 = 0;
      rebarKg = 0;
      smartCheckStatus = "review";
      smartCheckNote = qtoQuantity
        ? `${qtoQuantity.quantityName} ${qtoQuantity.quantitySetName} QTO kaynağından okundu; kalıp/donatı için ayrı kanıt gerekir.`
        : `${propertyQuantity?.quantityName} ${propertyQuantity?.propertySetName} property kaynağından okundu; kalıp/donatı için ayrı kanıt gerekir.`;
    }

    if (explicitQuantity) {
      const candidates = candidatesByStepId.get(stepId) ?? [];
      if (candidates.some(q => Math.abs(q.normalizedValue - volumeM3) > Math.max(1e-8, Math.abs(volumeM3) * 1e-6))) {
        smartCheckNote += ` | IFC_QUANTITY_CONFLICT: ${candidates.map(q => `${q.sourcePath}=${q.normalizedValue} m3`).sort().join('; ')}`;
      }
    }

    const storeyAssignment = storeyByStepId.get(stepId);
    if (storeyAssignment) {
      storey = storeyAssignment.storeyName;
      storeySource = "ifc_spatial";
      storeySourcePath = storeyAssignment.sourcePath;
    }

    const pozNoEntry = pozNoByStepId.get(stepId);

    elements.push({
      id: stepId,
      guid,
      type,
      name: name || `${type}_${stepId}`,
      storey,
      storeySource,
      storeySourcePath,
      volumeM3,
      formworkM2,
      rebarKg,
      rebarDiameterMm,
      quantitySource: qtoQuantity ? "qto" : propertyQuantity ? "property" : "estimate",
      quantitySourcePath: explicitQuantity?.sourcePath,
      quantityConfidence: explicitQuantity?.confidence,
      smartCheckStatus,
      smartCheckNote,
      pozNo: pozNoEntry?.value,
      pozNoSourcePath: pozNoEntry?.sourcePath,
    });
  }

  if (elements.length === 0) {
    return createFailedIfcParseResult([
      "No supported IfcBeam, IfcColumn, IfcSlab, IfcWall, or IfcReinforcingBar entities were found in the uploaded file.",
      "Synthetic demo quantities are disabled for real file uploads.",
    ]);
  }

  return calculateSummary(elements, trPsetCsb, Array.from(materialNamesSet), Array.from(spaceNamesSet));
}

export function calculateSummary(
  elements: ParsedIfcElement[],
  trPsetCsb: TrPsetCsbProjectCompliance = { source: null },
  materialNames: string[] = [],
  spaceNames: string[] = [],
): { elements: ParsedIfcElement[]; summary: IfcParseSummary } {
  let totalVolumeM3 = 0;
  let totalFormworkM2 = 0;
  let totalRebarKg = 0;
  let beamCount = 0;
  let beamVolumeM3 = 0;
  let columnCount = 0;
  let columnVolumeM3 = 0;
  let slabCount = 0;
  let slabVolumeM3 = 0;
  let wallCount = 0;
  let wallVolumeM3 = 0;
  let rebarCount = 0;
  const rebarByDiameter: Record<number, { lengthM: number; weightKg: number }> = {};

  elements.forEach((el) => {
    totalVolumeM3 += el.volumeM3;
    totalFormworkM2 += el.formworkM2;
    totalRebarKg += el.rebarKg;
    if (el.type === "IfcBeam") {
      beamCount++;
      beamVolumeM3 += el.volumeM3;
    } else if (el.type === "IfcColumn") {
      columnCount++;
      columnVolumeM3 += el.volumeM3;
    } else if (el.type === "IfcSlab") {
      slabCount++;
      slabVolumeM3 += el.volumeM3;
    } else if (el.type === "IfcWall") {
      wallCount++;
      wallVolumeM3 += el.volumeM3;
    } else if (el.type === "IfcReinforcingBar") {
      rebarCount++;
      if (el.rebarDiameterMm) {
        if (!rebarByDiameter[el.rebarDiameterMm]) rebarByDiameter[el.rebarDiameterMm] = { lengthM: 0, weightKg: 0 };
        rebarByDiameter[el.rebarDiameterMm].weightKg += el.rebarKg;
        const nominalKgPerM = (Math.PI * Math.pow(el.rebarDiameterMm, 2) / 4) * 0.00785;
        rebarByDiameter[el.rebarDiameterMm].lengthM += parseFloat((el.rebarKg / nominalKgPerM).toFixed(1));
      }
    }
  });

  return {
    elements,
    summary: {
      parseStatus: "succeeded",
      extractionMode: "demo_estimate",
      quantitySource: "estimate",
      quoteTransferStatus: "needs_review",
      warnings: [
        "Legacy ayrıştırıcı QTO veya onaylı property bulunamadığında tahmini metraj üretmez.",
        "Metrajı bulunamayan elemanlar için miktar 0 olarak atanmıştır; teknik inceleme gereklidir.",
      ],
      unsupportedReasons: [],
      totalElements: elements.length,
      totalVolumeM3: parseFloat(totalVolumeM3.toFixed(2)),
      totalFormworkM2: parseFloat(totalFormworkM2.toFixed(2)),
      totalRebarKg: parseFloat(totalRebarKg.toFixed(1)),
      totalRebarTon: parseFloat((totalRebarKg / 1000).toFixed(2)),
      beamCount,
      beamVolumeM3: parseFloat(beamVolumeM3.toFixed(2)),
      columnCount,
      columnVolumeM3: parseFloat(columnVolumeM3.toFixed(2)),
      slabCount,
      slabVolumeM3: parseFloat(slabVolumeM3.toFixed(2)),
      wallCount,
      wallVolumeM3: parseFloat(wallVolumeM3.toFixed(2)),
      rebarCount,
      rebarByDiameter,
      trPsetCsb,
      elementsWithPozNoCount: elements.filter((el) => Boolean(el.pozNo)).length,
      elementsMissingPozNoCount: elements.filter((el) => !el.pozNo).length,
      materialNames,
      spaceNames,
    },
  };
}

function createFailedIfcParseResult(unsupportedReasons: string[]): { elements: ParsedIfcElement[]; summary: IfcParseSummary } {
  return {
    elements: [],
    summary: {
      parseStatus: "failed",
      extractionMode: "demo_estimate",
      quantitySource: "estimate",
      quoteTransferStatus: "needs_review",
      warnings: ["The uploaded IFC file was not converted to quotation quantities."],
      unsupportedReasons,
      totalElements: 0,
      totalVolumeM3: 0,
      totalFormworkM2: 0,
      totalRebarKg: 0,
      totalRebarTon: 0,
      beamCount: 0,
      beamVolumeM3: 0,
      columnCount: 0,
      columnVolumeM3: 0,
      slabCount: 0,
      slabVolumeM3: 0,
      wallCount: 0,
      wallVolumeM3: 0,
      rebarCount: 0,
      rebarByDiameter: {},
      trPsetCsb: { source: null },
      elementsWithPozNoCount: 0,
      elementsMissingPozNoCount: 0,
    },
  };
}
