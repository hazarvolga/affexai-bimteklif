import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyMinhaToTargetLines,
  computeBeamSlabIntersectionDeduction,
  evaluatePlasterPaintMinha,
  evaluateStructuralIntersectionTakeoff,
} from "./minha";

const VERIFIED_PROFILE = { status: "verified" as const, sourceReference: "Sözleşme EK-Metraj", edition: "2026.1", effectiveDate: "2026-01-01", sha256: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" };

describe("Contractual Opening Deduction (Minha) & Structural Intersection Engine", () => {
  it("applies CSB_2026 0.50 m2 threshold and adds reveal surfaces on deducted openings", () => {
    const result = evaluatePlasterPaintMinha({
      grossAreaM2: 30,
      standard: "CSB_2026",
      wallThicknessM: 0.2,
      openings: [
        // 0.40 x 1.00 = 0.40 m2 (<= 0.50 m2 -> not deducted)
        { id: "W-SMALL", widthM: 0.4, heightM: 1.0, count: 1 },
        // 1.50 x 1.50 = 2.25 m2 (> 0.50 m2 -> deducted, 3-sided reveal = (1.5 + 3.0) * 0.2 = 0.90 m2)
        { id: "W-MAIN", widthM: 1.5, heightM: 1.5, count: 1, fourSidedReveal: false },
      ],
    });

    assert.equal(result.thresholdM2, 0.5);
    assert.equal(result.nonDeductedOpeningAreaM2, 0.4);
    assert.equal(result.deductedOpeningAreaM2, 2.25);
    assert.equal(result.addedRevealAreaM2, 0.9);
    // 30 - 2.25 + 0.90 = 28.65 m2 (matches eng_calc.py siva_boya_alani)
    assert.equal(result.netPayableAreaM2, 28.65);
  });

  it("applies DIN_18350 2.50 m2 threshold without deducting medium windows", () => {
    const result = evaluatePlasterPaintMinha({
      grossAreaM2: 30,
      standard: "DIN_18350",
      openings: [
        // 1.50 x 1.50 = 2.25 m2 (<= 2.50 m2 under DIN 18350 -> not deducted!)
        { id: "W-MAIN", widthM: 1.5, heightM: 1.5, count: 1 },
        // 2.00 x 1.50 = 3.00 m2 (> 2.50 m2 -> deducted)
        { id: "W-LARGE", widthM: 2.0, heightM: 1.5, count: 1 },
      ],
    });

    assert.equal(result.thresholdM2, 2.5);
    assert.equal(result.nonDeductedOpeningAreaM2, 2.25);
    assert.equal(result.deductedOpeningAreaM2, 3.0);
    assert.equal(result.addedRevealAreaM2, 0);
    assert.equal(result.netPayableAreaM2, 27.0);
  });

  it("requires an explicit customThresholdM2 for CUSTOM_CONTRACT user-defined contractual profiles", () => {
    assert.throws(() =>
      evaluatePlasterPaintMinha({
        grossAreaM2: 50,
        standard: "CUSTOM_CONTRACT",
        openings: [],
      }),
    );

    const result = evaluatePlasterPaintMinha({
      grossAreaM2: 50,
      standard: "CUSTOM_CONTRACT",
      customThresholdM2: 3.75,
      openings: [
        // 2.00 x 1.80 = 3.60 m2 (<= 3.75 m2 -> not deducted)
        { id: "W-STD", widthM: 2.0, heightM: 1.8, count: 1 },
        // 2.50 x 2.00 = 5.00 m2 (> 3.75 m2 -> deducted)
        { id: "W-CURTAIN", widthM: 2.5, heightM: 2.0, count: 1 },
      ],
    });

    assert.equal(result.thresholdM2, 3.75);
    assert.equal(result.nonDeductedOpeningAreaM2, 3.6);
    assert.equal(result.deductedOpeningAreaM2, 5.0);
    assert.equal(result.netPayableAreaM2, 45.0);
  });

  it("calculates structural concrete, formwork, and rebar with node intersection deductions", () => {
    const column = evaluateStructuralIntersectionTakeoff({
      elementType: "column",
      widthM: 0.4,
      depthM: 0.6,
      lengthOrHeightM: 3.2,
      count: 10,
      intersectionDeductionVolumeM3: 0.48,
      intersectionDeductionFormworkM2: 2.4,
    });

    // Gross concrete = 0.4 * 0.6 * 3.2 * 10 = 7.68 m3
    assert.equal(column.grossConcreteM3, 7.68);
    assert.equal(column.netConcreteM3, 7.2);
    // Gross formwork = 2 * (0.4 + 0.6) * 3.2 * 10 = 64.0 m2
    assert.equal(column.grossFormworkM2, 64);
    assert.equal(column.netFormworkM2, 61.6);
    // Rebar = 7.2 m3 * 150 kg/m3 / 1000 = 1.08 ton
    assert.equal(column.estimatedRebarTon, 1.08);
  });

  it("computes deterministic beam-slab-column intersection deductions matching eng_calc.py", () => {
    const geom = computeBeamSlabIntersectionDeduction({
      beamWidthM: 0.3,
      beamTotalHeightM: 0.6,
      slabThicknessM: 0.15,
      beamClearSpanM: 5.0,
      count: 4,
    });

    // h_w = 0.60 - 0.15 = 0.45 m
    assert.equal(geom.webHeightM, 0.45);
    // Gross beam volume = 0.30 * 0.60 * 5.0 * 4 = 3.60 m3
    assert.equal(geom.grossBeamVolumeM3, 3.6);
    // Slab intersection deduction = 0.30 * 0.15 * 5.0 * 4 = 0.90 m3
    assert.equal(geom.slabIntersectionVolumeDeductionM3, 0.9);
    // Net beam web volume = 0.30 * 0.45 * 5.0 * 4 = 2.70 m3
    assert.equal(geom.netBeamWebVolumeM3, 2.7);
    // Net beam formwork (soffit + 2 web cheeks) = (0.30 + 2 * 0.45) * 5.0 * 4 = 24.0 m2
    assert.equal(geom.netBeamFormworkM2, 24);
    // Column beam-seat pocket deduction = 2 * 0.30 * 0.45 * 4 = 1.08 m2
    assert.equal(geom.columnSeatFormworkDeductionM2, 1.08);
    // Slab soffit strip deduction = 0.30 * 5.0 * 4 = 6.0 m2
    assert.equal(geom.slabSoffitStripDeductionM2, 6);
  });
});

describe("T24 line-level minha application", () => {
  it("deducts a matched opening exactly once from a gross line and records profile provenance", () => {
    const result = applyMinhaToTargetLines({
      standard: "CSB_2026",
      profileEvidence: VERIFIED_PROFILE,
      openings: [{ id: "op-1", widthM: 1, heightM: 1, hostElementId: "wall-1", targetLineId: "siva-1", targetFinishLayer: "Sıva", revealDepthM: 0.2, revealDepthSourceReference: "IFC wall thickness" }],
      lines: [{ id: "siva-1", hostElementId: "wall-1", finishLayer: "Sıva", quantityBasis: "gross_before_openings", quantityM2: 20 }],
    });
    assert.deepEqual(result.profileEvidence, VERIFIED_PROFILE);
    assert.notEqual(result.profileEvidence, VERIFIED_PROFILE);
    assert.ok(Object.isFrozen(result.profileEvidence));
    assert.equal(result.profile.sourceReference.length > 0, true);
    assert.equal(result.profile.version, "minha-2026.3");
    assert.equal(result.lines[0].status, "applied");
    assert.equal(result.lines[0].deductedOpeningAreaM2, 1);
    assert.equal(result.lines[0].addedRevealAreaM2, 0.6);
    assert.equal(result.lines[0].adjustmentM2, -0.4);
    assert.equal(result.lines[0].resultQuantityM2, 19.6);
  });

  it("adds sourced CSB reveal surfaces to the line adjustment", () => {
    const result = applyMinhaToTargetLines({
      standard: "CSB_2026",
      profileEvidence: VERIFIED_PROFILE,
      openings: [{ id: "op-reveal", widthM: 2, heightM: 1, revealDepthM: 0.2, revealDepthSourceReference: "IFC wall thickness", fourSidedReveal: true, hostElementId: "wall", targetLineId: "plaster", targetFinishLayer: "Sıva" }],
      lines: [{ id: "plaster", hostElementId: "wall", finishLayer: "Sıva", quantityBasis: "gross_before_openings", quantityM2: 10 }],
    });
    assert.equal(result.lines[0].deductedOpeningAreaM2, 2);
    assert.equal(result.lines[0].addedRevealAreaM2, 1.2);
    assert.equal(result.lines[0].resultQuantityM2, 9.2);
  });

  it("fails closed without verified contract edition or sourced reveal depth", () => {
    const result = applyMinhaToTargetLines({
      standard: "CSB_2026",
      openings: [{ id: "op", widthM: 2, heightM: 1, hostElementId: "wall", targetLineId: "plaster", targetFinishLayer: "Sıva" }],
      lines: [{ id: "plaster", hostElementId: "wall", finishLayer: "Sıva", quantityBasis: "gross_before_openings", quantityM2: 10 }],
    });
    assert.equal(result.lines[0].status, "review_required");
    assert.equal(result.appliedOpeningCount, 0);
  });

  it("does not deduct from net QTO and labels the line already_net", () => {
    const result = applyMinhaToTargetLines({
      standard: "CSB_2026",
      profileEvidence: VERIFIED_PROFILE,
      openings: [{ id: "op-1", widthM: 1, heightM: 1, hostElementId: "wall-1", targetLineId: "paint-1", targetFinishLayer: "Boya", revealDepthM: 0.2, revealDepthSourceReference: "IFC wall thickness" }],
      lines: [{ id: "paint-1", hostElementId: "wall-1", finishLayer: "Boya", quantityBasis: "net_after_openings", quantityM2: 19 }],
    });
    assert.equal(result.lines[0].status, "already_net");
    assert.equal(result.lines[0].adjustmentM2, 0);
    assert.equal(result.lines[0].resultQuantityM2, 19);
    assert.deepEqual(result.lines[0].openingIds, ["op-1"]);
    assert.equal(result.appliedOpeningCount, 0);
  });

  it("routes missing/mismatched host-line identity and unknown quantity basis to review", () => {
    const result = applyMinhaToTargetLines({
      standard: "DIN_18350",
      profileEvidence: VERIFIED_PROFILE,
      openings: [
        { id: "op-missing", widthM: 2, heightM: 2 },
        { id: "op-other", widthM: 2, heightM: 2, hostElementId: "wall-X", targetLineId: "line-1", targetFinishLayer: "Sıva", revealDepthM: 0.2, revealDepthSourceReference: "IFC wall thickness" },
      ],
      lines: [{ id: "line-1", hostElementId: "wall-1", finishLayer: "Sıva", quantityBasis: "unknown", quantityM2: 25 }],
    });
    assert.equal(result.appliedOpeningCount, 0);
    assert.equal(result.lines[0].status, "review_required");
    assert.equal(result.reviewItems.length, 2);
  });

  it("rejects duplicate opening ids so a gross line cannot be deducted twice", () => {
    const result = applyMinhaToTargetLines({
      standard: "CSB_2026",
      profileEvidence: VERIFIED_PROFILE,
      openings: [
        { id: "same", widthM: 1, heightM: 1, hostElementId: "wall-1", targetLineId: "line-1", targetFinishLayer: "Sıva", revealDepthM: 0.2, revealDepthSourceReference: "IFC wall thickness" },
        { id: "same", widthM: 1, heightM: 1, hostElementId: "wall-1", targetLineId: "line-1", targetFinishLayer: "Sıva", revealDepthM: 0.2, revealDepthSourceReference: "IFC wall thickness" },
      ],
      lines: [{ id: "line-1", hostElementId: "wall-1", finishLayer: "Sıva", quantityBasis: "gross_before_openings", quantityM2: 20 }],
    });
    assert.equal(result.lines[0].adjustmentM2, 0);
    assert.equal(result.lines[0].status, "review_required");
    assert.match(result.reviewItems[0].reason, /duplicate/i);
  });

  it("normalizes opening ids and isolates deductions by host-line-layer composite key", () => {
    const result = applyMinhaToTargetLines({
      standard: "DIN_18350",
      profileEvidence: VERIFIED_PROFILE,
      openings: [
        { id: "A", widthM: 2, heightM: 2, hostElementId: "wall-1", targetLineId: "same", targetFinishLayer: "Sıva" },
        { id: "B", widthM: 2, heightM: 2, hostElementId: "wall-2", targetLineId: "same", targetFinishLayer: "Sıva" },
      ],
      lines: [
        { id: "same", hostElementId: "wall-1", finishLayer: "Sıva", quantityBasis: "gross_before_openings", quantityM2: 10 },
        { id: "same", hostElementId: "wall-2", finishLayer: "Sıva", quantityBasis: "gross_before_openings", quantityM2: 20 },
      ],
    });
    assert.deepEqual(result.lines.map(line => line.resultQuantityM2), [6, 16]);

    const duplicate = applyMinhaToTargetLines({
      standard: "DIN_18350", profileEvidence: VERIFIED_PROFILE,
      openings: [
        { id: "X", widthM: 2, heightM: 2, hostElementId: "wall", targetLineId: "l", targetFinishLayer: "Sıva" },
        { id: " X ", widthM: 2, heightM: 2, hostElementId: "wall", targetLineId: "l", targetFinishLayer: "Sıva" },
      ],
      lines: [{ id: "l", hostElementId: "wall", finishLayer: "Sıva", quantityBasis: "gross_before_openings", quantityM2: 20 }],
    });
    assert.equal(duplicate.lines[0].status, "review_required");
    assert.equal(duplicate.appliedOpeningCount, 0);
  });

  it("routes an opening deduction larger than the gross line to review instead of clamping it", () => {
    const result = applyMinhaToTargetLines({
      standard: "CSB_2026",
      profileEvidence: VERIFIED_PROFILE,
      openings: [{ id: "op", widthM: 2, heightM: 2, hostElementId: "wall", targetLineId: "line", targetFinishLayer: "Sıva", revealDepthM: 0.2, revealDepthSourceReference: "IFC wall thickness" }],
      lines: [{ id: "line", hostElementId: "wall", finishLayer: "Sıva", quantityBasis: "gross_before_openings", quantityM2: 3 }],
    });
    assert.equal(result.lines[0].status, "review_required");
    assert.equal(result.lines[0].adjustmentM2, 0);
    assert.equal(result.appliedOpeningCount, 0);
    assert.match(result.reviewItems.at(-1)?.reason ?? "", /aşıyor/i);
  });
});

