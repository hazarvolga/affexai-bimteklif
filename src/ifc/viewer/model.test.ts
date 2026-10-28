import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IFC_VIEWER_MAX_FILE_BYTES,
  IFC_VIEWER_MAX_GEOMETRY_BYTES,
  IFC_VIEWER_MAX_IDENTITIES,
  IFC_VIEWER_MAX_MESHES,
  IFC_VIEWER_MAX_TRIANGLES,
  assertGeometryBudget,
  buildViewerIdentityIndex,
  computeFitCameraDistance,
  computePanDelta,
  computeSectionCutConstant,
  getCameraPresetAngles,
  parseViewerContext,
  sha256Hex,
} from "./model";

const fileSha256 = "a".repeat(64);
const context = {
  schemaVersion: 1,
  documentId: "11111111-1111-4111-8111-111111111111",
  processingRunId: "22222222-2222-4222-8222-222222222222",
  fileName: "model.ifc",
  fileSizeBytes: 12,
  fileSha256,
  contentUrl: "/api/smartcheck/documents/11111111-1111-4111-8111-111111111111/viewer-content",
  identities: [
    { fileSha256, runId: "22222222-2222-4222-8222-222222222222", stepId: "12", globalId: "DUPLICATE", elementKey: `${fileSha256}:22222222-2222-4222-8222-222222222222:#12` },
    { fileSha256, runId: "22222222-2222-4222-8222-222222222222", stepId: "13", globalId: "DUPLICATE", elementKey: `${fileSha256}:22222222-2222-4222-8222-222222222222:#13` },
  ],
};

describe("IFC viewer model boundary", () => {
  it("keeps duplicate GlobalIds distinct by canonical elementKey", () => {
    const parsed = parseViewerContext(context);
    const index = buildViewerIdentityIndex(parsed.identities);
    assert.equal(index.byGlobalId.get("DUPLICATE")?.length, 2);
    assert.equal(index.byExpressId.get(12)?.elementKey.endsWith(":#12"), true);
    assert.equal(index.byExpressId.get(13)?.elementKey.endsWith(":#13"), true);
  });

  it("rejects forged identity, wrong run and files above the viewer budget", () => {
    assert.throws(() => parseViewerContext({ ...context, fileSizeBytes: IFC_VIEWER_MAX_FILE_BYTES + 1 }), /IFC_VIEWER_FILE_BUDGET_EXCEEDED/);
    assert.throws(() => parseViewerContext({ ...context, identities: [{ ...context.identities[0], runId: crypto.randomUUID() }] }), /IFC_VIEWER_IDENTITY_RUN_MISMATCH/);
    assert.throws(() => parseViewerContext({ ...context, identities: [{ ...context.identities[0], elementKey: "forged" }] }), /IFC_VIEWER_IDENTITY_INVALID/);
  });

  it("verifies the downloaded bytes against the server source hash", async () => {
    const bytes = new TextEncoder().encode("ISO-10303-21;END-ISO-10303-21;");
    assert.equal(await sha256Hex(bytes), "1e561b8e3c745b4b8582275549e0efad5be2e0b610b9bbb1064ed52e8a7a9435");
  });

  it("guards browser/GPU allocation before copies and caps triangles and meshes", () => {
    assert.throws(() => assertGeometryBudget({ allocatedBytes: IFC_VIEWER_MAX_GEOMETRY_BYTES - 1, nextVertexBytes: 24, nextIndexBytes: 12, meshCount: 0, triangleCount: 0 }), /GEOMETRY_BUDGET/);
    assert.throws(() => assertGeometryBudget({ allocatedBytes: 0, nextVertexBytes: 24, nextIndexBytes: 12, meshCount: IFC_VIEWER_MAX_MESHES, triangleCount: 0 }), /MESH_LIMIT/);
    assert.throws(() => assertGeometryBudget({ allocatedBytes: 0, nextVertexBytes: 24, nextIndexBytes: 12, meshCount: 0, triangleCount: IFC_VIEWER_MAX_TRIANGLES }), /TRIANGLE_LIMIT/);
  });

  it("caps evidence identities at a review-sized boundary", () => {
    assert.throws(() => parseViewerContext({ ...context, identities: Array(IFC_VIEWER_MAX_IDENTITIES + 1).fill(context.identities[0]) }));
  });

  it("computes aspect-aware fit camera distance and preset angles for 3D space controls", () => {
    const wideDist = computeFitCameraDistance(10, 42, 16 / 9);
    const narrowDist = computeFitCameraDistance(10, 42, 0.5);
    assert.equal(wideDist > 20, true);
    assert.equal(narrowDist > wideDist, true);

    const iso = getCameraPresetAngles("iso");
    const top = getCameraPresetAngles("top");
    const front = getCameraPresetAngles("front");
    const right = getCameraPresetAngles("right");
    assert.equal(top.elevation > iso.elevation, true);
    assert.notEqual(front.azimuth, right.azimuth);
  });

  it("computes screen-space pan delta and vertical section cut plane height", () => {
    const pan = computePanDelta({
      dx: 100,
      dy: 50,
      azimuth: 0,
      elevation: 0,
      distance: 20,
      viewportHeight: 500,
      fovDegrees: 42,
    });
    assert.equal(Math.abs(pan.x) < 1e-9, true);
    assert.equal(pan.y > 0, true);
    assert.equal(pan.z > 0, true);

    assert.equal(computeSectionCutConstant(0, 12, 50), 6);
    assert.equal(computeSectionCutConstant(0, 12, 0) >= 0.6, true);
    assert.equal(computeSectionCutConstant(0, 12, 100) > 12, true);
  });
});
