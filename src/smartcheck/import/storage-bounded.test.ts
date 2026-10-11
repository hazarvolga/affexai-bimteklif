import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Readable } from 'node:stream';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LocalStorageAdapter, S3StorageAdapter } from './storage';

function s3(send: (...args: any[]) => Promise<any>) {
  return new S3StorageAdapter({ bucket: 'test-bucket', client: { send } as any });
}

test('S3 byte cap rejects oversized chunk before buffering and destroys body', async () => {
  const body = Readable.from([Buffer.alloc(6), Buffer.alloc(6)]);
  await assert.rejects(s3(async () => ({ Body: body })).get('tenant/file', { maxBytes: 10 }), /FILE_SIZE_INVALID/);
  assert.equal(body.destroyed, true);
});

test('S3 reads exact cap without trusting missing or understated content length', async () => {
  assert.deepEqual(await s3(async () => ({ Body: Readable.from([Buffer.from('abc'), Buffer.from('de')]) })).get('tenant/file', { maxBytes: 5 }), Buffer.from('abcde'));
  await assert.rejects(s3(async () => ({ ContentLength: 1, Body: Readable.from([Buffer.alloc(6)]) })).get('tenant/file', { maxBytes: 5 }), /FILE_SIZE_INVALID/);
});

test('S3 rejects declared oversize and missing bodies; propagates provider and body failures', async () => {
  const body = new Readable({ read() {} });
  await assert.rejects(s3(async () => ({ ContentLength: 11, Body: body })).get('file', { maxBytes: 10 }), /FILE_SIZE_INVALID/);
  assert.equal(body.destroyed, true);
  await assert.rejects(s3(async () => ({})).get('file'), /STORAGE_BODY_MISSING/);
  await assert.rejects(s3(async () => { throw new Error('provider failed'); }).get('file'), /provider failed/);
  const broken = Readable.from((async function* () { yield Buffer.from('ok'); throw new Error('body failed'); })());
  await assert.rejects(s3(async () => ({ Body: broken })).get('file'), /body failed/);
});

test('deadline aborts hung S3 request and hung body, even if provider ignores signal', async () => {
  let signal: AbortSignal;
  const pending = s3(async (_command, options) => { signal = options.abortSignal; return new Promise(() => {}); });
  await assert.rejects(pending.get('file', { timeoutMs: 20 }), /STORAGE_READ_TIMEOUT/);
  assert.equal(signal!.aborted, true);
  const body = new Readable({ read() {} });
  await assert.rejects(s3(async () => ({ Body: body })).get('file', { timeoutMs: 20 }), /STORAGE_READ_TIMEOUT/);
  assert.equal(body.destroyed, true);
});

test('caller abort and invalid limits fail closed', async () => {
  const controller = new AbortController();
  controller.abort();
  let sent = false;
  const adapter = s3(async () => { sent = true; return {}; });
  await assert.rejects(adapter.get('file', { signal: controller.signal }), /STORAGE_READ_ABORTED/);
  assert.equal(sent, false);
  for (const maxBytes of [0, -1, Infinity, 0.5, 101 * 1024 * 1024]) await assert.rejects(adapter.get('file', { maxBytes }), /INVALID_STORAGE_READ_LIMIT/);
  for (const timeoutMs of [0, -1, Infinity, 120001]) await assert.rejects(adapter.get('file', { timeoutMs }), /INVALID_STORAGE_READ_LIMIT/);
});

test('caller cancellation destroys in-flight body and late provider bodies are also closed', async () => {
  const controller = new AbortController();
  const body = new Readable({ read() { controller.abort(); } });
  await assert.rejects(s3(async () => ({ Body: body })).get('file', { signal: controller.signal }), /STORAGE_READ_ABORTED/);
  assert.equal(body.destroyed, true);
  let deliver: (value: any) => void;
  const late = s3(async () => new Promise(resolve => { deliver = resolve; }));
  await assert.rejects(late.get('file', { timeoutMs: 10 }), /STORAGE_READ_TIMEOUT/);
  const lateBody = new Readable({ read() {} });
  deliver!({ Body: lateBody });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(lateBody.destroyed, true);
});

test('invalid S3 body chunk fails closed without buffering arbitrary objects', async () => {
  const body = Readable.from([{ untrusted: 'object' }]);
  await assert.rejects(s3(async () => ({ Body: body })).get('file'), /STORAGE_BODY_INVALID_CHUNK/);
  assert.equal(body.destroyed, true);
});

test('local storage streams with byte cap and retains default caller compatibility', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'teklifpro-bounded-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const adapter = new LocalStorageAdapter(root);
  await adapter.put('tenant/file', Buffer.from('12345'));
  assert.deepEqual(await adapter.get('tenant/file'), Buffer.from('12345'));
  assert.deepEqual(await adapter.get('tenant/file', { maxBytes: 5 }), Buffer.from('12345'));
  await assert.rejects(adapter.get('tenant/file', { maxBytes: 4 }), /FILE_SIZE_INVALID/);
  await assert.rejects(adapter.get('missing'), /ENOENT/);
  await assert.rejects(adapter.get('../escape'), /INVALID_STORAGE_KEY/);
  await assert.rejects(adapter.get('tenant/file', { signal: AbortSignal.abort() }), /STORAGE_READ_ABORTED/);
});

test('streaming download enforces byte cap and removes partial output', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-cap-'));
  const file = path.join(dir, 'model.ifc');
  const body = Readable.from([Buffer.alloc(12)]);
  try {
    await assert.rejects(s3(async () => ({ Body: body })).downloadToFile('tenant/file', file, 'hash', { maxBytes: 10 }), /FILE_SIZE_INVALID/);
    await assert.rejects(fs.stat(file), /ENOENT/);
    assert.equal(body.destroyed, true);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('streaming download aborts stalled body and cleans partial output', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-timeout-'));
  const file = path.join(dir, 'model.ifc');
  const body = new Readable({ read() {} });
  try {
    await assert.rejects(s3(async () => ({ Body: body })).downloadToFile('tenant/file', file, 'hash', { timeoutMs: 20 }), /STORAGE_READ_TIMEOUT/);
    assert.equal(body.destroyed, true);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
