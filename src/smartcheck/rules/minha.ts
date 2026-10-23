/**
 * Contractual Opening Deduction (Minha), Reveal Addition (Merkez/Denizlik),
 * and Structural Concrete/Formwork Intersection Engine.
 *
 * Implements the two sourced official measurement standards plus a user-defined
 * contractual threshold mode:
 * - CSB_2026: ÇŞB Genel Teknik Şartnamesi (<= 0.50 m² openings not deducted for
 *   plaster/paint; > 0.50 m² deducted with reveal/return surfaces added back).
 * - DIN_18350: VOB/C DIN 18350 (<= 2.50 m² openings not deducted; > 2.50 m² deducted).
 * - CUSTOM_CONTRACT: Kullanıcı Tanımlı Özel Şartname Eşiği (explicit `customThresholdM2`
 *   required from the caller; no unsourced hardcoded preset).
 */

export type MeasurementStandard = "CSB_2026" | "DIN_18350" | "CUSTOM_CONTRACT";
export type MinhaRuleProfile = MeasurementStandard;

export interface OpeningInput {
  id?: string;
  widthM: number;
  heightM: number;
  count?: number;
  /** Reveal / wall return depth in meters (default: wallThicknessM or 0.15 m). */
  revealDepthM?: number;
  /** Source path/measurement record for the reveal depth used in a line adjustment. */
  revealDepthSourceReference?: string;
  /** True if all 4 sides have plaster/paint reveal; false if 3 sides (e.g. door without bottom threshold plaster). */
  fourSidedReveal?: boolean;
  /** IFC/ölçüm kaynağındaki ev sahibi yapı elemanının kararlı kimliği. */
  hostElementId?: string;
  /** Düşümün uygulanacağı icmal satırı. Özet hesabında boş bırakılabilir. */
  targetLineId?: string;
  /** Satır içindeki bitiş katmanı; host ve satır kimliğiyle birlikte eşleşir. */
  targetFinishLayer?: string;
}

export type MinhaQuantityBasis = "gross_before_openings" | "net_after_openings" | "unknown";

export interface MinhaProfileMetadata {
  version: "minha-2026.3";
  sourceReference: string;
  effective: string;
}

export interface MinhaTargetLine {
  id: string;
  hostElementId: string;
  finishLayer: string;
  quantityBasis: MinhaQuantityBasis;
  quantityM2: number;
}

export interface MinhaLineAdjustment {
  lineId: string;
  status: "applied" | "already_net" | "unchanged" | "review_required";
  originalQuantityM2: number;
  adjustmentM2: number;
  deductedOpeningAreaM2?: number;
  addedRevealAreaM2?: number;
  resultQuantityM2: number;
  openingIds: string[];
}

export interface MinhaApplicationReviewItem {
  openingId: string;
  reason: string;
}

export interface ApplyMinhaToTargetLinesInput {
  standard: MeasurementStandard;
  customThresholdM2?: number;
  openings: OpeningInput[];
  lines: MinhaTargetLine[];
  profileEvidence?: {
    status: "user_asserted" | "verified";
    sourceReference: string;
    edition: string;
    effectiveDate: string;
    sha256: string;
  };
}

export interface ApplyMinhaToTargetLinesResult {
  profile: MinhaProfileMetadata;
  profileEvidence?: Readonly<{
    status: "verified";
    sourceReference: string;
    edition: string;
    effectiveDate: string;
    sha256: string;
  }>;
  lines: MinhaLineAdjustment[];
  reviewItems: MinhaApplicationReviewItem[];
  appliedOpeningCount: number;
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
  /** Required when standard === "CUSTOM_CONTRACT" (user-defined contractual threshold in m²). */
  customThresholdM2?: number;
  wallThicknessM?: number;
  includeRevealOnDeducted?: boolean;
}

