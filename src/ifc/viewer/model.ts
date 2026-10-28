import { z } from "zod";
import type { IfcSourceIdentity } from "../types";

export const IFC_VIEWER_MAX_FILE_BYTES = 50 * 1024 * 1024;
export const IFC_VIEWER_MAX_MEMORY_BYTES = 384 * 1024 * 1024;
export const IFC_VIEWER_MAX_GEOMETRY_BYTES = 128 * 1024 * 1024;
export const IFC_VIEWER_MAX_TRIANGLES = 5_000_000;
export const IFC_VIEWER_MAX_MESHES = 50_000;
export const IFC_VIEWER_MAX_IDENTITIES = 25_000;
export const IFC_VIEWER_MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const uuidSchema = z.string().uuid();
const identitySchema = z.object({
  fileSha256: sha256Schema,
  runId: uuidSchema,
  stepId: z.string().regex(/^\d+$/),
  globalId: z.string().min(1).max(256),
  elementKey: z.string().min(1).max(512),
}).strict();

const viewerContextSchema = z.object({
  schemaVersion: z.literal(1),
  documentId: uuidSchema,
  processingRunId: uuidSchema,
  fileName: z.string().min(1).max(255),
  fileSizeBytes: z.number().int().positive(),
  fileSha256: sha256Schema,
  contentUrl: z.string().regex(/^\/api\/smartcheck\/documents\/[0-9a-f-]+\/viewer-content$/),
  identities: z.array(identitySchema).max(IFC_VIEWER_MAX_IDENTITIES),
}).strict();

export interface IfcViewerContext {
  schemaVersion: 1;
  documentId: string;
  processingRunId: string;
  fileName: string;
  fileSizeBytes: number;
  fileSha256: string;
  contentUrl: string;
  identities: IfcSourceIdentity[];
}

export function canonicalElementKey(identity: Pick<IfcSourceIdentity, "fileSha256" | "runId" | "stepId">): string {
  return `${identity.fileSha256}:${identity.runId}:#${identity.stepId}`;
}

export function parseViewerContext(input: unknown): IfcViewerContext {
  const parsed = viewerContextSchema.parse(input) as IfcViewerContext;
  if (parsed.fileSizeBytes > IFC_VIEWER_MAX_FILE_BYTES) throw new Error("IFC_VIEWER_FILE_BUDGET_EXCEEDED");
  if (!parsed.contentUrl.includes(parsed.documentId)) throw new Error("IFC_VIEWER_DOCUMENT_URL_MISMATCH");
  const keys = new Set<string>();
  for (const identity of parsed.identities) {
    if (identity.fileSha256 !== parsed.fileSha256) throw new Error("IFC_VIEWER_IDENTITY_HASH_MISMATCH");
    if (identity.runId !== parsed.processingRunId) throw new Error("IFC_VIEWER_IDENTITY_RUN_MISMATCH");
    if (identity.elementKey !== canonicalElementKey(identity)) throw new Error("IFC_VIEWER_IDENTITY_INVALID");
    if (keys.has(identity.elementKey)) throw new Error("IFC_VIEWER_IDENTITY_DUPLICATE");
    keys.add(identity.elementKey);
  }
  return parsed;
}

