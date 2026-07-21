import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { consumeRateLimit, createActionToken, hashActionToken } from './security';

describe('auth security helpers', () => {
  it('creates opaque tokens and stores only a stable hash', () => {
    const created = createActionToken();
    assert.ok(created.token.length >= 40);
    assert.equal(created.tokenHash, hashActionToken(created.token));
    assert.notEqual(created.token, created.tokenHash);
  });

  it('limits repeated requests and opens a fresh window later', () => {
    const key = `test-${Math.random()}`;
    assert.equal(consumeRateLimit(key, 2, 1000, 100).allowed, true);
    assert.equal(consumeRateLimit(key, 2, 1000, 200).allowed, true);
    assert.equal(consumeRateLimit(key, 2, 1000, 300).allowed, false);
    assert.equal(consumeRateLimit(key, 2, 1000, 1200).allowed, true);
  });
});
