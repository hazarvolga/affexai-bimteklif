import assert from 'node:assert/strict';
import test from 'node:test';
import { assertSmartCheckWorkersDrained } from './worker-drain-gate';

function clientWithCounts(running: number, locked: number) {
  return {
    query: async (statement: string) => {
      if (statement.includes("to_regclass('public.document_processing_runs')")) return { rows: [{ relation: 'document_processing_runs' }] };
      if (statement.includes('to_regclass($1)')) return { rows: [{ relation: '_private_jobs' }] };
      if (statement.includes('document_processing_runs')) return { rows: [{ count: running }] };
      return { rows: [{ count: locked }] };
    },
  } as any;
}

test('release worker drain gate requires explicit stop acknowledgement', async () => {
  await assert.rejects(assertSmartCheckWorkersDrained(clientWithCounts(0, 0), {}), /RELEASE_WORKERS_DRAINED=true/);
});

test('release worker drain gate rejects running runs and locked queue jobs', async () => {
  await assert.rejects(assertSmartCheckWorkersDrained(clientWithCounts(1, 0), { RELEASE_WORKERS_DRAINED: 'true' }), /running runs must be zero/);
  await assert.rejects(assertSmartCheckWorkersDrained(clientWithCounts(0, 1), { RELEASE_WORKERS_DRAINED: 'true' }), /locked Graphile jobs must be zero/);
});

test('release worker drain gate accepts an acknowledged quiescent database', async () => {
  await assert.doesNotReject(assertSmartCheckWorkersDrained(clientWithCounts(0, 0), {
    RELEASE_WORKERS_DRAINED: 'true',
    GRAPHILE_WORKER_SCHEMA: 'teklifpro_queue',
  }));
});
