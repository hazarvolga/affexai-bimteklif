import { Readable, Transform } from "node:stream";
import crypto from "node:crypto";
import { createWriteStream, createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import fs from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { localStorageRoot, SMARTCHECK_MAX_FILE_BYTES } from "./config";
import { readBoundedBody, readPrefixBody, withReadDeadline, type StorageReadOptions } from "./bounded-read";

export function uploadUrlExpirySeconds(env: Record<string, string | undefined> = process.env): number {
  const configured = Number(env.IFC_UPLOAD_URL_EXPIRY_SECONDS ?? env.SMARTCHECK_UPLOAD_URL_EXPIRY_SECONDS ?? 86400);
  if (!Number.isSafeInteger(configured) || configured < 1 || configured > 86400) throw new Error("UPLOAD_URL_EXPIRY_INVALID");
  return configured;
}

export interface StorageAdapter {
  createUploadTarget(
    storageKey: string,
    contentType: string,
    options?: { contentLength?: number; expiresInSeconds?: number }
  ): Promise<{ uploadUrl: string; method: "PUT"; headers?: Record<string, string> }>;
  put(storageKey: string, content: Buffer, contentType?: string): Promise<void>;
  get(storageKey: string, options?: StorageReadOptions): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
  localPath?(storageKey: string): string;

  downloadToFile?(storageKey: string, targetPath: string, expectedHash: string, options?: StorageReadOptions): Promise<void>;
  getStream?(storageKey: string, signal?: AbortSignal): Promise<Readable>;
}

function safeKey(storageKey: string): string {
  if (!/^[a-zA-Z0-9/_.-]+$/.test(storageKey) || storageKey.includes("..") || path.isAbsolute(storageKey)) throw new Error("INVALID_STORAGE_KEY");
  return storageKey;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly root = localStorageRoot()) {}
  localPath(storageKey: string): string { return path.join(this.root, safeKey(storageKey)); }
  async createUploadTarget(
    storageKey: string,
    _contentType: string,
    options?: { contentLength?: number; expiresInSeconds?: number }
  ) {
    safeKey(storageKey);
    return {
      uploadUrl: "",
      method: "PUT" as const,
      headers: options?.contentLength !== undefined ? { "content-length": String(options.contentLength) } : undefined,
    };
  }
  async put(storageKey: string, content: Buffer, _contentType?: string): Promise<void> {
    const target = this.localPath(storageKey);
    await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await fs.writeFile(target, content, { mode: 0o600 });
  }

  async get(storageKey: string, options: StorageReadOptions = {}): Promise<Buffer> {
    return withReadDeadline(options, async (signal, maxBytes) => {
      const filePath = this.localPath(storageKey);
      const isPrefix = options.prefixBytes !== undefined || options.mode === "prefix";
      const prefixLimit = options.prefixBytes ?? (options.mode === "prefix" ? options.maxBytes : undefined);

      if (isPrefix && prefixLimit !== undefined) {
        const stream = createReadStream(filePath, { start: 0, end: prefixLimit - 1, signal });
        return readPrefixBody(stream, prefixLimit, signal);
      }

      const stat = await fs.stat(filePath);
      return readBoundedBody(createReadStream(filePath, { signal, highWaterMark: 64 * 1024 }), maxBytes ?? SMARTCHECK_MAX_FILE_BYTES, signal, stat.size);
    });
  }

  async delete(storageKey: string): Promise<void> { await fs.rm(this.localPath(storageKey), { force: true }); }

  async getStream(storageKey: string, signal?: AbortSignal): Promise<Readable> {
    return createReadStream(this.localPath(storageKey), { signal });
  }

  async downloadToFile(storageKey: string, targetPath: string, expectedHash: string, options: StorageReadOptions = {}): Promise<void> {
    return downloadBounded(targetPath, expectedHash, options, async signal => createReadStream(this.localPath(storageKey), { signal }));
  }

}

