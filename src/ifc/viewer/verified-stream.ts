import crypto from "node:crypto";
import { Transform, type TransformCallback } from "node:stream";
import { IFC_VIEWER_MAX_FILE_BYTES } from "./model";

export function createVerifiedIfcStream(expectedBytes: number, expectedSha256: string): Transform {
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes <= 0 || expectedBytes > IFC_VIEWER_MAX_FILE_BYTES) {
    throw new Error("IFC_VIEWER_STREAM_SIZE_INVALID");
  }
  if (!/^[a-f0-9]{64}$/.test(expectedSha256)) throw new Error("IFC_VIEWER_STREAM_HASH_INVALID");
  let bytes = 0;
  const hash = crypto.createHash("sha256");
  return new Transform({
    transform(chunk: Buffer | Uint8Array, _encoding: BufferEncoding, callback: TransformCallback) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > expectedBytes || bytes > IFC_VIEWER_MAX_FILE_BYTES) return callback(new Error("IFC_VIEWER_STREAM_OVERSIZE"));
      hash.update(buffer);
      callback(null, buffer);
    },
    flush(callback: TransformCallback) {
      if (bytes !== expectedBytes) return callback(new Error("IFC_VIEWER_STREAM_SIZE_MISMATCH"));
      if (hash.digest("hex") !== expectedSha256) return callback(new Error("IFC_VIEWER_STREAM_HASH_MISMATCH"));
      callback();
    },
  });
}
