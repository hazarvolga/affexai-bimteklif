import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateIso19650Compliance,
  evaluateLoinByMilestone,
  findLatestAcceptedCdeTransition,
  parseContainerIdentity,
  type CdeState,
  type SuitabilityCode,
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
    assert.equal(res.evaluationStatus, "not_evaluated");
    assert.equal(res.advisoryOnly, true);
    assert.equal(res.sourceVerificationStatus, "access_required");
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
    assert.equal(res.isValid, false);
    assert.equal(res.score, 100);
    assert.equal(res.loin.geometricCompletenessRatio, 1);
    assert.equal(res.loin.alphanumericCompletenessRatio, 1);
    assert.equal(res.loin.duplicateGuidCount, 0);
    assert.equal(res.evaluationStatus, "manual_review_required");
    assert.ok(res.evidenceRefs.includes("ISO19650"));
  });

  it("does not evaluate a partial CDE tuple", () => {
    const res = evaluateIso19650Compliance({
      fileName: "PRJ26-STR-B1-00-M3-S-0001.ifc",
      revisionCode: "C01",
      elements: [{ id: "1", guid: "g1", type: "IfcWall", storey: "K00", material: "Beton_C30", hasAdmissibleQuantity: true }],
    });
    assert.equal(res.cdeEvaluationStatus, "not_evaluated");
    assert.equal(res.evaluationStatus, "not_evaluated");
    assert.deepEqual(res.missingInputs.sort(), ["cdeState", "suitabilityCode"]);
  });

  it("keeps automatic failure precedence when CDE metadata is absent", () => {
    const res = evaluateIso19650Compliance({ fileName: "bad.ifc", elements: [] });
    assert.equal(res.cdeEvaluationStatus, "not_evaluated");
    assert.equal(res.evaluationStatus, "failed");
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

  it("Faz 4 T27: enforces the exhaustive CDE from/to transition table", () => {
    const states: Array<CdeState | null> = [null, "WIP", "SHARED", "PUBLISHED", "ARCHIVED"];
    const targets: CdeState[] = ["WIP", "SHARED", "PUBLISHED", "ARCHIVED"];
    const allowed = new Set([
      "START→WIP",
      "WIP→SHARED",
      "SHARED→WIP",
      "SHARED→PUBLISHED",
      "PUBLISHED→ARCHIVED",
    ]);
    const metadata: Record<CdeState, { suitabilityCode: SuitabilityCode; revisionCode: string }> = {
      WIP: { suitabilityCode: "S0", revisionCode: "P01.01" },
      SHARED: { suitabilityCode: "S5", revisionCode: "P02.03" },
      PUBLISHED: { suitabilityCode: "A4", revisionCode: "C02" },
      ARCHIVED: { suitabilityCode: "B", revisionCode: "000" },
    };

    for (const fromState of states) {
      for (const toState of targets) {
        const key = `${fromState ?? "START"}→${toState}`;
        const result = validateCdeStateTransition({
          fromState,
          toState,
          ...metadata[toState],
          actor: "BIM lead",
          timestampIso: "2026-10-23T09:00:00.000Z",
        });
        assert.equal(result.allowed, allowed.has(key), key);
      }
    }
  });

  it("Faz 4 T27: rejects same-state transitions and keeps ARCHIVED terminal", () => {
    const archived = validateCdeStateTransition({
      fromState: "ARCHIVED",
      toState: "WIP",
      suitabilityCode: "S0",
      revisionCode: "P01.01",
      actor: "BIM lead",
    });
    const sameState = validateCdeStateTransition({
      fromState: "SHARED",
      toState: "SHARED",
      suitabilityCode: "S1",
      revisionCode: "P01.01",
      actor: "BIM lead",
    });
    assert.equal(archived.allowed, false);
    assert.match(archived.reason, /terminal|nihai|son durum/i);
    assert.equal(sameState.allowed, false);
  });

  it("Faz 4 T27: validates exact suitability and revision contracts for every destination", () => {
    const invalidCases = [
      { fromState: null, toState: "WIP", suitabilityCode: "S1", revisionCode: "P01.01" },
      { fromState: null, toState: "WIP", suitabilityCode: "S0", revisionCode: "C01" },
      { fromState: "WIP", toState: "SHARED", suitabilityCode: "S0", revisionCode: "P01.01" },
      { fromState: "WIP", toState: "SHARED", suitabilityCode: "S3", revisionCode: "000" },
      { fromState: "SHARED", toState: "PUBLISHED", suitabilityCode: "S7", revisionCode: "C01" },
      { fromState: "SHARED", toState: "PUBLISHED", suitabilityCode: "A1", revisionCode: "P01.01" },
      { fromState: "PUBLISHED", toState: "ARCHIVED", suitabilityCode: "A1", revisionCode: "C01" },
      { fromState: "PUBLISHED", toState: "ARCHIVED", suitabilityCode: "B", revisionCode: "P01.01" },
      { fromState: "PUBLISHED", toState: "ARCHIVED", suitabilityCode: "B", revisionCode: "C1" },
    ] as const;

    for (const invalidCase of invalidCases) {
      const result = validateCdeStateTransition({
        ...invalidCase,
        actor: "BIM lead",
      });
      assert.equal(result.allowed, false, JSON.stringify(invalidCase));
    }
  });

  it("Faz 4 T27: rejects a transition without an identified actor", () => {
    for (const actor of [undefined, "", "   "]) {
      const result = validateCdeStateTransition({
        fromState: null,
        toState: "WIP",
        suitabilityCode: "S0",
        revisionCode: "P01.01",
        actor,
      });
      assert.equal(result.allowed, false);
      assert.match(result.reason, /actor|işlemi yapan|kullanıcı/i);
    }
  });

  it("Faz 4 T27: returns the newest accepted transition without mutating history", () => {
    const acceptedOlder = validateCdeStateTransition({
      fromState: null,
      toState: "WIP",
      suitabilityCode: "S0",
      revisionCode: "P01.01",
      actor: "BIM lead",
      timestampIso: "2026-10-23T09:00:00.000Z",
    });
    const rejectedNewest = validateCdeStateTransition({
      fromState: "WIP",
      toState: "PUBLISHED",
      suitabilityCode: "A1",
      revisionCode: "C01",
      actor: "BIM lead",
      timestampIso: "2026-10-23T12:00:00.000Z",
    });
    const acceptedLatest = validateCdeStateTransition({
      fromState: "WIP",
      toState: "SHARED",
      suitabilityCode: "S2",
      revisionCode: "P01.02",
      actor: "BIM lead",
      timestampIso: "2026-10-23T10:00:00.000Z",
    });
    const history = Object.freeze([acceptedLatest, rejectedNewest, acceptedOlder]);

    assert.equal(findLatestAcceptedCdeTransition(history), acceptedLatest);
    assert.equal(findLatestAcceptedCdeTransition([rejectedNewest]), null);
    assert.deepEqual(history, [acceptedLatest, rejectedNewest, acceptedOlder]);

    const malformed = { ...acceptedOlder, timestampIso: "not-a-date" };
    assert.throws(() => findLatestAcceptedCdeTransition([malformed]), /INVALID_TIMESTAMP/);
    assert.throws(() => findLatestAcceptedCdeTransition([acceptedOlder, { ...acceptedLatest, timestampIso: acceptedOlder.timestampIso }]), /AMBIGUOUS_ORDER/);
    assert.equal(validateCdeStateTransition({ fromState: null, toState: "WIP", suitabilityCode: "S0", revisionCode: "P01.01", actor: "BIM lead", timestampIso: "bad" }).allowed, false);
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

  it("does not count material as PozNo at IMPLEMENTATION milestone", () => {
    const result = evaluateLoinByMilestone([{
      id: "1", guid: "g1", type: "IfcWall", storey: "K00", material: "Beton_C30",
      pozNo: null, hasAdmissibleQuantity: true,
    }], "IMPLEMENTATION");
    assert.equal(result.attributeCompleteness.pozNo, 0);
    assert.equal(result.passesMilestoneThreshold, false);
  });
});


