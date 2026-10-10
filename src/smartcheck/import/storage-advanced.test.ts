import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { LocalStorageAdapter, S3StorageAdapter } from "./storage";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

test("LocalStorageAdapter prefix read on 1MB file returns 8192 bytes without FILE_SIZE_INVALID", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "teklifpro-storage-test-"));
  const adapter = new LocalStorageAdapter(dir);

  const oneMb = Buffer.alloc(1024 * 1024, "x");
  const key = "large.bin";
  await adapter.put(key, oneMb);

  // prefixBytes: 8192 must succeed without throwing FILE_SIZE_INVALID
  const sample = await adapter.get(key, { prefixBytes: 8192 });
  assert.equal(sample.length, 8192);

  // mode: prefix with maxBytes: 8192 must also succeed without throwing FILE_SIZE_INVALID
  const sample2 = await adapter.get(key, { maxBytes: 8192, mode: "prefix" });
  assert.equal(sample2.length, 8192);

  await rm(dir, { recursive: true, force: true });
});

test("S3StorageAdapter prefix read on 1MB file uses Range header and returns 8192 bytes without FILE_SIZE_INVALID", async () => {
  const mockS3 = new S3Client({ region: "eu-central-1" });
  let rangePassed: string | undefined;
  mockS3.send = async (command: any) => {
    if (command instanceof GetObjectCommand) {
      rangePassed = command.input.Range;
      const body = Readable.from([Buffer.alloc(8192, "x")]);
      return { Body: body, ContentLength: 8192 };
    }
    return {};
  };

  const adapter = new S3StorageAdapter({ bucket: "dummy-bucket", client: mockS3 });
  const result = await adapter.get("large.bin", { prefixBytes: 8192 });
  assert.equal(rangePassed, "bytes=0-8191");
  assert.equal(result.length, 8192);
});

test("downloadToFile deletes partial file on mismatch", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "teklifpro-storage-test-"));
  const adapter = new LocalStorageAdapter(dir);

  const content = Buffer.from("hello world");
  const key = "test.txt";
  await adapter.put(key, content);

  const destPath = path.join(dir, "download.txt");
  await assert.rejects(adapter.downloadToFile(key, destPath, "wronghash"), /CHECKSUM_MISMATCH/);

  const fs = await import("node:fs");
  assert.equal(fs.existsSync(destPath), false, "Partial file should have been deleted");

  await rm(dir, { recursive: true, force: true });
});

test("downloadToFile deletes partial file on stream pipeline error", async () => {
  const mockS3 = new S3Client({ region: "eu-central-1" });
  mockS3.send = async () => {
    const brokenStream = Readable.from((async function* () {
      yield Buffer.from("partial chunk");
      throw new Error("stream connection broke");
    })());
    return { Body: brokenStream };
  };

  const dir = await mkdtemp(path.join(tmpdir(), "teklifpro-storage-test-"));
  const adapter = new S3StorageAdapter({ bucket: "dummy-bucket", client: mockS3 });
  const destPath = path.join(dir, "failed_download.txt");

  await assert.rejects(adapter.downloadToFile("key", destPath, "somehash"), /stream connection broke/);

  const fs = await import("node:fs");
  assert.equal(fs.existsSync(destPath), false, "Partial file should have been cleaned up on pipeline error");

  await rm(dir, { recursive: true, force: true });
});

test("downloadToFile throws EXPECTED_HASH_REQUIRED if expectedHash is missing", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "teklifpro-storage-test-"));
  const adapter = new LocalStorageAdapter(dir);
  await assert.rejects(adapter.downloadToFile("key", path.join(dir, "target.txt"), ""), /EXPECTED_HASH_REQUIRED/);
  await rm(dir, { recursive: true, force: true });
});
