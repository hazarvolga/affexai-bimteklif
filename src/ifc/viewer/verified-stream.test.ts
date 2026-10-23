import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { describe, it } from "node:test";
import { createVerifiedIfcStream } from "./verified-stream";

const source = Buffer.from("ISO-10303-21;END-ISO-10303-21;");
const checksum = crypto.createHash("sha256").update(source).digest("hex");
const sink = () => new Writable({ write(_chunk, _encoding, done) { done(); } });

describe("verified IFC response stream", () => {
  it("passes exact bytes with the expected incremental SHA-256", async () => {
    await pipeline(Readable.from([source.subarray(0, 7), source.subarray(7)]), createVerifiedIfcStream(source.length, checksum), sink());
  });

  it("fails closed for oversize, truncation and checksum mismatch", async () => {
    await assert.rejects(pipeline(Readable.from([source, Buffer.from("x")]), createVerifiedIfcStream(source.length, checksum), sink()), /OVERSIZE/);
    await assert.rejects(pipeline(Readable.from([source.subarray(0, -1)]), createVerifiedIfcStream(source.length, checksum), sink()), /SIZE_MISMATCH/);
    await assert.rejects(pipeline(Readable.from([source]), createVerifiedIfcStream(source.length, "0".repeat(64)), sink()), /HASH_MISMATCH/);
  });
});
