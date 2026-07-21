import assert from 'node:assert/strict';
import crypto from 'crypto';
import { describe, it } from 'node:test';
import { parseAcademyPaymentEvent, verifyAcademyPaymentSignature } from './paymentWebhook';

const validPayload = { eventId: 'evt_123', type: 'academy.purchase.completed', provider: 'n8n', companyId: '123e4567-e89b-12d3-a456-426614174000', userId: '123e4567-e89b-12d3-a456-426614174001', paymentReference: 'pay_123' };

describe('Academy payment webhook boundary', () => {
  it('validates the strict purchase event contract', () => {
    assert.deepEqual(parseAcademyPaymentEvent(validPayload), validPayload);
    assert.equal(parseAcademyPaymentEvent({ ...validPayload, companyId: 'other-tenant' }), null);
    assert.equal(parseAcademyPaymentEvent({ ...validPayload, type: 'academy.purchase.grant-admin' }), null);
  });

  it('verifies HMAC signatures within five minutes', () => {
    const raw = Buffer.from(JSON.stringify(validPayload));
    const timestamp = 1_800_000_000;
    const signature = crypto.createHmac('sha256', 'secret').update(`${timestamp}.`).update(raw).digest('hex');
    assert.equal(verifyAcademyPaymentSignature(raw, `t=${timestamp},v1=${signature}`, 'secret', timestamp + 10), true);
    assert.equal(verifyAcademyPaymentSignature(raw, `t=${timestamp},v1=${signature}`, 'wrong', timestamp + 10), false);
    assert.equal(verifyAcademyPaymentSignature(raw, `t=${timestamp},v1=${signature}`, 'secret', timestamp + 301), false);
  });
});
