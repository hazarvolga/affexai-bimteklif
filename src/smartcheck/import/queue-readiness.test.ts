import assert from 'node:assert/strict';
import test from 'node:test';

import { assertGraphileWorkerSchemaRevision } from './queue-readiness';

test('queue readiness fails closed until Graphile Worker migration 18 exists', () => {
  for (const latest of [undefined, null, 0, 17]) {
    assert.throws(() => assertGraphileWorkerSchemaRevision(latest), /migration 18 is required/);
  }
  for (const latest of [18, 19]) {
    assert.doesNotThrow(() => assertGraphileWorkerSchemaRevision(latest));
  }
});
