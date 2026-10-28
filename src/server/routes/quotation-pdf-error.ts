import { PdfPriceSourceUncertainError } from '../../services/pdf/price-guard';

export function quotationPdfErrorResponse(error: unknown) {
  return error instanceof PdfPriceSourceUncertainError
    ? { status: 409, body: { error: 'Fiyat kaynağı belirsiz; satırı yeniden doğrulayın.', code: error.code } }
    : null;
}