export interface PlasterPaintMinhaResult {
  ruleVersion: "minha-2026.3";
  profile: MinhaProfileMetadata;
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

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function resolveMinhaProfileMetadata(standard: MeasurementStandard): MinhaProfileMetadata {
  if (standard === "CSB_2026") {
    return {
      version: "minha-2026.3",
      sourceReference: "ÇŞİDB Genel Teknik Şartnamesi, proje/sözleşme baskısı teyit edilmeli",
      effective: "Proje sözleşmesinde atıf yapılan yürürlükteki baskı",
    };
  }
  if (standard === "DIN_18350") {
    return {
      version: "minha-2026.3",
      sourceReference: "VOB/C DIN 18350, lisanslı proje/sözleşme baskısı teyit edilmeli",
      effective: "Proje sözleşmesinde atıf yapılan lisanslı baskı",
    };
  }
  return {
    version: "minha-2026.3",
    sourceReference: "Kullanıcının proje özel şartnamesi",
    effective: "İlgili sözleşme/revizyon süresi",
  };
}

export function evaluatePlasterPaintMinha(input: PlasterPaintMinhaInput): PlasterPaintMinhaResult {
  const standard: MeasurementStandard = input.standard ?? "CSB_2026";
  if (
    standard === "CUSTOM_CONTRACT" &&
    (typeof input.customThresholdM2 !== "number" ||
      !Number.isFinite(input.customThresholdM2) ||
      input.customThresholdM2 < 0)
  ) {
    throw new Error(
      "CUSTOM_CONTRACT minha standardı için geçerli bir customThresholdM2 (m²) değeri belirtilmelidir.",
    );
  }
  const thresholdM2 =
    standard === "CUSTOM_CONTRACT"
      ? round4(Number(input.customThresholdM2))
      : standard === "DIN_18350"
        ? 2.5
        : 0.5;
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
    ruleVersion: "minha-2026.3",
    profile: resolveMinhaProfileMetadata(standard),
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
 * Minha sonucunu özetten icmal satırına taşır. Bir boşluk yalnız benzersiz host +
 * satır + bitiş katmanı eşleşmesinde uygulanır. Net QTO ikinci kez düşülmez.
 */
export function applyMinhaToTargetLines(input: ApplyMinhaToTargetLinesInput): ApplyMinhaToTargetLinesResult {
  const profile = resolveMinhaProfileMetadata(input.standard);
  const reviewItems: MinhaApplicationReviewItem[] = [];
  const duplicateIds = new Set<string>();
  const seenIds = new Set<string>();
  for (const opening of input.openings) {
    const normalizedId = opening.id?.trim() ?? "";
    if (seenIds.has(normalizedId)) duplicateIds.add(normalizedId);
    seenIds.add(normalizedId);
  }

  const lineKey = (line: Pick<MinhaTargetLine, "id" | "hostElementId" | "finishLayer">) =>
    `${line.hostElementId.trim()}\u0000${line.id.trim()}\u0000${line.finishLayer.trim()}`;
  const duplicateLineKeys = new Set<string>();
  const seenLineKeys = new Set<string>();
  for (const line of input.lines) {
    const key = lineKey(line);
    if (seenLineKeys.has(key)) duplicateLineKeys.add(key);
    seenLineKeys.add(key);
  }

  const profileVerified = input.profileEvidence?.status === "verified"
    && Boolean(input.profileEvidence.sourceReference.trim())
    && Boolean(input.profileEvidence.edition.trim())
    && isValidIsoDate(input.profileEvidence.effectiveDate)
    && /^[a-f0-9]{64}$/i.test(input.profileEvidence.sha256.trim());
  const verifiedProfileEvidence = profileVerified && input.profileEvidence
    ? Object.freeze({
      status: "verified" as const,
      sourceReference: input.profileEvidence.sourceReference.trim(),
      edition: input.profileEvidence.edition.trim(),
      effectiveDate: input.profileEvidence.effectiveDate,
      sha256: input.profileEvidence.sha256.trim().toLowerCase(),
    })
    : undefined;
  const deductionsByLine = new Map<string, { deductedAreaM2: number; addedRevealAreaM2: number; ids: string[] }>();
  const alreadyNetByLine = new Map<string, string[]>();
  for (const opening of input.openings) {
    const openingId = opening.id?.trim() || "(kimliksiz-boşluk)";
    if (!profileVerified) {
      reviewItems.push({ openingId, reason: "Sözleşmesel ölçüm profili baskı/sürüm/artifact kimliği doğrulanmadı; otomatik uygulanmadı." });
      continue;
    }
    if (!opening.id?.trim() || duplicateIds.has(openingId)) {
      reviewItems.push({ openingId, reason: "Opening id boş veya duplicate; çift düşümü önlemek için uygulanmadı." });
      continue;
    }
    if (!opening.hostElementId?.trim() || !opening.targetLineId?.trim() || !opening.targetFinishLayer?.trim()) {
      reviewItems.push({ openingId, reason: "Host, hedef satır veya bitiş katmanı kimliği eksik; inceleme gerekli." });
      continue;
    }
    if (!Number.isFinite(opening.widthM) || !Number.isFinite(opening.heightM) || opening.widthM <= 0 || opening.heightM <= 0) {
      reviewItems.push({ openingId, reason: "Boşluk ölçüleri pozitif ve sonlu değil; inceleme gerekli." });
      continue;
    }
    const matches = input.lines.filter((line) =>
      line.id === opening.targetLineId &&
      line.hostElementId === opening.hostElementId &&
      line.finishLayer === opening.targetFinishLayer,
    );
    if (matches.length !== 1) {
      reviewItems.push({ openingId, reason: "Host/satır/bitiş katmanı eşleşmesi benzersiz değil; inceleme gerekli." });
      continue;
    }
    const line = matches[0];
    const targetKey = lineKey(line);
    if (duplicateLineKeys.has(targetKey)) {
      reviewItems.push({ openingId, reason: "Host/satır/bitiş katmanı kompozit kimliği duplicate; inceleme gerekli." });
      continue;
    }
    if (line.quantityBasis === "unknown") {
      reviewItems.push({ openingId, reason: "Hedef satırın net/brüt miktar esası bilinmiyor; inceleme gerekli." });
      continue;
    }
    const evaluated = evaluatePlasterPaintMinha({
      grossAreaM2: 0,
      standard: input.standard,
      customThresholdM2: input.customThresholdM2,
      includeRevealOnDeducted: input.standard === "CSB_2026",
      openings: [opening],
    }).items[0];
    if (line.quantityBasis === "net_after_openings") {
      alreadyNetByLine.set(targetKey, [...(alreadyNetByLine.get(targetKey) ?? []), openingId]);
      continue;
    }
    if (!evaluated.deducted) continue;
    if (input.standard === "CSB_2026" && (!Number.isFinite(opening.revealDepthM) || Number(opening.revealDepthM) < 0 || !opening.revealDepthSourceReference?.trim())) {
      reviewItems.push({ openingId, reason: "CSB minha için söve/yan yüzey derinliği ve ölçüm kaynağı doğrulanmadı; otomatik uygulanmadı." });
      continue;
    }
    const current = deductionsByLine.get(targetKey) ?? { deductedAreaM2: 0, addedRevealAreaM2: 0, ids: [] };
    deductionsByLine.set(targetKey, {
      deductedAreaM2: round4(current.deductedAreaM2 + evaluated.deductedAreaM2),
      addedRevealAreaM2: round4(current.addedRevealAreaM2 + evaluated.addedRevealAreaM2),
      ids: [...current.ids, openingId],
    });
  }

  const lines = input.lines.map((line): MinhaLineAdjustment => {
    const targetKey = lineKey(line);
    const original = round4(Math.max(0, Number(line.quantityM2) || 0));
    if (!Number.isFinite(line.quantityM2) || line.quantityM2 < 0) {
      return { lineId: line.id, status: "review_required", originalQuantityM2: original, adjustmentM2: 0, resultQuantityM2: original, openingIds: [] };
    }
    if (line.quantityBasis === "unknown") {
      return { lineId: line.id, status: "review_required", originalQuantityM2: original, adjustmentM2: 0, resultQuantityM2: original, openingIds: [] };
    }
    if (line.quantityBasis === "net_after_openings") {
      return { lineId: line.id, status: "already_net", originalQuantityM2: original, adjustmentM2: 0, resultQuantityM2: original, openingIds: alreadyNetByLine.get(targetKey) ?? [] };
    }
    const deduction = deductionsByLine.get(targetKey);
    if (!deduction) {
      const hasReview = duplicateLineKeys.has(targetKey) || reviewItems.some((item) => input.openings.some((opening) =>
        opening.id?.trim() === item.openingId
        && opening.targetLineId === line.id
        && opening.hostElementId === line.hostElementId
        && opening.targetFinishLayer === line.finishLayer));
      return { lineId: line.id, status: hasReview ? "review_required" : "unchanged", originalQuantityM2: original, adjustmentM2: 0, resultQuantityM2: original, openingIds: [] };
    }
    if (deduction.deductedAreaM2 > original + 0.0001) {
      reviewItems.push({ openingId: deduction.ids.join(","), reason: `Toplam minha (${deduction.deductedAreaM2} m²) brüt satır miktarını (${original} m²) aşıyor; uygulanmadı.` });
      return { lineId: line.id, status: "review_required", originalQuantityM2: original, adjustmentM2: 0, resultQuantityM2: original, openingIds: [] };
    }
    const adjustment = round4(-deduction.deductedAreaM2 + deduction.addedRevealAreaM2);
    return {
      lineId: line.id,
      status: "applied",
      originalQuantityM2: original,
      adjustmentM2: adjustment,
      deductedOpeningAreaM2: deduction.deductedAreaM2,
      addedRevealAreaM2: deduction.addedRevealAreaM2,
      resultQuantityM2: round4(original + adjustment),
      openingIds: deduction.ids,
    };
  });

  return {
    profile,
    profileEvidence: verifiedProfileEvidence,
    lines,
    reviewItems,
    appliedOpeningCount: lines.reduce((total, line) => total + (line.status === "applied" ? line.openingIds.length : 0), 0),
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

