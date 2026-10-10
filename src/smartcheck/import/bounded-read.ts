import { Readable } from 'node:stream';
import { SMARTCHECK_MAX_FILE_BYTES } from './config';

export interface StorageReadOptions {
  maxBytes?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const MAX_READ_TIMEOUT_MS = 120_000;

export async function withReadDeadline<T>(options: StorageReadOptions, read: (signal: AbortSignal, maxBytes: number) => Promise<T>): Promise<T> {
  const maxBytes = options.maxBytes ?? SMARTCHECK_MAX_FILE_BYTES;
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > SMARTCHECK_MAX_FILE_BYTES ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_READ_TIMEOUT_MS) throw new Error('INVALID_STORAGE_READ_LIMIT');
  if (options.signal?.aborted) throw new Error('STORAGE_READ_ABORTED');
  const controller = new AbortController();
  const onAbort = () => controller.abort(new Error('STORAGE_READ_ABORTED'));
  options.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error('STORAGE_READ_TIMEOUT')), timeoutMs);
  let rejectRead: () => void;
  const aborted = new Promise<never>((_, reject) => {
    rejectRead = () => reject(controller.signal.reason);
    controller.signal.addEventListener('abort', rejectRead, { once: true });
  });
  try {
    // Bound the provider request as well as stream consumption, even if it ignores abort.
    return await Promise.race([read(controller.signal, maxBytes), aborted]);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
    controller.signal.removeEventListener('abort', rejectRead!);
  }
}

export async function readBoundedBody(body: unknown, maxBytes: number, signal: AbortSignal, contentLength?: number): Promise<Buffer> {
  if (!(body instanceof Readable)) throw new Error('STORAGE_BODY_MISSING_OR_UNSUPPORTED');
  const stop = () => { body.destroy(); };
  signal.addEventListener('abort', stop, { once: true });
  try {
    if (signal.aborted) throw signal.reason;
    if (contentLength !== undefined && contentLength > maxBytes) throw new Error('FILE_SIZE_INVALID');
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of body) {
      if (signal.aborted) throw signal.reason;
      if (!(chunk instanceof Uint8Array)) throw new Error('STORAGE_BODY_INVALID_CHUNK');
      size += chunk.byteLength;
      if (size > maxBytes) throw new Error('FILE_SIZE_INVALID');
      chunks.push(Buffer.from(chunk));
    }
    if (signal.aborted) throw signal.reason;
    return Buffer.concat(chunks, size);
  } finally {
    signal.removeEventListener('abort', stop);
    body.destroy();
  }
}
