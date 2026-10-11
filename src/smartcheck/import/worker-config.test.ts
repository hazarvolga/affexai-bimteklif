import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCrontab } from 'graphile-worker';
import { DISABLED_GRAPHILE_CRONTAB, withDisabledGraphileCron } from './worker-config';

test('worker configuration disables cron without reading a crontab file', () => {
  const base = { concurrency: 1 };
  const configured = withDisabledGraphileCron(base);

  assert.notEqual(configured, base);
  assert.deepEqual(base, { concurrency: 1 });
  assert.equal(configured.crontab, DISABLED_GRAPHILE_CRONTAB);
  assert.deepEqual(parseCrontab(configured.crontab), []);
});
