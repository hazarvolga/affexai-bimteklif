import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { skipIfDatabaseUnavailable } from '../../server/routes/test-db-reachability';
import { useTestIsolation } from '../../server/routes/test-isolation';

useTestIsolation();

test('tenant PDF rejects a historical ambiguous imported zero before rendering', async t => {
  if (await skipIfDatabaseUnavailable(t, 'PDF price source integration test')) return;
  const [{ db }, schema, { generateQuotationPdf }, { PdfPriceSourceUncertainError }, { eq }] = await Promise.all([
    import('../../db'), import('../../db/schema'), import('./generate'), import('./price-guard'), import('drizzle-orm'),
  ]);
  const [company] = await db.insert(schema.companies).values({ name: 'PDF source fixture' }).returning();
  const [user] = await db.insert(schema.users).values({ email: `pdf-${randomUUID()}@example.test`, fullName: 'PDF tester' }).returning();
  await db.insert(schema.memberships).values({ companyId: company.id, userId: user.id, role: 'owner' });
  const [client] = await db.insert(schema.clients).values({ companyId: company.id, name: 'PDF client', type: 'company' }).returning();
  const [quote] = await db.insert(schema.quotations).values({ companyId: company.id, clientId: client.id, quoteNumber: randomUUID(), projectName: 'PDF', expiryDate: new Date('2027-01-01'), subtotal: '0', discountTotal: '0', vatTotal: '0', grandTotal: '0' }).returning();
  const [document] = await db.insert(schema.documents).values({ companyId: company.id, uploadedByUserId: user.id, originalFileName: 'source.xlsx', displayName: 'source', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileSizeBytes: 1, storageKey: `${company.id}/source.xlsx`, checksumSha256: 'a'.repeat(64) }).returning();
  const [run] = await db.insert(schema.documentProcessingRuns).values({ companyId: company.id, documentId: document.id, status: 'succeeded', idempotencyKey: randomUUID(), pipelineVersion: 1 }).returning();
  const [row] = await db.insert(schema.normalizedQuantityRows).values({ companyId: company.id, documentId: document.id, processingRunId: run.id, sheetName: 'Sheet', sourceRowNumber: 1, sourceCellRange: 'A1', rawPrice: null, normalizedPrice: null }).returning();
  const [item] = await db.insert(schema.quotationItems).values({ companyId: company.id, quotationId: quote.id, description: 'Legacy', unit: 'm', quantity: '1', unitPrice: '0', total: '0', priceSource: 'document', sourceDocumentId: document.id, sourceProcessingRunId: run.id, sourceQuantityRowId: row.id }).returning();
  await db.insert(schema.quotationItemEvidence).values({ companyId: company.id, quotationId: quote.id, quotationItemId: item.id, evidenceType: 'price', evidenceKey: randomUUID(), sourceDocumentId: document.id, sourceProcessingRunId: run.id, sourceQuantityRowId: row.id, capturedValueJson: { price: '0', source: null }, status: 'current', createdByUserId: user.id });
  const actor = { companyId: company.id, userId: user.id };
  await assert.rejects(generateQuotationPdf(quote.id, 'default_construction', actor), PdfPriceSourceUncertainError);
  await db.update(schema.normalizedQuantityRows).set({ rawPrice: '0', normalizedPrice: '0' }).where(eq(schema.normalizedQuantityRows.id, row.id));
  await assert.rejects(generateQuotationPdf(quote.id, 'default_construction', actor), PdfPriceSourceUncertainError, 'changing a source row later does not rewrite the recorded price evidence');
});
