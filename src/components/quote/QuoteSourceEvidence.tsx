import React from 'react';

type Evidence = { quantity: Array<{ quantity: string | null; unit: string | null; sourceCellRange: string | null; reviewStatus: string | null }>; price: Array<{ amount: string | null; currency: string | null; unit: string | null; zeroPriceReason?: string | null }> };
type Props = { quantitySource: string | null; priceSource: string | null; verificationStatus: string | null; quantity: string; unit: string; unitPrice: string; currency: string; evidence: Evidence };
const source = (value: string | null) => ({ manual: 'Manuel', document: 'Belge / SmartCheck', ifc_qto: 'IFC QTO', ifc_property: 'IFC özelliği', snapshot: 'Fiyat kaydı', ai_estimate: 'AI tahmini', market: 'Piyasa' } as Record<string, string>)[value ?? ''] ?? 'Bilinmiyor';
const review = (value: string | null) => ({ approved: 'Onaylandı', accepted_exception: 'İstisna ile kabul', rejected: 'Reddedildi', pending_review: 'İnceleme bekliyor', needs_review: 'İnceleme gerekli', verified: 'İncelendi', unverified: 'İncelenmemiş' } as Record<string, string>)[value ?? ''] ?? 'Bilinmiyor';
const value = (v: string | null) => v ?? 'Bilinmiyor';

export function QuoteSourceEvidence(props: Props) {
  const { evidence } = props;
  return <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium text-primary">Bu sayı nasıl oluştu?</summary>
    <div className="mt-2 space-y-1 rounded-md border border-border p-3">
      <p>Teklifteki miktar: {props.quantity} {props.unit} · Birim fiyat: {props.unitPrice} {props.currency}</p>
      <p>Miktar kaynağı: {source(props.quantitySource)} · Fiyat kaynağı: {source(props.priceSource)} · Teklif satırı durumu: {review(props.verificationStatus)}</p>
      {evidence.quantity.length ? evidence.quantity.map((entry, index) => <p key={index}>Kanıtta kaydedilen miktar: {value(entry.quantity)} {entry.unit ?? ''} · Kaynak satır: {value(entry.sourceCellRange)} · Kaynak incelemesi: {review(entry.reviewStatus)}</p>) : <p>Kaydedilen miktar kanıtı: Bilinmiyor</p>}
      {evidence.price.length ? evidence.price.map((entry, index) => <p key={index}>Kanıtta kaydedilen fiyat: {value(entry.amount)} {entry.currency ?? ''} {entry.unit ? `/ ${entry.unit}` : ''}{entry.zeroPriceReason ? ` · Bedelsiz gerekçesi: ${entry.zeroPriceReason}` : ''}</p>) : <p>Kaydedilen fiyat kanıtı: Bilinmiyor</p>}
      <p>Kanıtta kaydedilen değerler güncel kaynak satırı değildir; teklif değerleri farklı olabilir. İnceleme mühendislik doğrulamasının yerine geçmez.</p>
    </div>
  </details>;
}
