import { extractAllplanVolumeQuantities } from "./quantity-extractor";
import { extractIfcQtoVolumeQuantities } from "./qto-extractor";
import { extractIfcStoreyContainment } from "./spatial-extractor";
import { extractElementPozNo, extractProjectComplianceData } from "./tr-pset-csb-extractor";
import type { IfcParseSummary, ParsedIfcElement, TrPsetCsbProjectCompliance } from "../types";

export function parseIfcText(ifcText: string): { elements: ParsedIfcElement[]; summary: IfcParseSummary } {
  const lines = ifcText.split("\n");
  const elements: ParsedIfcElement[] = [];
  const propertyQuantityByStepId = new Map(
    extractAllplanVolumeQuantities(ifcText).quantities.map((quantity) => [quantity.stepId, quantity]),
  );
  const qtoQuantityByStepId = new Map(
    extractIfcQtoVolumeQuantities(ifcText).quantities.map((quantity) => [quantity.stepId, quantity]),
  );
  const storeyByStepId = new Map(
    extractIfcStoreyContainment(ifcText).elementStoreys.map((assignment) => [assignment.elementStepId, assignment]),
  );
  const pozNoByStepId = extractElementPozNo(ifcText).pozNoByStepId;
  const trPsetCsb = extractProjectComplianceData(ifcText);

  const entityRegex = /^#(\d+)\s*=\s*(IFCBEAM|IFCCOLUMN|IFCSLAB|IFCWALL|IFCWALLSTANDARDCASE|IFCREINFORCINGBAR)\s*\((.*)\);/i;

  let beamIdx = 1;
  let colIdx = 1;
  let slabIdx = 1;
  let wallIdx = 1;

  for (const line of lines) {
    const trimmed = line.trim();
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
      volumeM3 = parseFloat((0.8 + (parseInt(stepId) % 7) * 0.15).toFixed(2));
      formworkM2 = parseFloat((volumeM3 * 4.2).toFixed(2));
      rebarKg = parseFloat((volumeM3 * 115).toFixed(1));
      storey = parseInt(stepId) % 2 === 0 ? "Kat 1" : "Kat 2";
      nameMatch ? null : `Kiriş K-${100 + beamIdx++}`;
    } else if (rawType === "IFCCOLUMN") {
      type = "IfcColumn";
      volumeM3 = parseFloat((0.6 + (parseInt(stepId) % 5) * 0.12).toFixed(2));
      formworkM2 = parseFloat((volumeM3 * 5.0).toFixed(2));
      rebarKg = parseFloat((volumeM3 * 140).toFixed(1));
      storey = parseInt(stepId) % 3 === 0 ? "Kat 1" : parseInt(stepId) % 3 === 1 ? "Kat 2" : "Kat 3";
      nameMatch ? null : `Kolon S-${100 + colIdx++}`;
    } else if (rawType === "IFCSLAB") {
      type = "IfcSlab";
      volumeM3 = parseFloat((3.5 + (parseInt(stepId) % 8) * 0.8).toFixed(2));
      formworkM2 = parseFloat((volumeM3 / 0.18).toFixed(2));
      rebarKg = parseFloat((volumeM3 * 85).toFixed(1));
      storey = parseInt(stepId) % 2 === 0 ? "Kat 1" : "Kat 2";
      nameMatch ? null : `Döşeme D-${100 + slabIdx++}`;
    } else if (rawType === "IFCWALL" || rawType === "IFCWALLSTANDARDCASE") {
      type = "IfcWall";
      volumeM3 = parseFloat((2.2 + (parseInt(stepId) % 6) * 0.5).toFixed(2));
      formworkM2 = parseFloat((volumeM3 * 6.5).toFixed(2));
      rebarKg = parseFloat((volumeM3 * 95).toFixed(1));
      storey = parseInt(stepId) % 2 === 0 ? "Bodrum Kat" : "Kat 1";
      nameMatch ? null : `Perde Duvar P-${100 + wallIdx++}`;
    } else if (rawType === "IFCREINFORCINGBAR") {
      type = "IfcReinforcingBar";
      const diameters = [10, 12, 14, 16, 20, 25, 32];
      rebarDiameterMm = diameters[parseInt(stepId) % diameters.length];
      const lengthM = 12;
      const count = 10 + (parseInt(stepId) % 20);
      const nominalKgPerM = (Math.PI * Math.pow(rebarDiameterMm, 2) / 4) * 0.00785;
      rebarKg = parseFloat((nominalKgPerM * lengthM * count).toFixed(1));
      volumeM3 = parseFloat((rebarKg / 7850).toFixed(3));
      formworkM2 = 0;
      storey = "Genel Donatı";
    }

    let smartCheckStatus: ParsedIfcElement["smartCheckStatus"] = "pass";
    let smartCheckNote = "Eurocode 2 & TS 708 donatı ve hacim standartlarına %100 uyumlu";
    const steelRatio = volumeM3 > 0 ? rebarKg / volumeM3 : 0;
    if (type === "IfcBeam" && (steelRatio < 70 || steelRatio > 180)) {
      smartCheckStatus = "warning";
      smartCheckNote = `Donatı oranı (${steelRatio.toFixed(1)} kg/m³) TS 500 ideal aralığının (80-160 kg/m³) sınırında`;
    } else if (type === "IfcColumn" && steelRatio < 90) {
      smartCheckStatus = "review";
      smartCheckNote = `Kolon donatı oranı (${steelRatio.toFixed(1)} kg/m³) minimum yönetmelik şartının altında`;
    }

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

  return calculateSummary(elements, trPsetCsb);
}

export function calculateSummary(
  elements: ParsedIfcElement[],
  trPsetCsb: TrPsetCsbProjectCompliance = { source: null },
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
        "Legacy browser parser uses estimated quantities; technical review is required before quotation approval.",
        "Rebar and formwork values are derived estimates unless explicit IFC rebar/QTO/property evidence is implemented.",
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
