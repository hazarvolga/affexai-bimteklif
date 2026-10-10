import { Readable } from "node:stream";
import { SMARTCHECK_MAX_FILE_BYTES } from "./config";

export interface StorageReadOptions {
  maxBytes?: number;
  prefixBytes?: number;
  mode?: "cap" | "prefix";
  timeoutMs?: number;
  signal?: AbortSignal;
}

const MAX_READ_TIMEOUT_MS = 120_000;

export async function withReadDeadline<T>(options: StorageReadOptions, read: (signal: AbortSignal, maxBytes?: number) => Promise<T>): Promise<T> {
  const maxBytes = options.maxBytes;
  const prefixBytes = options.prefixBytes;
  const timeoutMs = options.timeoutMs;
  if (maxBytes !== undefined && (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > SMARTCHECK_MAX_FILE_BYTES)) {
    throw new Error("INVALID_STORAGE_READ_LIMIT");
  }
  if (prefixBytes !== undefined && (!Number.isSafeInteger(prefixBytes) || prefixBytes < 1 || prefixBytes > SMARTCHECK_MAX_FILE_BYTES)) {
    throw new Error("INVALID_STORAGE_READ_LIMIT");
  }
  if (timeoutMs !== undefined && (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_READ_TIMEOUT_MS)) {
    throw new Error("INVALID_STORAGE_READ_LIMIT");
  }
  if (options.signal?.aborted) throw new Error("STORAGE_READ_ABORTED");

  const controller = new AbortController();
  const onAbort = () => controller.abort(new Error("STORAGE_READ_ABORTED"));
  options.signal?.addEventListener("abort", onAbort, { once: true });

  let timer: NodeJS.Timeout | undefined;
  let aborted: Promise<never> | undefined;
  let rejectRead: ((reason: any) => void) | undefined;

  if (timeoutMs !== undefined) {
    timer = setTimeout(() => controller.abort(new Error("STORAGE_READ_TIMEOUT")), timeoutMs);
    aborted = new Promise<never>((_, reject) => {
      rejectRead = () => reject(controller.signal.reason);
      controller.signal.addEventListener("abort", rejectRead, { once: true });
    });
  }

  try {
    const readPromise = read(controller.signal, maxBytes);
    return aborted ? await Promise.race([readPromise, aborted]) : await readPromise;
  } finally {
    if (timer) clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
    if (rejectRead) controller.signal.removeEventListener("abort", rejectRead);
  }
}

export async function readPrefixBody(body: unknown, prefixBytes: number, signal?: AbortSignal): Promise<Buffer> {
  if (!(body instanceof Readable)) throw new Error("STORAGE_BODY_MISSING_OR_UNSUPPORTED");
  const stop = () => { body.destroy(); };
  signal?.addEventListener("abort", stop, { once: true });
  try {
    if (signal?.aborted) throw signal.reason;
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of body) {
      if (signal?.aborted) throw signal.reason;
      if (!(chunk instanceof Uint8Array)) throw new Error("STORAGE_BODY_INVALID_CHUNK");
      const need = prefixBytes - size;
      if (need <= 0) break;
      if (chunk.byteLength <= need) {
        chunks.push(Buffer.from(chunk));
        size += chunk.byteLength;
      } else {
        chunks.push(Buffer.from(chunk.subarray(0, need)));
        size += need;
        break;
      }
    }
    if (signal?.aborted) throw signal.reason;
    return Buffer.concat(chunks, size);
  } finally {
    signal?.removeEventListener("abort", stop);
    body.destroy();
  }
}

export async function readBoundedBody(body: unknown, maxBytes: number, signal: AbortSignal, contentLength?: number): Promise<Buffer> {
  if (!(body instanceof Readable)) throw new Error("STORAGE_BODY_MISSING_OR_UNSUPPORTED");
  const stop = () => { body.destroy(); };
  signal.addEventListener("abort", stop, { once: true });
  try {
    if (signal.aborted) throw signal.reason;
    if (contentLength !== undefined && contentLength > maxBytes) throw new Error("FILE_SIZE_INVALID");
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of body) {
      if (signal.aborted) throw signal.reason;
      if (!(chunk instanceof Uint8Array)) throw new Error("STORAGE_BODY_INVALID_CHUNK");
      size += chunk.byteLength;
      if (size > maxBytes) throw new Error("FILE_SIZE_INVALID");
      chunks.push(Buffer.from(chunk));
    }
    if (signal.aborted) throw signal.reason;
    return Buffer.concat(chunks, size);
  } catch (err) {
    if (signal.aborted) throw signal.reason;
    throw err;
  } finally {
    signal.removeEventListener("abort", stop);
    body.destroy();
  }
}
