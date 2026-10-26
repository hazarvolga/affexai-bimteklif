/**
 * Kullanıcıya görünen ortak etiketler (marka.md M-5.3, M-9.3, M-10.5, M-12.3, M-14.4, M-17.2).
 * Kod değerleri (enum) sistemde aynen kalır; ekranda yalnız bu etiketler gösterilir. Teknik karşılık
 * gerekiyorsa "Teknik ayrıntılar" açılırında ayrıca yazılır.
 */

export const SEVERITY_LABEL: Record<"critical" | "error" | "warning" | "info", string> = {
  critical: "Kritik",
  error: "Hata",
  warning: "Uyarı",
  info: "Bilgi",
};

export const REVIEW_STATUS_LABEL: Record<"pending" | "approved" | "rejected", string> = {
  pending: "İnceleme bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

export const SUBMISSION_STATUS_LABEL: Record<"draft" | "awaiting_review" | "approved" | "rejected" | "expired", string> = {
  draft: "Taslak",
  awaiting_review: "İnceleme bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  expired: "Süresi doldu",
};

export const OUTLIER_STATUS_LABEL: Record<"normal" | "outlier" | "insufficient_data", string> = {
  normal: "Olağan fiyat",
  outlier: "Olağandışı fiyat",
  insufficient_data: "Karşılaştırma için yeterli kayıt yok",
};

export const SIGNATURE_CHECK_LABEL: Record<string, string> = {
  not_checked: "kontrol edilmedi",
  passed: "geçti",
  valid: "geçerli",
  failed: "başarısız",
  invalid: "geçersiz",
  unknown: "belirlenemedi",
};

/** Teknik terim → kullanıcı dili. Yeni metin yazarken bu karşılıklar kullanılır. */
export const USER_TERMS = {
  tenant: "firma / çalışma alanı",
  snapshot: "kayıtlı fiyat sürümü",
  reviewer: "inceleyen kişi",
  outlier: "olağandışı fiyat",
  baselineCount: "karşılaştırılan kayıt sayısı",
  provenance: "kaynak",
  hash: "dosya kimliği",
  calmTransfer: "incelenen icmal kalemlerini teklife aktarma",
  successorRevision: "önceki teklif korunarak oluşturulan yeni sürüm",
  immutable: "sonradan değiştirilemeyen kayıtlı sürüm",
  supplierQuote: "tedarikçi teklifi",
  companyActual: "firma gerçekleşen maliyeti",
  byolCatalog: "firma fiyat kataloğunuz",
} as const;

/** Bilinmeyen bir kod değeri gelirse ham kodu değil, nötr bir ifade gösterir. */
export function labelOf<T extends string>(labels: Record<string, string>, value: T | null | undefined, fallback = "belirlenemedi"): string {
  return value != null && Object.hasOwn(labels, value) ? labels[value] : fallback;
}
