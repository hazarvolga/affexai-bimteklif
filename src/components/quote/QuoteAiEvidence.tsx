type Field = 'description' | 'unit' | 'quantity' | 'unitPrice';
export type AiEvidence = { original: { description: string; unit: string; quantity: number; unitPrice: number }; changedFields: Field[] };
const labels: Record<Field, string> = { description: 'Açıklama', unit: 'Birim', quantity: 'Miktar', unitPrice: 'Birim fiyat' };

export function QuoteAiEvidence({ evidence }: { evidence: AiEvidence | null; currency: string }) {
  if (!evidence) return null;
  const { original, changedFields } = evidence;
  return <details className="mt-2 text-xs text-muted-foreground">
    <summary className="cursor-pointer font-medium">AI önerisi nasıl değişti?</summary>
    <div className="mt-2 space-y-1">
      <p>İlk AI önerisi: {original.description} · {original.quantity.toLocaleString('tr-TR')} {original.unit} · {original.unitPrice.toLocaleString('tr-TR')}/birim (para birimi belirtilmedi)</p>
      <p>Değiştirilen alanlar: {changedFields.length ? changedFields.map(field => labels[field]).join(', ') : 'Yok'}</p>
      <p>AI tahmini doğrulanmış metraj veya fiyat değildir; kullanmadan önce uzman kontrolü gerekir.</p>
    </div>
  </details>;
}