export function buildViewerIdentityIndex(identities: readonly IfcSourceIdentity[]) {
  const byElementKey = new Map<string, IfcSourceIdentity>();
  const byExpressId = new Map<number, IfcSourceIdentity>();
  const byGlobalId = new Map<string, IfcSourceIdentity[]>();
  for (const identity of identities) {
    byElementKey.set(identity.elementKey, identity);
    const expressId = Number(identity.stepId);
    if (Number.isSafeInteger(expressId)) byExpressId.set(expressId, identity);
    byGlobalId.set(identity.globalId, [...(byGlobalId.get(identity.globalId) ?? []), identity]);
  }
  return { byElementKey, byExpressId, byGlobalId };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

/** Conservative JS + GPU copy budget; WASM's own memory has a separate cap. */
export function estimateGeometryAllocationBytes(vertexBytes: number, indexBytes: number, meshCount = 1): number {
  if (![vertexBytes, indexBytes, meshCount].every(Number.isSafeInteger) || vertexBytes < 0 || indexBytes < 0 || meshCount < 0) {
    throw new Error("IFC_VIEWER_GEOMETRY_ESTIMATE_INVALID");
  }
  return (vertexBytes + indexBytes) * 2 + meshCount * 2_048;
}

export function assertGeometryBudget(input: { allocatedBytes: number; nextVertexBytes: number; nextIndexBytes: number; meshCount: number; triangleCount: number }) {
  const nextTriangles = input.triangleCount + Math.floor(input.nextIndexBytes / 4 / 3);
  const nextBytes = input.allocatedBytes + estimateGeometryAllocationBytes(input.nextVertexBytes, input.nextIndexBytes);
  if (input.meshCount + 1 > IFC_VIEWER_MAX_MESHES) throw new Error("IFC_VIEWER_MESH_LIMIT_EXCEEDED");
  if (nextTriangles > IFC_VIEWER_MAX_TRIANGLES) throw new Error("IFC_VIEWER_TRIANGLE_LIMIT_EXCEEDED");
  if (nextBytes > IFC_VIEWER_MAX_GEOMETRY_BYTES) throw new Error("IFC_VIEWER_GEOMETRY_BUDGET_EXCEEDED");
  return { allocatedBytes: nextBytes, triangleCount: nextTriangles, meshCount: input.meshCount + 1 };
}

export type IfcCameraPreset = "iso" | "top" | "front" | "right" | "left" | "back";

export function getCameraPresetAngles(preset: IfcCameraPreset): { azimuth: number; elevation: number } {
  switch (preset) {
    case "top":
      return { azimuth: Math.PI / 2, elevation: 1.44 };
    case "front":
      return { azimuth: Math.PI / 2, elevation: 0.08 };
    case "right":
      return { azimuth: 0, elevation: 0.08 };
    case "left":
      return { azimuth: Math.PI, elevation: 0.08 };
    case "back":
      return { azimuth: -Math.PI / 2, elevation: 0.08 };
    case "iso":
    default:
      return { azimuth: Math.PI / 4, elevation: Math.PI / 5 };
  }
}

export function computeFitCameraDistance(
  radius: number,
  fovDegrees: number,
  aspect: number,
  paddingFactor = 1.22,
): number {
  const safeRadius = Math.max(Number.isFinite(radius) ? radius : 1, 0.5);
  const safeAspect = Math.max(Number.isFinite(aspect) && aspect > 0 ? aspect : 1, 0.25);
  const vFovRad = (Math.max(fovDegrees, 10) * Math.PI) / 180;
  const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * safeAspect);
  const limitingHalfFov = Math.max(Math.min(vFovRad, hFovRad) / 2, 0.1);
  return (safeRadius * paddingFactor) / Math.sin(limitingHalfFov);
}

export function computePanDelta(input: {
  dx: number;
  dy: number;
  azimuth: number;
  elevation: number;
  distance: number;
  viewportHeight: number;
  fovDegrees: number;
}): { x: number; y: number; z: number } {
  const vFovRad = (Math.max(input.fovDegrees, 10) * Math.PI) / 180;
  const worldUnitsPerPixel =
    (2 * Math.max(input.distance, 0.1) * Math.tan(vFovRad / 2)) / Math.max(input.viewportHeight, 1);

  const sinA = Math.sin(input.azimuth);
  const cosA = Math.cos(input.azimuth);
  const sinE = Math.sin(input.elevation);
  const cosE = Math.cos(input.elevation);

  // Screen right vector R = (sin(a), 0, -cos(a))
  // Screen up vector    U = (-sin(e)*cos(a), cos(e), -sin(e)*sin(a))
  const rightFactor = -input.dx * worldUnitsPerPixel;
  const upFactor = input.dy * worldUnitsPerPixel;

  return {
    x: rightFactor * sinA + upFactor * (-sinE * cosA),
    y: upFactor * cosE,
    z: rightFactor * (-cosA) + upFactor * (-sinE * sinA),
  };
}

export function computeSectionCutConstant(minY: number, maxY: number, ratioPercent: number): number {
  const clamped = Math.max(5, Math.min(100, Number.isFinite(ratioPercent) ? ratioPercent : 100));
  const span = Math.max(maxY - minY, 0.1);
  if (clamped >= 100) {
    return maxY + span * 0.05 + 0.05;
  }
  return minY + (span * clamped) / 100;
}
