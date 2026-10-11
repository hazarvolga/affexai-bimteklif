import test from 'node:test';
import assert from 'node:assert/strict';
import { acquireCrawlerScheduleLock } from './scheduler-lock';

test('concurrent replica cannot run a second batch; dedicated connection released', async () => {
  let releases = 0;
  const client = { query: async () => ({ rows: [{ acquired: false }] }), release: () => { releases++; } };
  const result = await acquireCrawlerScheduleLock({ connect: async () => client });
  assert.equal(result, null);
  assert.equal(releases, 1);
});

test('acquired session lock is unlocked and returned to pool', async () => {
  const statements: string[] = [];
  let releases = 0;
  const client = { query: async (sql: string) => { statements.push(sql); return { rows: [{ acquired: true }] }; }, release: () => { releases++; } };
  const release = await acquireCrawlerScheduleLock({ connect: async () => client });
  await release!();
  assert.equal(statements.length, 2);
  assert.match(statements[1], /pg_advisory_unlock/);
  assert.equal(releases, 1);
});

test('unlock failure discards the connection rather than leaking the session lock', async () => {
  let discarded = false;
  let count = 0;
  const client = { query: async () => { if (count++) throw new Error('connection lost'); return { rows: [{ acquired: true }] }; }, release: (error?: Error) => { discarded = !!error; } };
  const release = await acquireCrawlerScheduleLock({ connect: async () => client });
  await assert.rejects(release!());
  assert.equal(discarded, true);
});
