import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readBuildRevision, sanitizeErrorForReporting, scrubEvent } from './error-tracking';

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

test('central error reporting keeps only safe PostgreSQL identity fields for console and Sentry', () => {
  const nestedCause = Object.assign(new Error('password=inner-secret'), {
    code: 'XX001',
    detail: 'nested tenant row contained inner-secret@example.test',
    query: 'select * from subscriptions where company_id = $1',
    parameters: ['22222222-2222-4222-8222-222222222222'],
  });
  const databaseError = Object.assign(new Error('duplicate key value violates unique constraint; token=outer-secret'), {
    name: 'DatabaseError',
    code: '23505',
    detail: 'Key (email)=(private@example.test) already exists.',
    where: 'SQL statement "insert into leads ..."',
    query: 'insert into leads(company_id,email) values($1,$2)',
    parameters: ['11111111-1111-4111-8111-111111111111', 'private@example.test'],
    cause: nestedCause,
  });

  const safe = sanitizeErrorForReporting(databaseError);
  assert.deepEqual(safe, { name: 'DatabaseError', code: '23505' });
  assert.equal(databaseError.detail.includes('private@example.test'), true, 'sanitization must not mutate the original error');

  // The central API handler must pass this same safe value to both outbound sinks.
  const outbound = JSON.stringify({ console: ['Unhandled API error:', safe], sentry: safe });
  for (const secret of [
    'outer-secret',
    'inner-secret',
    'private@example.test',
    '22222222-2222-4222-8222-222222222222',
    'insert into leads',
    'select * from subscriptions',
    'parameters',
    'detail',
    'where',
    'query',
    'cause',
  ]) assert.equal(outbound.includes(secret), false, `reporting payload leaked ${secret}`);
  assert.equal(outbound.includes('DatabaseError'), true);
  assert.equal(outbound.includes('23505'), true);
});
