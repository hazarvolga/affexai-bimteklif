import assert from 'node:assert/strict';
import test from 'node:test';
import { verifiedContainerId } from './backup-docker';

const container = { id: 'c'.repeat(64), name: '/teklifpro-postgres', image: 'postgres:16', running: true,
  ports: { '5432/tcp': [{ HostIp: '0.0.0.0', HostPort: '5432' }] } };

test('Docker backup permits only the dedicated running TeklifPro16 mapped target', () => {
  assert.equal(verifiedContainerId(container, 5432, 16), container.id);
  for (const changed of [ { name: '/other-postgres' }, { image: 'postgres:17' }, { running: false },
    { id: 'not-an-id' }, { ports: {} } ]) {
    assert.throws(() => verifiedContainerId({ ...container, ...changed }, 5432, 16));
  }
  assert.throws(() => verifiedContainerId(container, 5433, 16));
  assert.throws(() => verifiedContainerId(container, 5432, 17));
});
