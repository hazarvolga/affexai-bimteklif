import crypto from "node:crypto";
import type { StorageAdapter } from "./storage";

export type StorageSmokeResult = {
  key: string;
  bytes: number;
  checksumSha256: string;
  roundTripVerified: boolean;
  cleanupVerified: boolean;
};

function safePrefix(prefix: string) {
  const segments = prefix.split("/").filter((segment) => segment && segment !== "." && segment !== "..").map((segment) => segment.replace(/[^a-zA-Z0-9_\-.]/g, "-"));
  return segments.join("/") || "smartcheck-smoke";
}

export async function runStorageSmoke(adapter: StorageAdapter, prefix = "smartcheck-smoke") : Promise<StorageSmokeResult> {
  const key = `${safePrefix(prefix)}/${crypto.randomUUID()}.txt`;
  const payload = Buffer.from(`TeklifPro storage smoke ${new Date().toISOString()} ${crypto.randomUUID()}`, "utf8");
  const checksumSha256 = crypto.createHash("sha256").update(payload).digest("hex");
  await adapter.put(key, payload, "text/plain");
  let roundTripVerified = false;
  try {
    const downloaded = await adapter.get(key);
    roundTripVerified = downloaded.equals(payload);
    if (!roundTripVerified) throw new Error("STORAGE_SMOKE_CHECKSUM_MISMATCH");
  } finally {
    await adapter.delete(key);
  }
  let cleanupVerified = false;
  try {
    await adapter.get(key);
  } catch {
    cleanupVerified = true;
  }
  if (!cleanupVerified) throw new Error("STORAGE_SMOKE_CLEANUP_FAILED");
  return { key, bytes: payload.length, checksumSha256, roundTripVerified, cleanupVerified };
}
