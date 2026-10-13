import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readBuildRevision, scrubEvent } from './error-tracking';

test('health revision comes from the build stamp, falling back to env only when no stamp exists', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'build-info-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'build-info.json');
  assert.deepEqual(readBuildRevision({ SOURCE_COMMIT: '846139e' }, file), { revision: '846139e', revisionSource: 'env' });
  await writeFile(file, JSON.stringify({ revision: 'a0bc7841234567' }));
  assert.deepEqual(readBuildRevision({ SOURCE_COMMIT: '846139e' }, file), { revision: 'a0bc7841234567', revisionSource: 'build' });
  await writeFile(file, JSON.stringify({ revision: '' }));
  assert.deepEqual(readBuildRevision({}, file), { revision: null, revisionSource: null });
  await writeFile(file, '{not json');
  assert.deepEqual(readBuildRevision({}, file), { revision: null, revisionSource: null });
});

test('error events never carry auth headers, cookies, bodies or query strings', () => {
  const event = scrubEvent({
    request: { url: 'https://bimmetraj.com/api/auth/reset?token=secret', query_string: 'token=secret', cookies: { session: 'x' }, data: { password: 'p' },
      headers: { authorization: 'Bearer abc', cookie: 'a=b', 'user-agent': 'UA', 'x-request-id': 'r1' } },
    user: { email: 'person@example.com', id: 'u1', ip_address: '1.2.3.4' },
  });
  assert.equal(event.request?.url, 'https://bimmetraj.com/api/auth/reset');
  assert.equal(event.request?.query_string, undefined);
  assert.equal(event.request?.cookies, undefined);
  assert.equal(event.request?.data, undefined);
  assert.deepEqual(event.request?.headers, { 'user-agent': 'UA', 'x-request-id': 'r1' });
  assert.deepEqual(event.user, { id: 'u1' });
});
