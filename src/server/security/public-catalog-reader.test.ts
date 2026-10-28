import assert from 'node:assert/strict';
import test from 'node:test';
import { createBoundedCatalogReader } from './public-catalog-reader';

test('concurrent requests share a query and recover after completion', async () => {
  let calls = 0;
  let resolve!: (value: number) => void;
  const reader = createBoundedCatalogReader(() => { calls++; return new Promise<number>(done => { resolve = done; }); }, 100);
  const first = reader();
  const second = reader();
  await Promise.resolve();
  assert.equal(calls, 1);
  resolve(3);
  assert.deepEqual(await Promise.all([first, second]), [3, 3]);
});

test('slow catalog returns timeout without starting another query', async () => {
  let calls = 0;
  let resolve!: (value: number) => void;
  const reader = createBoundedCatalogReader(() => { calls++; return new Promise<number>(done => { resolve = done; }); }, 10);
  await assert.rejects(reader(), /PUBLIC_CATALOG_TIMEOUT/);
  await assert.rejects(reader(), /PUBLIC_CATALOG_TIMEOUT/);
  assert.equal(calls, 1);
  resolve(1);
});
