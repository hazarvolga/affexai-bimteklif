/**
 * Contractual Opening Deduction (Minha), Reveal Addition (Merkez/Denizlik),
 * and Structural Concrete/Formwork Intersection Engine.
 *
 * Implements the two primary measurement standards used in Turkish & international
 * construction tenders:
 * - CSB_2026: ÇŞB Genel Teknik Şartnamesi (<= 0.50 m² openings not deducted for
 *   plaster/paint; > 0.50 m² deducted with reveal/return surfaces added back).
 * - DIN_18350: VOB/C DIN 18350 (<= 2.50 m² openings not deducted; > 2.50 m² deducted).
 */

export type MeasurementStandard = "CSB_2026" | "DIN_18350";

export interface OpeningInput {
  id?: string;
  widthM: number;
  heightM: number;
  count?: number;
  /** Reveal / wall return depth in meters (default: wallThicknessM or 0.15 m). */
  revealDepthM?: number;
  /** True if all 4 sides have plaster/paint reveal; false if 3 sides (e.g. door without bottom threshold plaster). */
  fourSidedReveal?: boolean;
}

export interface OpeningEvaluationItem {
  id: string;
  singleAreaM2: number;
  count: number;
  totalOpeningAreaM2: number;
  thresholdM2: number;
  deducted: boolean;
  deductedAreaM2: number;
  addedRevealAreaM2: number;
  explanation: string;
}

export interface PlasterPaintMinhaInput {
  grossAreaM2: number;
  openings: OpeningInput[];
  standard?: MeasurementStandard;
  wallThicknessM?: number;
  includeRevealOnDeducted?: boolean;
}

export interface PlasterPaintMinhaResult {
  ruleVersion: "minha-2026.1";
  standard: MeasurementStandard;
  thresholdM2: number;
  grossAreaM2: number;
  totalOpeningAreaM2: number;
  deductedOpeningAreaM2: number;
  nonDeductedOpeningAreaM2: number;
  addedRevealAreaM2: number;
  netPayableAreaM2: number;
  items: OpeningEvaluationItem[];
}

export interface StructuralIntersectionInput {
  elementType: "column" | "beam" | "slab" | "wall";
  widthM: number;
  depthM: number;
  lengthOrHeightM: number;
  count?: number;
  /** Optional intersecting concrete volume (e.g. beam-column node already counted in slab/column). */
  intersectionDeductionVolumeM3?: number;
  /** Optional intersecting formwork contact area (e.g. slab-beam soffit contact). */
  intersectionDeductionFormworkM2?: number;
  /** Rebar ratio kg/m3 override. */
  rebarRatioKgPerM3?: number;
}

export interface StructuralTakeoffResult {
  elementType: StructuralIntersectionInput["elementType"];
  grossConcreteM3: number;
  netConcreteM3: number;
  grossFormworkM2: number;
  netFormworkM2: number;
  estimatedRebarTon: number;
  hierarchyNote: string;
}

const DEFAULT_REBAR_KG_M3: Record<StructuralIntersectionInput["elementType"], number> = {
  column: 150,
  beam: 130,
  slab: 90,
  wall: 110,
};

function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10_000) / 10_000;
}

