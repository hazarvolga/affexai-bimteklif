import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';

type Review = { id: string; name: string; reviewStatus: string; reviewEvidenceReference: string | null; reviewScope: string | null; reviewAllowsQuotations: boolean; reviewedByUserId: string | null; reviewedAt: string | null };
type Props = { sourceId: string; mode: 'tenant' | 'global' };

/** Permission review is separate from price-row approval and does not validate the document's legal effect. */
export function SourcePermissionReview({ sourceId, mode }: Props) {
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [scope, setScope] = useState('');
  const [allowed, setAllowed] = useState(false);
  const url = mode === 'tenant' ? `/api/pricing/sources/${sourceId}/permission-review` : `/api/admin/pricing-sources/${sourceId}/permission-review`;
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetchWithAuth(url);
      if (!response.ok) throw new Error('İzin incelemesi yüklenemedi.');
      const value = await response.json() as Review;
      setReview(value); setReference(value.reviewEvidenceReference ?? ''); setScope(value.reviewScope ?? ''); setAllowed(false);
    } catch { setError('İzin incelemesi yüklenemedi. Yeniden deneyin.'); } finally { setLoading(false); }
  };
  useEffect(() => { if (open) void load(); }, [open, url]);
  const save = async (action: 'verify' | 'revoke') => {
    setSaving(true); setError(null);
    try {
      const response = await fetchWithAuth(url, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action === 'verify' ? { action, reference: reference.trim(), scope: scope.trim(), allowsQuotations: allowed } : { action }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'İzin incelemesi kaydedilemedi.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'İzin incelemesi kaydedilemedi.'); } finally { setSaving(false); }
  };
  const status = review?.reviewStatus === 'verified' ? 'Teklif kullanımı incelendi' : review?.reviewStatus === 'revoked' ? 'İzin iptal edildi' : 'İzin incelemesi bekliyor';
  return <section className="mt-3 border-t border-border pt-3" data-testid="source-permission-review">
    <Button type="button" size="sm" variant="outline" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'İzin incelemesini kapat' : 'Teklif kullanım iznini incele'}</Button>
    {open && <div className="mt-3 space-y-3 text-xs">
      {loading ? <p role="status">İzin incelemesi yükleniyor…</p> : null}
      {error ? <p role="alert" className="text-destructive">{error} <button type="button" className="underline" onClick={() => void load()}>Yeniden yükle</button></p> : null}
      {review && !loading ? <>
        <p><strong>{status}</strong>{review.reviewedAt ? ` · ${new Date(review.reviewedAt).toLocaleString('tr-TR')} · İnceleyen: ${review.reviewedByUserId}` : ''}</p>
        <p className="text-muted-foreground">Bu kayıt fiyat doğruluğunu veya belgenin hukuki geçerliliğini otomatik doğrulamaz. Kaynağın tekliflerde kullanım hakkını yetkili kişi incelemelidir.</p>
        <label className="block">İzin belgesi veya kaynak bağlantısı (HTTPS, sorgu parametresi olmadan)
          <input className="mt-1 w-full rounded border border-border bg-background p-2" type="url" value={reference} onChange={event => setReference(event.target.value)} placeholder="https://ornek.com/izin-belgesi" />
        </label>
        <label className="block">Kullanım kapsamı
          <textarea className="mt-1 w-full rounded border border-border bg-background p-2" rows={2} value={scope} onChange={event => setScope(event.target.value)} placeholder="İzin verilen kullanımın kapsamını açıklayın" />
        </label>
        <label className="flex items-start gap-2"><input type="checkbox" checked={allowed} onChange={event => setAllowed(event.target.checked)} /> Belgeyi ve kapsamı inceledim; bu kaynak fiyatlarının ticari tekliflerde kullanılmasına izin verildiğini teyit ediyorum.</label>
        <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={saving || !allowed || !reference.trim() || !scope.trim()} onClick={() => void save('verify')}>{saving ? 'Kaydediliyor…' : 'İncelemeyi kaydet'}</Button>
          {review.reviewStatus === 'verified' ? <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void save('revoke')}>Teklif kullanım iznini iptal et</Button> : null}</div>
      </> : null}
    </div>}
  </section>;
}
