import { Readable } from "node:stream";
import crypto from 'node:crypto';
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { localStorageRoot } from "./config";
import { readBoundedBody, withReadDeadline, type StorageReadOptions } from './bounded-read';

export interface StorageAdapter {
  createUploadTarget(storageKey: string, contentType: string): Promise<{ uploadUrl: string; method: "PUT"; headers?: Record<string, string> }>;
  put(storageKey: string, content: Buffer, contentType: string): Promise<void>;
  get(storageKey: string, options?: StorageReadOptions): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
  localPath?(storageKey: string): string;

  downloadToFile?(storageKey: string, targetPath: string, expectedHash: string): Promise<void>;

  getStream?(storageKey: string): Promise<Readable>;
}



function safeKey(storageKey: string): string {
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(storageKey) || storageKey.includes("..") || path.isAbsolute(storageKey)) throw new Error("INVALID_STORAGE_KEY");
  return storageKey;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly root = localStorageRoot()) {}
  localPath(storageKey: string): string { return path.join(this.root, safeKey(storageKey)); }
  async createUploadTarget(storageKey: string, _contentType: string) {
    safeKey(storageKey);
    return { uploadUrl: "", method: "PUT" as const };
  }
  async put(storageKey: string, content: Buffer): Promise<void> {
    const target = this.localPath(storageKey);
    await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await fs.writeFile(target, content, { mode: 0o600 });
  }
  async get(storageKey: string, options: StorageReadOptions = {}): Promise<Buffer> {
    return withReadDeadline(options, async (signal, maxBytes) => {
      const filePath = this.localPath(storageKey);
      const stat = await fs.stat(filePath);
      return readBoundedBody(createReadStream(filePath, { signal, highWaterMark: 64 * 1024 }), maxBytes, signal, stat.size);
    });
  }
  async delete(storageKey: string): Promise<void> { await fs.rm(this.localPath(storageKey), { force: true }); }

  async getStream(storageKey: string): Promise<Readable> {
    return createReadStream(this.localPath(storageKey));
  }


    async downloadToFile(storageKey: string, targetPath: string, expectedHash: string): Promise<void> {
    if (!expectedHash) throw new Error("EXPECTED_HASH_REQUIRED");
    const hash = crypto.createHash("sha256");
    const source = createReadStream(this.localPath(storageKey));
    const target = createWriteStream(targetPath);
    source.on("data", chunk => hash.update(chunk));
    try {
      await pipeline(source, target);
      if (hash.digest("hex") !== expectedHash) {
        throw new Error("CHECKSUM_MISMATCH");
      }
    } catch (err) {
      await fs.rm(targetPath, { force: true });
      throw err;
    }
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
  async createUploadTarget(storageKey: string, contentType: string) {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: safeKey(storageKey), ContentType: contentType });
    return { uploadUrl: await getSignedUrl(this.client, command, { expiresIn: 900 }), method: "PUT" as const, headers: { "content-type": contentType } };
  }
  async put(storageKey: string, content: Buffer, contentType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: safeKey(storageKey), Body: content, ContentType: contentType }));
  }
  async get(storageKey: string, options: StorageReadOptions = {}): Promise<Buffer> {
    return withReadDeadline(options, async (signal, maxBytes) => {
      const getParams: any = { Bucket: this.bucket, Key: safeKey(storageKey) };
      if (maxBytes) getParams.Range = `bytes=0-${maxBytes - 1}`;
      const result = await this.client.send(new GetObjectCommand(getParams), { abortSignal: signal });
      return readBoundedBody(result.Body, maxBytes, signal, result.ContentLength);
    });
  }
  async delete(storageKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey(storageKey) }));
  }

  async getStream(storageKey: string): Promise<Readable> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(storageKey) }));
    if (!result.Body) throw new Error('EMPTY_BODY');
    return result.Body as Readable;
  }


    async downloadToFile(storageKey: string, targetPath: string, expectedHash: string): Promise<void> {
    if (!expectedHash) throw new Error("EXPECTED_HASH_REQUIRED");
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(storageKey) }));
    if (!result.Body) throw new Error("EMPTY_BODY");

    const hash = crypto.createHash("sha256");
    const target = createWriteStream(targetPath);
    const source = result.Body as NodeJS.ReadableStream;
    source.on("data", chunk => hash.update(chunk));

    try {
      await pipeline(source, target);
      if (hash.digest("hex") !== expectedHash) {
        throw new Error("CHECKSUM_MISMATCH");
      }
    } catch (err) {
      await fs.rm(targetPath, { force: true });
      throw err;
    }
  }

}

export function createStorageAdapter(): StorageAdapter {
  return process.env.NODE_ENV === "production" ? new S3StorageAdapter() : new LocalStorageAdapter();
}
