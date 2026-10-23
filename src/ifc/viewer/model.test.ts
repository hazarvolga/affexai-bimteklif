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
});
