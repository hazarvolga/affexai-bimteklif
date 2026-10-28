type Bank = { bankName: string; iban: string; isActive: boolean; accountHolder?: string; branchName?: string | null; currency?: string; descriptionNote?: string | null; description?: string | null };
const labels: Record<string, string> = { name: 'Ad', monthlyPrice: 'Aylık fiyat', monthlyQuoteLimit: 'Teklif kotası', monthlyIfcLimit: 'IFC kotası', ifcMaxFileMb: 'IFC dosya MB', ifcMaxConcurrent: 'Eşzamanlı IFC', monthlyPdfLimit: 'PDF kotası', monthlyAiLimit: 'AI kotası', monthlyCrmLimit: 'CRM kotası', monthlyRegulationLimit: 'Mevzuat kotası', monthlyProfitAnalysisLimit: 'Kârlılık kotası', maxDocuments: 'Belge kotası', storageMaxBytes: 'Depolama bayt', isActive: 'Aktif', isPublished: 'Yayında', isTrial: 'Deneme', isFeatured: 'Öne çıkan', displayOrder: 'Sıralama', marketingBadge: 'Paket rozeti', marketingDescription: 'Açıklama', replacementPlanId: 'Alternatif paket', planId: 'Paket', status: 'Durum', bonusQuoteLimit: 'Ek teklif kotası', bonusIfcLimit: 'Ek IFC kotası' };
const display = (value: unknown) => value === undefined ? 'Bilinmiyor' : value === null ? 'Belirtilmemiş' : typeof value === 'boolean' ? value ? 'Evet' : 'Hayır' : String(value);
export const affectedCount = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? String(value) : 'Bilinmiyor';
export const planIdentity = (name: string | undefined, id: string | null | undefined) => id ? `${name || 'Bilinmeyen paket'} (${id})` : 'Paket yok';
export const PREVIEW_STALE_NOTICE = 'Önizleme yüklenen verilere dayanır; başka bir yönetici değişiklik yapmış olabilir. Kaydetmeden önce verileri yenileyin.';
export function previewChanges(before: Record<string, unknown>, after: Record<string, unknown>, fields: readonly string[]) {
  const rows = fields.filter(key => before[key] !== after[key]).map(key => `${labels[key] ?? key}: ${display(before[key])} → ${display(after[key])}`);
  return rows.length ? rows.join('\n') : 'Değişiklik yok.';
}
export function previewBanks(before: readonly Bank[], after: readonly Bank[]) {
  const list = (accounts: readonly Bank[]) => accounts.length ? accounts.map(item => `${item.bankName || 'Banka belirtilmedi'} · IBAN ****${item.iban.replace(/\s/g, '').slice(-4)} · ${item.isActive ? 'Aktif' : 'Pasif'} · ${item.currency ?? 'Para birimi bilinmiyor'}`).join('\n') : 'Hesap yok';
  const extraChanged = before.length !== after.length || before.some((item, index) => ['accountHolder', 'branchName', 'descriptionNote', 'description'].some(key => item[key as keyof Bank] !== after[index]?.[key as keyof Bank]));
  const ibanChanged = before.length !== after.length || before.some((item, index) => item.iban.replace(/[\s-]/g, '').toUpperCase() !== after[index]?.iban.replace(/[\s-]/g, '').toUpperCase());
  return `Önce:\n${list(before)}\n\nSonra:\n${list(after)}\n\n${ibanChanged ? 'IBAN değişti' : 'IBAN değişmedi'}\nAlıcı/şube/açıklama: ${extraChanged ? 'Değişiklik var; ayrıntılar maskeli' : 'Değişiklik yok'}\nEtkilenen firma sayısı: Bilinmiyor`;
}