export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;
  constructor(options: { bucket?: string; client?: S3Client } = {}) {
    this.bucket = options.bucket ?? process.env.SMARTCHECK_S3_BUCKET ?? "";
    if (!this.bucket) throw new Error("SMARTCHECK_S3_BUCKET_REQUIRED");
    this.client = options.client ?? new S3Client({
      region: process.env.SMARTCHECK_S3_REGION ?? "auto",
      endpoint: process.env.SMARTCHECK_S3_ENDPOINT,
      forcePathStyle: process.env.SMARTCHECK_S3_FORCE_PATH_STYLE === "true",
      credentials: process.env.SMARTCHECK_S3_ACCESS_KEY_ID ? {
        accessKeyId: process.env.SMARTCHECK_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.SMARTCHECK_S3_SECRET_ACCESS_KEY ?? "",
      } : undefined,
    });
  }

  async createUploadTarget(
    storageKey: string,
    contentType: string,
    options?: { contentLength?: number; expiresInSeconds?: number }
  ) {
    const expiresIn = options?.expiresInSeconds ?? uploadUrlExpirySeconds();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: safeKey(storageKey),
      ContentType: contentType,
      ...(options?.contentLength !== undefined ? { ContentLength: options.contentLength } : {}),
    });
    const headers: Record<string, string> = { "content-type": contentType };
    if (options?.contentLength !== undefined) {
      headers["content-length"] = String(options.contentLength);
    }
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn,
      signableHeaders: new Set([
        "content-type",
        "host",
        ...(options?.contentLength !== undefined ? ["content-length"] : []),
      ]),
    });
    return { uploadUrl, method: "PUT" as const, headers };
  }

  async put(storageKey: string, content: Buffer, contentType?: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: safeKey(storageKey), Body: content, ContentType: contentType ?? "application/octet-stream" }));
  }

  async get(storageKey: string, options: StorageReadOptions = {}): Promise<Buffer> {
    return withReadDeadline(options, async (signal, maxBytes) => {
      const isPrefix = options.prefixBytes !== undefined || options.mode === "prefix";
      const prefixLimit = options.prefixBytes ?? (options.mode === "prefix" ? options.maxBytes : undefined);

      const getParams: any = { Bucket: this.bucket, Key: safeKey(storageKey) };
      if (prefixLimit !== undefined) {
        getParams.Range = `bytes=0-${prefixLimit - 1}`;
      } else if (options.maxBytes !== undefined) {
        getParams.Range = `bytes=0-${options.maxBytes - 1}`;
      }

      const result = await this.client.send(new GetObjectCommand(getParams), { abortSignal: signal });
      if (!result.Body) throw new Error("STORAGE_BODY_MISSING");

      if (isPrefix && prefixLimit !== undefined) {
        return readPrefixBody(result.Body, prefixLimit, signal);
      }
      return readBoundedBody(result.Body, maxBytes ?? SMARTCHECK_MAX_FILE_BYTES, signal, result.ContentLength);
    });
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey(storageKey) }), { abortSignal: AbortSignal.timeout(15_000) });
  }

  async getStream(storageKey: string, signal?: AbortSignal): Promise<Readable> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(storageKey) }), { abortSignal: signal });
    if (!result.Body) throw new Error("EMPTY_BODY");
    return result.Body as Readable;
  }

  async downloadToFile(storageKey: string, targetPath: string, expectedHash: string, options: StorageReadOptions = {}): Promise<void> {
    return downloadBounded(targetPath, expectedHash, options, signal => this.getStream(storageKey, signal));
  }

}

export function createStorageAdapter(): StorageAdapter {
  return process.env.NODE_ENV === "production" ? new S3StorageAdapter() : new LocalStorageAdapter();
}

async function downloadBounded(targetPath: string, expectedHash: string, options: StorageReadOptions, sourceFor: (signal: AbortSignal) => Promise<Readable>): Promise<void> {
  if (!expectedHash) throw new Error("EXPECTED_HASH_REQUIRED");
  try {
    await withReadDeadline(options, async (signal, limit) => {
      const source = await sourceFor(signal);
      if (signal.aborted) { source.destroy(); throw signal.reason; }
      const hash = crypto.createHash("sha256");
      let size = 0;
      const meter = new Transform({ transform(chunk, _encoding, done) {
        size += chunk.length;
        if (size > (limit ?? SMARTCHECK_MAX_FILE_BYTES)) return done(new Error("FILE_SIZE_INVALID"));
        hash.update(chunk);
        done(null, chunk);
      } });
      try {
        await pipeline(source, meter, createWriteStream(targetPath, { mode: 0o600 }), { signal });
        if (hash.digest("hex") !== expectedHash) throw new Error("CHECKSUM_MISMATCH");
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        throw error;
      } finally { source.destroy(); }
    });
  } catch (error) {
    await fs.rm(targetPath, { force: true });
    throw error;
  }
}
