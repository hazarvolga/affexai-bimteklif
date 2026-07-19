export type AuditSeverity = 'info' | 'warning';

export interface QuotationAuditIssue {
  code: 'SOURCE_UNVERIFIED' | 'COST_MISSING' | 'SOURCE_REFERENCE_MISSING';
  severity: AuditSeverity;
  itemIndex: number;
  message: string;
}

export function auditQuotationItems(items: Array<{
  quantitySource?: string | null;
  priceSource?: string | null;
  sourceReference?: string | null;
  verificationStatus?: string | null;
  costUnitPrice?: number | string | null;
}>): QuotationAuditIssue[] {
  return items.flatMap((item, index) => {
    const issues: QuotationAuditIssue[] = [];
    if (item.quantitySource === 'ai_estimate' || item.priceSource === 'ai_estimate' || item.verificationStatus !== 'verified') {
      issues.push({ code: 'SOURCE_UNVERIFIED', severity: 'warning', itemIndex: index, message: 'Kalemin miktar veya fiyat kaynağı doğrulanmamış.' });
    }
    if (item.costUnitPrice === null || item.costUnitPrice === undefined || item.costUnitPrice === '') {
      issues.push({ code: 'COST_MISSING', severity: 'warning', itemIndex: index, message: 'Gerçek maliyet birim fiyatı girilmemiş.' });
    }
    if ((item.quantitySource === 'document' || item.quantitySource === 'model' || item.priceSource === 'supplier') && !item.sourceReference?.trim()) {
      issues.push({ code: 'SOURCE_REFERENCE_MISSING', severity: 'info', itemIndex: index, message: 'Belge/model/tedarikçi kaynağı seçilmiş ancak referans girilmemiş.' });
    }
    return issues;
  });
}
