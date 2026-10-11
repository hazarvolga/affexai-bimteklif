import test from 'node:test';
import assert from 'node:assert/strict';
import { crawlerDayStart, crawlerScheduleDue, nextCrawlerRun } from './scheduler-time';

test('Istanbul daily boundary is explicit regardless of process timezone', () => {
  assert.equal(crawlerDayStart(new Date('2026-10-11T22:30:00Z')).toISOString(), '2026-10-11T21:00:00.000Z');
  assert.equal(crawlerDayStart(new Date('2026-10-11T20:59:59Z')).toISOString(), '2026-10-10T21:00:00.000Z');
});
test('03:00 Istanbul schedule is midnight UTC, with bounded execution window', () => {
  for (const value of ['2026-10-11T00:00:00Z', '2026-10-11T00:19:59Z']) assert.equal(crawlerScheduleDue(new Date(value)), true);
  for (const value of ['2026-10-10T23:59:59Z', '2026-10-11T00:20:00Z', '2026-10-11T03:00:00Z']) assert.equal(crawlerScheduleDue(new Date(value)), false);
});
test('next run follows Istanbul calendar across year and leap-day boundaries', () => {
  assert.equal(nextCrawlerRun(new Date('2026-12-31T23:00:00Z')).toISOString(), '2027-01-01T00:00:00.000Z');
  assert.equal(nextCrawlerRun(new Date('2028-02-28T23:00:00Z')).toISOString(), '2028-02-29T00:00:00.000Z');
  assert.equal(nextCrawlerRun(new Date('2026-10-11T00:00:00Z')).toISOString(), '2026-10-12T00:00:00.000Z');
});
