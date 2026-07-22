import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createActionToken, hashActionToken, nextRateLimitBucket, rateLimitStorageKey } from './security';

describe('auth security helpers', () => {
  it('creates opaque tokens and stores only a stable hash', () => {
    const created = createActionToken();
    assert.ok(created.token.length >= 40);
    assert.equal(created.tokenHash, hashActionToken(created.token));
    assert.notEqual(created.token, created.tokenHash);
  });

  it('stores rate-limit identities as stable hashes without personal data', () => {
    const input = 'login:203.0.113.9:learner@example.com';
    const key = rateLimitStorageKey(input);
    assert.equal(key, rateLimitStorageKey(input));
    assert.match(key, /^[a-f0-9]{64}$/);
    assert.equal(key.includes('learner@example.com'), false);
  });

  it('limits repeated requests and opens a fresh window later', () => {
    const first = nextRateLimitBucket(null, 2, 1000, new Date(100));
    const second = nextRateLimitBucket(first, 2, 1000, new Date(200));
    const limited = nextRateLimitBucket(second, 2, 1000, new Date(300));
    const reset = nextRateLimitBucket(limited, 2, 1000, new Date(1200));
    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(limited.allowed, false);
    assert.equal(reset.allowed, true);
    assert.equal(reset.requestCount, 1);
  });
});
