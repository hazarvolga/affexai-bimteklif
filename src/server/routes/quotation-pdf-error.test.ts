import test from 'node:test';
import assert from 'node:assert/strict';
import { quotationPdfErrorResponse } from './quotation-pdf-error';
import { PdfPriceSourceUncertainError } from '../../services/pdf/price-guard';

test('uncertain price source becomes a safe HTTP 409', () => {
  assert.deepEqual(quotationPdfErrorResponse(new PdfPriceSourceUncertainError()), { status: 409, body: { error: 'Fiyat kaynağı belirsiz; satırı yeniden doğrulayın.', code: 'PDF_PRICE_SOURCE_UNCERTAIN' } });
  assert.equal(quotationPdfErrorResponse(new Error('PDF_PRICE_SOURCE_UNCERTAIN')), null);
});
