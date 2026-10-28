import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { adminMfaAccounts, adminMfaChallenges, users } from './schema';

test('MFA account and challenge foreign keys cascade with user deletion and expiry is indexed', () => {
  for (const table of [adminMfaAccounts, adminMfaChallenges]) {
    const config = getTableConfig(table);
    const userLink = config.foreignKeys.find(key => key.reference().foreignTable === users);
    assert.ok(userLink);
    assert.equal(userLink.onDelete, 'cascade');
    assert.equal(userLink.reference().columns[0].name, 'user_id');
  }
  const challenge = getTableConfig(adminMfaChallenges);
  assert.ok(challenge.indexes.some(index => index.config.name === 'admin_mfa_challenges_expires_at_idx'));
});