export function evaluatePlasterPaintMinha(input: PlasterPaintMinhaInput): PlasterPaintMinhaResult {
  const standard: MeasurementStandard = input.standard ?? "CSB_2026";
  const thresholdM2 = standard === "DIN_18350" ? 2.5 : 0.5;
  const defaultRevealDepthM =
    typeof input.wallThicknessM === "number" && input.wallThicknessM > 0
      ? input.wallThicknessM
      : 0.15;
  const includeReveal = input.includeRevealOnDeducted ?? standard === "CSB_2026";
  const grossAreaM2 = Math.max(0, Number(input.grossAreaM2) || 0);

  let totalOpeningAreaM2 = 0;
  let deductedOpeningAreaM2 = 0;
  let nonDeductedOpeningAreaM2 = 0;
  let addedRevealAreaM2 = 0;

  const items: OpeningEvaluationItem[] = (input.openings ?? []).map((op, idx) => {
    const widthM = Math.max(0, Number(op.widthM) || 0);
    const heightM = Math.max(0, Number(op.heightM) || 0);
    const count = Math.max(1, Math.floor(Number(op.count) || 1));
    const singleAreaM2 = round4(widthM * heightM);
    const totalArea = round4(singleAreaM2 * count);
    totalOpeningAreaM2 = round4(totalOpeningAreaM2 + totalArea);

    const deducted = singleAreaM2 > thresholdM2;
    const revealDepth =
      typeof op.revealDepthM === "number" && op.revealDepthM >= 0
        ? op.revealDepthM
        : defaultRevealDepthM;
    const perimeterForReveal = op.fourSidedReveal
      ? 2 * (widthM + heightM)
      : widthM + 2 * heightM;

    if (!deducted) {
      nonDeductedOpeningAreaM2 = round4(nonDeductedOpeningAreaM2 + totalArea);
      return {
        id: op.id ?? `OP-${idx + 1}`,
        singleAreaM2,
        count,
        totalOpeningAreaM2: totalArea,
        thresholdM2,
        deducted: false,
        deductedAreaM2: 0,
        addedRevealAreaM2: 0,
        explanation: `${standard} uyarınca tekil boşluk alanı (${singleAreaM2.toFixed(2)} m²) <= ${thresholdM2.toFixed(2)} m² olduğundan minha edilmez; denizlik/merkez ayrıca eklenmez.`,
      };
    }

    const revealArea = includeReveal ? round4(perimeterForReveal * revealDepth * count) : 0;
    deductedOpeningAreaM2 = round4(deductedOpeningAreaM2 + totalArea);
    addedRevealAreaM2 = round4(addedRevealAreaM2 + revealArea);

    return {
      id: op.id ?? `OP-${idx + 1}`,
      singleAreaM2,
      count,
      totalOpeningAreaM2: totalArea,
      thresholdM2,
      deducted: true,
      deductedAreaM2: totalArea,
      addedRevealAreaM2: revealArea,
      explanation: `${standard} uyarınca tekil boşluk alanı (${singleAreaM2.toFixed(2)} m²) > ${thresholdM2.toFixed(2)} m² olduğundan ${totalArea.toFixed(2)} m² minha edildi${revealArea > 0 ? ` ve ${revealArea.toFixed(2)} m² merkez/yan yüz eklendi` : ""}.`,
    };
  });

  const netPayableAreaM2 = round4(
    Math.max(0, grossAreaM2 - deductedOpeningAreaM2 + addedRevealAreaM2),
  );

  return {
    ruleVersion: "minha-2026.1",
    standard,
    thresholdM2,
    grossAreaM2: round4(grossAreaM2),
    totalOpeningAreaM2,
    deductedOpeningAreaM2,
    nonDeductedOpeningAreaM2,
    addedRevealAreaM2,
    netPayableAreaM2,
    items,
  };
}

/**
 * Evaluates reinforced concrete volume, formwork area, and rebar tonnage
 * respecting the Turkish/ÇŞB structural node hierarchy:
 * Slab (Döşeme) continuous -> Beam (Kiriş) web below slab -> Column/Wall (Kolon/Perde) clear height.
 */
