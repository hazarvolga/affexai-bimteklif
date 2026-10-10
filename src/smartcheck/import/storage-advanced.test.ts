import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { LocalStorageAdapter, S3StorageAdapter } from './storage';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

test('S3StorageAdapter uses Range header for maxBytes', async () => {
  const mockS3 = new S3Client({ region: 'eu-central-1' });
  let rangePassed = null;
  mockS3.send = async (command: any) => {
    if (command instanceof GetObjectCommand) {
      rangePassed = command.input.Range;
      const { Readable } = await import('node:stream');
      const body = Readable.from([Buffer.alloc(8192, 'x')]);
      return { Body: body, ContentLength: 8192 };
    }
  };
  
  const adapter = new S3StorageAdapter({ bucket: 'dummy-bucket', client: mockS3 });
  const result = await adapter.get('test.bin', { maxBytes: 8192 });
  assert.strictEqual(rangePassed, 'bytes=0-8191');
  assert.strictEqual(result.length, 8192);
});

test('downloadToFile deletes partial file on mismatch', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'teklifpro-storage-test-'));
  const adapter = new LocalStorageAdapter(dir);
  
  const content = Buffer.from('hello world');
  const key = 'test.txt';
  await (adapter as any).put(key, content, 'text/plain');
  
  const destPath = path.join(dir, 'download.txt');
  try {
    await adapter.downloadToFile(key, destPath, 'wronghash');
    assert.fail('Should have thrown mismatch error');
  } catch (e: any) {
    assert.match(e.message, /CHECKSUM_MISMATCH/);
  }
  
  const fs = await import('node:fs');
  assert.strictEqual(fs.existsSync(destPath), false, 'Partial file should have been deleted');
  
  await rm(dir, { recursive: true, force: true });
});
