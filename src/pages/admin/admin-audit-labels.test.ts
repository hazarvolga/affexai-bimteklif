import assert from 'node:assert/strict';
import test from 'node:test';
import { auditActionLabel, auditOutcomeLabel, auditTimestampLabel } from './admin-audit-labels';

test('actual queue retry and payment decisions have clear labels and unknown codes are retained', () => {
  assert.match(auditActionLabel('processing_retried'), /yeniden/i);
  assert.match(auditActionLabel('billing.payment_request.rejected'), /redded/i);
  assert.equal(auditOutcomeLabel('billing.payment_request.rejected'), 'Reddedildi');
  assert.equal(auditActionLabel('future.event'), 'Diğer işlem (future.event)');
  assert.equal(auditActionLabel('other'), 'Diğer işlem');
  assert.equal(auditActionLabel('constructor'), 'Diğer işlem (constructor)');
});

test('naive audit timestamps are shown without assigning a timezone', () => {
  assert.equal(auditTimestampLabel('2026-10-08T12:00:00.123456'), '2026-10-08 12:00:00.123456 · Saat dilimi belirtilmemiş');
});