export function evaluateStructuralIntersectionTakeoff(
  input: StructuralIntersectionInput,
): StructuralTakeoffResult {
  const w = Math.max(0, Number(input.widthM) || 0);
  const d = Math.max(0, Number(input.depthM) || 0);
  const l = Math.max(0, Number(input.lengthOrHeightM) || 0);
  const count = Math.max(1, Math.floor(Number(input.count) || 1));

  const grossConcreteM3 = round4(w * d * l * count);
  let grossFormworkM2 = 0;
  let hierarchyNote = "";

  if (input.elementType === "column" || input.elementType === "wall") {
    grossFormworkM2 = round4(2 * (w + d) * l * count);
    hierarchyNote =
      "Kolon/Perde betonu döşeme alt kotuna kadar tam ölçülür; kalıpta kiriş birleşim düğüm yüzeyleri düşülür.";
  } else if (input.elementType === "beam") {
    // Beam soffit + 2 side cheeks (top is cast monolithically with slab)
    grossFormworkM2 = round4((w + 2 * d) * l * count);
    hierarchyNote =
      "Kiriş betonu döşeme kalınlığı düşülmüş sarkma yüksekliği üzerinden (veya birleşim hacmi düşülerek) hesaplanır; üst yüzey kalıbı alınmaz.";
  } else {
    // Slab soffit + perimeter edge formwork
    grossFormworkM2 = round4((w * l + 2 * (w + l) * d) * count);
    hierarchyNote =
      "Döşeme betonu tam plak kalınlığı üzerinden ölçülür; kiriş oturma şeritleri kalıp alanından minha edilir.";
  }

  const deductVol = Math.max(0, Number(input.intersectionDeductionVolumeM3) || 0);
  const deductForm = Math.max(0, Number(input.intersectionDeductionFormworkM2) || 0);

  const netConcreteM3 = round4(Math.max(0, grossConcreteM3 - deductVol));
  const netFormworkM2 = round4(Math.max(0, grossFormworkM2 - deductForm));
  const ratio =
    typeof input.rebarRatioKgPerM3 === "number" && input.rebarRatioKgPerM3 >= 0
      ? input.rebarRatioKgPerM3
      : DEFAULT_REBAR_KG_M3[input.elementType];
  const estimatedRebarTon = round4((netConcreteM3 * ratio) / 1000);

  return {
    elementType: input.elementType,
    grossConcreteM3,
    netConcreteM3,
    grossFormworkM2,
    netFormworkM2,
    estimatedRebarTon,
    hierarchyNote,
  };
}

export interface BeamSlabIntersectionGeometryInput {
  beamWidthM: number;
  beamTotalHeightM: number;
  slabThicknessM: number;
  beamClearSpanM: number;
  count?: number;
}

export interface BeamSlabIntersectionGeometryResult {
  webHeightM: number;
  grossBeamVolumeM3: number;
  slabIntersectionVolumeDeductionM3: number;
  netBeamWebVolumeM3: number;
  netBeamFormworkM2: number;
  columnSeatFormworkDeductionM2: number;
  slabSoffitStripDeductionM2: number;
}

/**
 * Computes deterministic beam-slab-column node intersection deductions from section geometry
 * (matching `eng_calc.py` `betonarme_metraj` and ÇŞB Genel Teknik Şartnamesi hierarchy:
 * Slab continuous -> Beam web height h_w = h - t_slab -> Column seat pocket 2 * b * h_w).
 */
export function computeBeamSlabIntersectionDeduction(
  input: BeamSlabIntersectionGeometryInput,
): BeamSlabIntersectionGeometryResult {
  const b = Math.max(0, Number(input.beamWidthM) || 0);
  const h = Math.max(0, Number(input.beamTotalHeightM) || 0);
  const tSlab = Math.max(0, Math.min(h, Number(input.slabThicknessM) || 0));
  const ln = Math.max(0, Number(input.beamClearSpanM) || 0);
  const count = Math.max(1, Math.floor(Number(input.count) || 1));

  const webHeightM = round4(Math.max(0, h - tSlab));
  const grossBeamVolumeM3 = round4(b * h * ln * count);
  const slabIntersectionVolumeDeductionM3 = round4(b * tSlab * ln * count);
  const netBeamWebVolumeM3 = round4(b * webHeightM * ln * count);
  const netBeamFormworkM2 = round4((b + 2 * webHeightM) * ln * count);
  const columnSeatFormworkDeductionM2 = round4(2 * b * webHeightM * count);
  const slabSoffitStripDeductionM2 = round4(b * ln * count);

  return {
    webHeightM,
    grossBeamVolumeM3,
    slabIntersectionVolumeDeductionM3,
    netBeamWebVolumeM3,
    netBeamFormworkM2,
    columnSeatFormworkDeductionM2,
    slabSoffitStripDeductionM2,
  };
}

