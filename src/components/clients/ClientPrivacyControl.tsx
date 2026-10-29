import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Status = 'active' | 'requested' | 'hold' | 'masked';
type Action = 'request' | 'hold' | 'release' | 'mask';
const labels: Record<Status, string> = { active: 'Başvuru yok', requested: 'İnceleme bekliyor', hold: 'Beklemeye alındı', masked: 'Kimlik alanları maskelendi' };
export function ClientPrivacyControl({ clientId, onMasked }: { clientId: string; onMasked: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setStatus(null); setError('');
    fetchWithAuth(`/api/clients/${encodeURIComponent(clientId)}/privacy`).then(async response => {
      if (!response.ok) throw new Error('unavailable');
      const body = await response.json();
      if (!Object.hasOwn(labels, body.status)) throw new Error('invalid');
      if (active) setStatus(body.status as Status);
    }).catch(() => { if (active) setError('Başvuru durumu yüklenemedi.'); });
    return () => { active = false; };
  }, [clientId]);
  async function change(action: Action) {
    if (busy) return;
    if (action === 'mask' && !window.confirm('Müşteri adı, iletişim bilgileri ve müşteri notları maskelenecek. Bu işlem geri alınamaz. Teklif tutarları korunur. Devam edilsin mi?')) return;
    setBusy(true); setError('');
    try {
      const response = await fetchWithAuth(`/api/clients/${encodeURIComponent(clientId)}/privacy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      if (!response.ok) throw new Error('unavailable');
      const body = await response.json();
      if (!Object.hasOwn(labels, body.status)) throw new Error('invalid');
      setStatus(body.status as Status);
      if (body.status === 'masked') onMasked();
    } catch { setError('İşlem tamamlanamadı. Durumu yenileyip tekrar deneyin.'); }
    finally { setBusy(false); }
  }
  return <Card data-testid="client-privacy-control"><CardContent className="p-5 space-y-3">
    <h2 className="font-semibold">Müşteri kimlik alanlarını maskele</h2>
    <p className="text-sm">Ad, telefon, e-posta, adres ve müşteri notları maskelenir; teklif ve finansal kayıtlar korunur. Yeniden oluşturulan PDF’lerde müşteri adı maskeli görünür.</p>
    <p className="text-sm text-muted-foreground">Serbest metinler, ayrı aday kayıtları, dosyalar, daha önce indirilen PDF’ler, yedekler ve dış sistemlerdeki kopyalar bu işlemle silinmez. Bu işlem tüm kişisel verilerin silindiğini göstermez; daha sonra aynı kişiye ait bilgiler yeni bir kayıt olarak eklenebilir. Saklama veya itiraz varsa işlemi beklemeye alın ve durumu ayrıca inceleyin.</p>
    <p aria-live="polite">{status ? labels[status] : 'Durum yükleniyor…'}</p>
    {error && <p role="alert">{error}</p>}
    <div className="flex flex-wrap gap-2">
      {status === 'active' && <Button disabled={busy} onClick={() => void change('request')}>İnceleme başlat</Button>}
      {status === 'requested' && <><Button disabled={busy} onClick={() => void change('mask')}>Kimlik alanlarını maskele</Button><Button variant="outline" disabled={busy} onClick={() => void change('hold')}>Beklemeye al</Button></>}
      {status === 'hold' && <Button variant="outline" disabled={busy} onClick={() => void change('release')}>Beklemeyi kaldır</Button>}
    </div>
  </CardContent></Card>;
}
