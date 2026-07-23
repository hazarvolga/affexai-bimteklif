import fs from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { localStorageRoot } from "./config";

export interface StorageAdapter {
  createUploadTarget(storageKey: string, contentType: string): Promise<{ uploadUrl: string; method: "PUT"; headers?: Record<string, string> }>;
  put(storageKey: string, content: Buffer, contentType: string): Promise<void>;
  get(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
  localPath?(storageKey: string): string;
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
  async get(storageKey: string): Promise<Buffer> { return fs.readFile(this.localPath(storageKey)); }
  async delete(storageKey: string): Promise<void> { await fs.rm(this.localPath(storageKey), { force: true }); }
}

export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;
  constructor() {
    this.bucket = process.env.SMARTCHECK_S3_BUCKET ?? "";
    if (!this.bucket) throw new Error("SMARTCHECK_S3_BUCKET_REQUIRED");
    this.client = new S3Client({
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
  async get(storageKey: string): Promise<Buffer> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(storageKey) }));
    return Buffer.from(await result.Body!.transformToByteArray());
  }
  async delete(storageKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey(storageKey) }));
  }
}

export function createStorageAdapter(): StorageAdapter {
  return process.env.NODE_ENV === "production" ? new S3StorageAdapter() : new LocalStorageAdapter();
}
