import test from 'node:test';
import assert from 'node:assert/strict';
import { privacyTransition } from './privacy-policy';

test('masking requires a request and an explicit release from hold', () => {
  assert.equal(privacyTransition('active', 'request'), 'requested');
  assert.equal(privacyTransition('requested', 'hold'), 'hold');
  assert.throws(() => privacyTransition('hold', 'mask'), /CLIENT_PRIVACY_CONFLICT/);
  assert.equal(privacyTransition('hold', 'release'), 'requested');
  assert.equal(privacyTransition('requested', 'mask'), 'masked');
  assert.equal(privacyTransition('masked', 'mask'), 'masked');
  assert.throws(() => privacyTransition('masked', 'request'), /CLIENT_PRIVACY_CONFLICT/);
  assert.throws(() => privacyTransition('active', 'mask'), /CLIENT_PRIVACY_CONFLICT/);
});
