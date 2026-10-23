import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ParsedIfcElement } from "../types";
import {
  IFC_PARSER_CAPABILITIES,
  buildIfcElementIdentity,
  evaluateIfcQualityGate,
  normalizeIfcElementsForParity,
} from "./contract";

const element = (overrides: Partial<ParsedIfcElement> = {}): ParsedIfcElement => ({
  id: "42",
  guid: "DUPLICATE_GUID_0000001",
  type: "IfcSlab",
  ifcClass: "IfcSlab",
  name: "Slab",
  storey: "Zemin Kat",
  storeySource: "ifc_spatial",
  volumeM3: 8,
  formworkM2: 12,
  rebarKg: 0,
  quantitySource: "qto",
  quantitySourcePath: "#90/#80/#70:Qto_SlabBaseQuantities/NetVolume",
  quantityConfidence: 0.95,
  smartCheckStatus: "review",
  measured: true,
  measurementStatus: "ölçüldü",
  matchedPozCode: null,
  isUncovered: false,
  ...overrides,
});

describe("IFC parser parity contract", () => {
  it("keeps duplicate GlobalIds distinct with file, run and STEP identity", () => {
    const first = buildIfcElementIdentity({ fileSha256: "a".repeat(64), runId: "run-1", stepId: "42", globalId: "DUPLICATE_GUID_0000001" });
    const second = buildIfcElementIdentity({ fileSha256: "a".repeat(64), runId: "run-1", stepId: "43", globalId: "DUPLICATE_GUID_0000001" });

    assert.notEqual(first.elementKey, second.elementKey);
    assert.equal(first.globalId, second.globalId);
    assert.equal(first.stepId, "42");
    assert.equal(second.stepId, "43");
  });

  it("declares browser limitations and requires the worker for unsupported evidence", () => {
    assert.equal(IFC_PARSER_CAPABILITIES.browser.typeInheritance, false);
    assert.equal(IFC_PARSER_CAPABILITIES.browser.aggregateSuppression, false);
    assert.equal(IFC_PARSER_CAPABILITIES.worker.typeInheritance, true);
    assert.equal(IFC_PARSER_CAPABILITIES.worker.aggregateSuppression, true);

    const normalized = normalizeIfcElementsForParity([element()], {
      engine: "browser",
      fileSha256: "b".repeat(64),
      runId: "browser-preview-1",
    });
    assert.equal(normalized.requiresWorker, true);
    assert.match(normalized.unsupportedReasons.join("\n"), /type inheritance/i);
    assert.equal(normalized.elements[0].quantity.dimension, "volume");
    assert.equal(normalized.elements[0].quantity.unit, "m3");
  });

  it("compares the supported intersection without losing source evidence", () => {
    const context = { fileSha256: "c".repeat(64), runId: "run-2" } as const;
    const browser = normalizeIfcElementsForParity([element()], { ...context, engine: "browser" });
    const worker = normalizeIfcElementsForParity([element()], { ...context, engine: "worker" });

    assert.deepEqual(browser.elements, worker.elements);
    assert.equal(browser.elements[0].quantity.sourcePath, "#90/#80/#70:Qto_SlabBaseQuantities/NetVolume");
  });

  it("preserves dimensional totals and fails closed on invalid or unexplained records", () => {
    const gate = evaluateIfcQualityGate({
      schema: "IFC4X3_ADD2",
      elements: [
        element(),
        element({ id: "43", guid: "SECOND_GUID_0000000001", type: "IfcCovering", ifcClass: "IfcCovering", volumeM3: 0, areaM2: 25, formworkM2: 0 }),
        element({ id: "44", guid: "BAD_GUID_000000000002", volumeM3: 0, formworkM2: 0, measured: false, measurementStatus: "ölçülemedi", isUncovered: true }),
      ],
      excludedElementCount: 2,
      suppressedAssemblyPartCount: 1,
    });

    assert.equal(gate.schemaFamily, "IFC4X3");
    assert.deepEqual(gate.totals, { volumeM3: 8, areaM2: 25, lengthM: 0, massKg: 0, formworkAreaM2: 12 });
    assert.equal(gate.measuredCount, 2);
    assert.equal(gate.unmeasuredCount, 1);
    assert.equal(gate.excludedElementCount, 2);
    assert.equal(gate.suppressedAssemblyPartCount, 1);
    assert.equal(gate.passed, false);
    assert.deepEqual(gate.blockingFindingCodes, ["MISSING_NET_QUANTITY"]);

    const validGate = evaluateIfcQualityGate({
      schema: "IFC4X3_ADD2",
      elements: [element()],
      excludedElementCount: 0,
      suppressedAssemblyPartCount: 0,
    });
    assert.equal(validGate.passed, true);
    assert.deepEqual(validGate.blockingFindingCodes, []);

    const invalid = evaluateIfcQualityGate({
      schema: "IFC4",
      elements: [element({ volumeM3: -1, formworkM2: -5 })],
      excludedElementCount: 0,
      suppressedAssemblyPartCount: 0,
    });
    assert.equal(invalid.passed, false);
    assert.match(invalid.blockingReasons.join("\n"), /negative/i);
  });

  it("rejects unknown IFC4-prefixed schema labels", () => {
    const gate = evaluateIfcQualityGate({ schema: "IFC4_BOGUS", elements: [element()], excludedElementCount: 0, suppressedAssemblyPartCount: 0 });
    assert.equal(gate.schemaFamily, null);
    assert.equal(gate.passed, false);
  });
});
