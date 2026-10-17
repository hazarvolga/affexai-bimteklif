import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateIso19650Compliance,
  evaluateLoinByMilestone,
  parseContainerIdentity,
  validateCdeStateTransition,
} from "./iso19650";

describe("TS EN ISO 19650-1/2, EN 17412-1 (LOIN) & RG 33331 EK-2 Rule Engine", () => {
  it("parses ISO 19650-2 hyphenated and RG 33331 EK-2 underscore container names against official ek2_disiplinler.json", () => {
    const iso = parseContainerIdentity("PRJ26-ARC-ZZ-01-M3-A-0001.ifc");
    assert.equal(iso.namingStandard, "ISO_19650_2");
    assert.equal(iso.projectCode, "PRJ26");
    assert.equal(iso.originatorOrDiscipline, "ARC");
    assert.equal(iso.informationType, "M3");

    const ek2 = parseContainerIdentity("123456_00_MM_GNEL_MD_BIM_000_01_000.ifc");
    assert.equal(ek2.namingStandard, "RG_33331_EK2");
    assert.equal(ek2.projectCode, "123456");
    assert.equal(ek2.originatorOrDiscipline, "MM");

    const invalidEk2 = parseContainerIdentity("123456_00_XX_YYYY_MD_BIM_999_01_000.ifc");
    assert.equal(invalidEk2.namingStandard, "NON_CONFORMING");
    assert.ok((invalidEk2.ek2DictionaryErrors?.length ?? 0) >= 3);
  });

  it("returns cdeEvaluationStatus = not_evaluated with null CDE fields when CDE metadata is not provided", () => {
    const res = evaluateIso19650Compliance({
      fileName: "123456_00_MM_GNEL_MD_BIM_000_01_000.ifc",
      elements: [
        {
          id: "1",
          guid: null,
          type: "IfcWall",
          storey: null,
          material: null,
          hasAdmissibleQuantity: true,
        },
      ],
    });

    assert.equal(res.cdeEvaluationStatus, "not_evaluated");
    assert.equal(res.cdeState, null);
    assert.equal(res.suitabilityCode, null);
    assert.equal(res.revisionCode, null);
    assert.equal(res.loin.uniqueGuidRatio, 0);
    assert.equal(res.loin.alphanumericCompletenessRatio, 0);
  });

  it("validates PUBLISHED contractual container with C01 revision and full LOIN completeness", () => {
    const res = evaluateIso19650Compliance({
      fileName: "PRJ26-STR-B1-00-M3-S-0001.ifc",
      cdeState: "PUBLISHED",
      suitabilityCode: "A1",
      revisionCode: "C01",
      targetDeliveryStage: "TENDER_OR_PERMIT",
      elements: [
        {
          id: "1",
          guid: "guid-001",
          type: "IfcColumn",
          storey: "Zemin Kat",
          material: "Beton_C30",
          hasAdmissibleQuantity: true,
        },
        {
          id: "2",
          guid: "guid-002",
          type: "IfcBeam",
          storey: "Zemin Kat",
          material: "Beton_C30",
          hasAdmissibleQuantity: true,
        },
      ],
    });

    assert.equal(res.cdeEvaluationStatus, "evaluated");
    assert.equal(res.isValid, true);
    assert.equal(res.score, 100);
    assert.equal(res.loin.geometricCompletenessRatio, 1);
    assert.equal(res.loin.alphanumericCompletenessRatio, 1);
    assert.equal(res.loin.duplicateGuidCount, 0);
  });

  it("rejects WIP (S0) container or preliminary P01.01 revision on PUBLISHED / TENDER_OR_PERMIT delivery and detects duplicate GUIDs", () => {
    const res = evaluateIso19650Compliance({
      fileName: " Rastgele_Dosya.ifc ",
      cdeState: "PUBLISHED",
      suitabilityCode: "S0",
      revisionCode: "P01.01",
      targetDeliveryStage: "TENDER_OR_PERMIT",
      elements: [
        {
          id: "1",
          guid: "dup-guid",
          type: "IfcWall",
          storey: "Zemin Kat",
          material: "Beton_C30",
          hasAdmissibleQuantity: true,
        },
        {
          id: "2",
          guid: "dup-guid",
          type: "IfcWall",
          storey: "Bilinmeyen Kat",
          material: "",
          hasAdmissibleQuantity: false,
        },
      ],
    });

    assert.equal(res.isValid, false);
    assert.equal(res.containerIdentity.namingStandard, "NON_CONFORMING");
    assert.equal(res.loin.duplicateGuidCount, 1);
    assert.ok(res.errors.some((e) => e.includes("PUBLISHED")));
    assert.ok(res.errors.some((e) => e.includes("mükerrer")));
  });

  it("Faz 2.1: enforces ISO 19650-2 §5.6-5.7 CDE state machine transitions (blocks direct WIP -> PUBLISHED jump)", () => {
    const illegalJump = validateCdeStateTransition({
      fromState: "WIP",
      toState: "PUBLISHED",
      suitabilityCode: "A1",
      revisionCode: "C01",
    });
    assert.equal(illegalJump.allowed, false);
    assert.ok(illegalJump.reason.includes("SHARED"));

    const validShare = validateCdeStateTransition({
      fromState: "WIP",
      toState: "SHARED",
      suitabilityCode: "S3",
      revisionCode: "P01.02",
    });
    assert.equal(validShare.allowed, true);

    const validPublish = validateCdeStateTransition({
      fromState: "SHARED",
      toState: "PUBLISHED",
      suitabilityCode: "A1",
      revisionCode: "C01",
    });
    assert.equal(validPublish.allowed, true);
  });

  it("Faz 2.2: evaluates EN 17412-1 (LOIN) completeness against EIR delivery milestones (CONCEPT vs IMPLEMENTATION)", () => {
    const sampleElements = [
      {
        id: "1",
        guid: "g1",
        type: "IfcWall",
        storey: "Zemin Kat",
        material: null,
        pozNo: null,
        hasAdmissibleQuantity: true,
      },
      {
        id: "2",
        guid: "g2",
        type: "IfcSlab",
        storey: "Zemin Kat",
        material: null,
        pozNo: null,
        hasAdmissibleQuantity: true,
      },
    ];

    const conceptRes = evaluateLoinByMilestone(sampleElements, "CONCEPT");
    assert.equal(conceptRes.targetLod, "LOD 200");
    assert.equal(conceptRes.passesMilestoneThreshold, true);
    assert.equal(conceptRes.overallCompletenessPercent, 100);

    const implRes = evaluateLoinByMilestone(sampleElements, "IMPLEMENTATION");
    assert.equal(implRes.targetLod, "LOD 350");
    assert.equal(implRes.passesMilestoneThreshold, false);
    assert.equal(implRes.missingElementCount, 2);
  });
});


