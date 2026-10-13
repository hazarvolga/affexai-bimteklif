export type AuditSeverity = 'info' | 'warning';

export interface QuotationAuditIssue {
  code: 'SOURCE_UNVERIFIED' | 'COST_MISSING' | 'PRICE_MISSING' | 'SOURCE_REFERENCE_MISSING';
  severity: AuditSeverity;
  itemIndex: number;
  message: string;
  academyGuidance: {
    lessonSlug: 'bim-basics-openbim' | 'bar-schedules-takeoffs';
    label: string;
  };
}

const sourceGuidance = {
  lessonSlug: 'bim-basics-openbim',
  label: 'BIM Basics & openBIM dersini aç',
} as const;

const costGuidance = {
  lessonSlug: 'bar-schedules-takeoffs',
  label: 'Bar Schedules & Takeoffs dersini aç',
} as const;

export function auditQuotationItems(items: Array<{
  quantitySource?: string | null;
  priceSource?: string | null;
  sourceReference?: string | null;
  verificationStatus?: string | null;
  costUnitPrice?: number | string | null;
  unitPrice?: number | string | null;
}>): QuotationAuditIssue[] {
  return items.flatMap((item, index) => {
    const issues: QuotationAuditIssue[] = [];
    if (item.quantitySource === 'ai_estimate' || item.priceSource === 'ai_estimate' || item.verificationStatus !== 'verified') {
      issues.push({ code: 'SOURCE_UNVERIFIED', severity: 'warning', itemIndex: index, message: 'Kalemin miktar veya fiyat kaynağı doğrulanmamış.', academyGuidance: sourceGuidance });
    }
    if ('unitPrice' in item && !(Number(item.unitPrice) > 0)) {
      issues.push({ code: 'PRICE_MISSING', severity: 'warning', itemIndex: index, message: 'Birim fiyat girilmemiş; kalem 0 TL olarak teklife girer.', academyGuidance: costGuidance });
    }
    if (item.costUnitPrice === null || item.costUnitPrice === undefined || item.costUnitPrice === '') {
      issues.push({ code: 'COST_MISSING', severity: 'warning', itemIndex: index, message: 'Gerçek maliyet birim fiyatı girilmemiş.', academyGuidance: costGuidance });
    }
    if ((item.quantitySource === 'document' || item.quantitySource === 'model' || item.priceSource === 'supplier') && !item.sourceReference?.trim()) {
      issues.push({ code: 'SOURCE_REFERENCE_MISSING', severity: 'info', itemIndex: index, message: 'Belge/model/tedarikçi kaynağı seçilmiş ancak referans girilmemiş.', academyGuidance: sourceGuidance });
    }
    return issues;
  });
}
