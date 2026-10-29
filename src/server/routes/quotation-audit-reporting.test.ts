import assert from 'node:assert/strict';
import test from 'node:test';

test('quotation audit reporting hashes untrusted route identifiers', async () => {
  process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:55485/teklifpro_bootstrap_test';
  const { quotationAuditReportingContext } = await import('./quotations');
  const raw = 'sensitive/value?secret=do-not-report';
  const context = quotationAuditReportingContext('quotation.revision_created', raw);
  assert.equal(context.area, 'quotation-audit');
  assert.equal(context.action, 'quotation.revision_created');
  assert.match(context.quotationId!, /^[a-f0-9]{16}$/);
  assert.notEqual(context.quotationId, raw);
  assert.equal(context.quotationId, quotationAuditReportingContext('quotation.revision_created', raw).quotationId);
});
