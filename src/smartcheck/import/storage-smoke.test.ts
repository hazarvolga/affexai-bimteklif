import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { LocalStorageAdapter } from "./storage";
import { runStorageSmoke } from "./storage-smoke";

test("local storage smoke verifies round-trip and removes its ephemeral object", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "teklifpro-storage-smoke-"));
  try {
    const result = await runStorageSmoke(new LocalStorageAdapter(root), "pilot-test");
    assert.equal(result.roundTripVerified, true);
    assert.equal(result.cleanupVerified, true);
    await assert.rejects(fs.access(path.join(root, result.key)));
    assert.ok(/^[a-f0-9]{64}$/.test(result.checksumSha256));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("storage smoke sanitizes the prefix before creating an object key", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "teklifpro-storage-smoke-"));
  try {
    const result = await runStorageSmoke(new LocalStorageAdapter(root), "../unsafe prefix");
    assert.ok(!result.key.includes(".."));
    assert.ok(result.key.startsWith("unsafe-prefix/"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
