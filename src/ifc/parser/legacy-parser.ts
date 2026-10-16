import { extractAllplanVolumeQuantities } from "./quantity-extractor";
import { extractIfcQtoVolumeQuantities } from "./qto-extractor";
import { extractIfcStoreyContainment } from "./spatial-extractor";
import { extractElementPozNo, extractProjectComplianceData } from "./tr-pset-csb-extractor";
import { normalizeStepLines, projectLengthUnitScale } from "./units";
import type { IfcParseSummary, ParsedIfcElement, TrPsetCsbProjectCompliance } from "../types";

function selectQuantities<T extends { stepId: string; quantityName: string; normalizedValue: number; sourcePath: string }>(items: T[]) {
  const result = new Map<string, T>();
  for (const item of [...items].sort((a,b) => Number(!/net/i.test(a.quantityName)) - Number(!/net/i.test(b.quantityName)) || a.sourcePath.localeCompare(b.sourcePath))) {
    if (!result.has(item.stepId)) result.set(item.stepId, item);
  }
  return result;
}

function splitTopLevelStepArgs(rawArgs: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let depth = 0;
  for (let i = 0; i < rawArgs.length; i++) {
    const ch = rawArgs[i];
    if (ch === "'") {
      if (inQuotes && rawArgs[i + 1] === "'") {
        current += "''";
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      current += ch;
    } else if (!inQuotes && ch === "(") {
      depth++;
      current += ch;
    } else if (!inQuotes && ch === ")") {
      depth = Math.max(0, depth - 1);
      current += ch;
    } else if (!inQuotes && depth === 0 && ch === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseIfcText(ifcText: string): { elements: ParsedIfcElement[]; summary: IfcParseSummary } {
  const lines = normalizeStepLines(ifcText);
  const lengthScale = projectLengthUnitScale(ifcText);
  const elements: ParsedIfcElement[] = [];
  const properties = extractAllplanVolumeQuantities(ifcText).quantities;
  const qtosRaw = extractIfcQtoVolumeQuantities(ifcText).quantities;
  const propertyQuantityByStepId = selectQuantities(properties);

  // Cross-check QTO volume against property volume (e.g., Revit BaseQuantities GrossVolume 1000x Dimensions/Volume)
  const qtos = qtosRaw.map((q) => {
    const propQ = propertyQuantityByStepId.get(q.stepId);
    if (propQ && propQ.normalizedValue > 0 && lengthScale > 0 && lengthScale < 0.1 && q.normalizedValue > propQ.normalizedValue * 500) {
      for (const p of [1, 2, 3]) {
        const scaled = q.normalizedValue * Math.pow(lengthScale, p);
        if (Math.abs(scaled - propQ.normalizedValue) / propQ.normalizedValue < 0.1) {
          return { ...q, normalizedValue: Number(scaled.toFixed(12)) };
        }
      }
    }
    return q;
  });

  const candidatesByStepId = new Map<string, Array<{ normalizedValue: number; sourcePath: string }>>();
  for (const quantity of [...qtos, ...properties]) {
    const existing = candidatesByStepId.get(quantity.stepId);
    if (existing) existing.push(quantity);
    else candidatesByStepId.set(quantity.stepId, [quantity]);
  }
  const qtoQuantityByStepId = selectQuantities(qtos);
  const storeyByStepId = new Map(
    extractIfcStoreyContainment(ifcText).elementStoreys.map((assignment) => [assignment.elementStepId, assignment]),
  );
  const pozNoByStepId = extractElementPozNo(ifcText).pozNoByStepId;
  const trPsetCsb = extractProjectComplianceData(ifcText);

  const entityRegex = /^#(\d+)\s*=\s*(IFCBEAM|IFCCOLUMN|IFCSLAB|IFCWALL|IFCWALLSTANDARDCASE|IFCWALLELEMENTEDCASE|IFCREINFORCINGBAR)\s*\((.*)\);/i;
  const materialRegex = /^#\d+\s*=\s*IFCMATERIAL\s*\(\s*'([^']*)'/i;
  const spaceRegex = /^#\d+\s*=\s*IFCSPACE\s*\(\s*'[^']*'\s*,\s*(?:#[0-9]+|\$)\s*,\s*'([^']*)'/i;
  const materialNamesSet = new Set<string>();
  const spaceNamesSet = new Set<string>();

  for (const trimmed of lines) {
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
    } else if (rawType === "IFCWALL" || rawType === "IFCWALLSTANDARDCASE" || rawType === "IFCWALLELEMENTEDCASE") {
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
    let quantitySource: ParsedIfcElement["quantitySource"] = qtoQuantity ? "qto" : propertyQuantity ? "property" : "estimate";
    let quantitySourcePath = explicitQuantity?.sourcePath;
    let quantityConfidence = explicitQuantity?.confidence;

    if (explicitQuantity) {
      volumeM3 = explicitQuantity.normalizedValue;
      formworkM2 = 0;
      rebarKg = 0;
      smartCheckStatus = "review";
      smartCheckNote = qtoQuantity
        ? `${qtoQuantity.quantityName} ${qtoQuantity.quantitySetName} QTO kaynağından okundu; kalıp/donatı için ayrı kanıt gerekir.`
        : `${propertyQuantity?.quantityName} ${propertyQuantity?.propertySetName} property kaynağından okundu; kalıp/donatı için ayrı kanıt gerekir.`;
    }

    if (type === "IfcReinforcingBar") {
      // IfcReinforcingBar attributes: (GlobalId, OwnerHistory, Name, Description, ObjectType, ObjectPlacement, Representation, Tag, SteelGrade, NominalDiameter, CrossSectionArea, BarLength, BarRole/PredefinedType, ...)
      const args = splitTopLevelStepArgs(rawArgs);
      const rawDiam = args[9] && args[9] !== "$" ? Number(args[9]) : NaN;
      const rawArea = args[10] && args[10] !== "$" ? Number(args[10]) : NaN;
      const rawLen = args[11] && args[11] !== "$" ? Number(args[11]) : NaN;
      const effScale = lengthScale > 0 ? lengthScale : 1;
      let diamMm = Number.isFinite(rawDiam) && rawDiam > 0 ? rawDiam * (rawDiam < 1 ? effScale * 1000 : 1) : NaN;
      if (!Number.isFinite(diamMm) && Number.isFinite(rawArea) && rawArea > 0) {
        const areaMm2 = rawArea < 1 ? rawArea * 1e6 : rawArea;
        diamMm = 2 * Math.sqrt(areaMm2 / Math.PI);
      }
      if (Number.isFinite(diamMm) && diamMm > 0) {
        rebarDiameterMm = Math.round(diamMm);
        if (Number.isFinite(rawLen) && rawLen > 0) {
          const lenM = rawLen > 100 && effScale === 1 ? rawLen * 0.001 : rawLen * effScale;
          const nomKgPerM = (Math.PI * Math.pow(diamMm, 2) / 4) * 0.00785;
          rebarKg = Number((nomKgPerM * lenM).toFixed(1));
          volumeM3 = Number((rebarKg / 7850).toFixed(12));
          quantitySource = "property";
          quantitySourcePath = `#${stepId}:IfcReinforcingBar/NominalAttributes`;
          quantityConfidence = 0.85;
          smartCheckNote = "IfcReinforcingBar nominal çap ve çubuk boyu özniteliklerinden hesaplandı.";
        }
      }
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
      quantitySource,
      quantitySourcePath,
      quantityConfidence,
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
      materialNames: [],
      spaceNames: [],
    },
  };
}
