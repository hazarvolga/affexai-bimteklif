const labels: Record<string, string> = {
  'plan.created': 'Paket oluşturuldu', 'plan.updated': 'Paket güncellendi', 'plan_catalog.synced': 'Paket kataloğu eşitlendi',
  'subscription.updated': 'Abonelik güncellendi', 'company.updated': 'Firma güncellendi', 'member.role_updated': 'Üye rolü güncellendi',
  'member.expert_granted': 'Uzman yetkisi verildi', 'member.expert_revoked': 'Uzman yetkisi kaldırıldı',
  'impersonation.started': 'Firma oturumu başlatıldı', 'impersonation.ended': 'Firma oturumu sonlandırıldı',
  processing_retried: 'İşlem yeniden kuyruğa alındı', processing_stale_recovered: 'Bekleyen işlem kurtarıldı',
  'billing.bank_accounts.updated': 'Banka hesapları güncellendi', 'billing.payment_request.created': 'Ödeme talebi oluşturuldu',
  'billing.payment_request.submitted': 'Ödeme bildirimi gönderildi', 'billing.payment_request.approved': 'Ödeme bildirimi onaylandı',
  'billing.payment_request.rejected': 'Ödeme bildirimi reddedildi', pricing_source_catalog_synced: 'Fiyat kaynakları eşitlendi',
  pricing_source_created: 'Fiyat kaynağı oluşturuldu', pricing_source_verified: 'Fiyat kaynağı doğrulandı',
  pricing_source_deleted: 'Fiyat kaynağı silindi', pricing_source_crawled: 'Fiyat kaynağı tarandı',
  price_feed_approve: 'Fiyat satırı onaylandı', price_feed_reject: 'Fiyat satırı reddedildi',
  price_feed_bulk_approve: 'Fiyat satırları toplu onaylandı', price_feed_bulk_reject: 'Fiyat satırları toplu reddedildi',
  nightly_batch_crawl_completed: 'Zamanlanmış fiyat taraması tamamlandı', nightly_batch_crawl_failed: 'Zamanlanmış fiyat taraması başarısız',
};

export const auditActionLabel = (action: string): string => Object.hasOwn(labels, action) ? labels[action] : action === 'other' ? 'Diğer işlem' : `Diğer işlem (${action})`;
export const auditTimestampLabel = (value: string): string => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/.test(value) ? `${value.replace('T', ' ')} · Saat dilimi belirtilmemiş` : 'Tarih bilgisi okunamadı';
export const auditOutcomeLabel = (action: string): string => {
  if (action.endsWith('.rejected') || action.endsWith('_reject')) return 'Reddedildi';
  if (action.endsWith('_failed')) return 'Başarısız';
  if (action.endsWith('.approved') || action.endsWith('_approve')) return 'Onaylandı';
  if (action === 'processing_retried') return 'Kuyruğa alındı';
  return 'Kayıt oluşturuldu';
};
