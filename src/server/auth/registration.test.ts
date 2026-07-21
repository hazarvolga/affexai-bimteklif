import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseRegistrationInput, publicRegisteredUser } from './registration';

describe('registration boundary', () => {
  it('normalizes an Academy learner registration without requiring an organization', () => {
    assert.deepEqual(parseRegistrationInput({ email: ' Learner@Example.COM ', password: 'strong-pass', fullName: '  Ada   Lovelace ', companyName: '', intent: 'academy', termsAccepted: true, privacyAccepted: true, marketingConsent: false }), {
      email: 'learner@example.com', password: 'strong-pass', fullName: 'Ada Lovelace', companyName: 'Ada Lovelace Academy', intent: 'academy', termsAccepted: true, privacyAccepted: true, marketingConsent: false, acquisitionId: null,
    });
  });

  it('requires organization for workspace registration and rejects weak inputs', () => {
    assert.equal(parseRegistrationInput({ email: 'a@example.com', password: '1234567', fullName: 'Ada', companyName: 'ACME', termsAccepted: true, privacyAccepted: true }), null);
    assert.equal(parseRegistrationInput({ email: 'a@example.com', password: '12345678', fullName: 'Ada', companyName: '' }), null);
    assert.equal(parseRegistrationInput({ email: 'invalid', password: '12345678', fullName: 'Ada', companyName: 'ACME' }), null);
    assert.equal(parseRegistrationInput({ email: 'a@example.com', password: '12345678', fullName: 'Ada', companyName: 'ACME', intent: 'paid' }), null);
    assert.equal(parseRegistrationInput({ email: 'a@example.com', password: '12345678', fullName: 'Ada', companyName: 'ACME', termsAccepted: false, privacyAccepted: true }), null);
    assert.equal(parseRegistrationInput({ email: 'a@example.com', password: '12345678', fullName: 'Ada', companyName: 'ACME', termsAccepted: true, privacyAccepted: true, website: 'bot' }), null);
  });

  it('does not expose password hashes in registration responses', () => {
    assert.deepEqual(publicRegisteredUser({ id: 'u1', email: 'a@example.com', fullName: 'Ada', createdAt: 'now', passwordHash: 'secret' }), {
      id: 'u1', email: 'a@example.com', fullName: 'Ada', createdAt: 'now',
    });
  });
});
