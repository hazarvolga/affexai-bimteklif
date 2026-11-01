import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/button';
import { fetchWithAuth } from '../../lib/api';

interface WatchItem {
  id: string;
  source: 'resmi_gazete' | 'gib';
  matchScope: 'title' | 'body';
  region: string | null;
  issueDate: string;
  title: string;
  url: string;
  matchedKeywords: string[];
  status: 'new' | 'reviewed' | 'dismissed';
  reviewNote: string | null;
}

interface WatchDay {
  source: 'resmi_gazete' | 'gib';
  issueDate: string;
  unreadCount: number;
  status: 'checked' | 'failed';
  matchedCount: number;
  errorCode: string | null;
}

const SOURCE_LABEL: Record<WatchItem['source'], string> = { resmi_gazete: 'Resmî Gazete', gib: 'GİB' };
const STATUS_LABEL: Record<WatchItem['status'], string> = { new: 'Yeni', reviewed: 'İncelendi', dismissed: 'İlgisiz' };

export function RegulationWatch() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [days, setDays] = useState<WatchDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetchWithAuth('/api/admin/regulation-watch');
      if (!res.ok) throw new Error('REGULATION_WATCH_UNAVAILABLE');
      const body = await res.json();
      setItems(body.items);
      setDays(body.days);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const review = async (id: string, status: 'reviewed' | 'dismissed') => {
    setSavingId(id);
    try {
      const res = await fetchWithAuth(`/api/admin/regulation-watch/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error('REGULATION_WATCH_REVIEW_FAILED');
      setItems(current => current.map(item => (item.id === id ? { ...item, status } : item)));
    } catch {
      toast.error('İnceleme kaydedilemedi. Yeniden deneyin.');
    } finally {
      setSavingId(null);
    }
  };

  const failedDays = days.filter(day => day.status === 'failed');
  const lastChecked = (source: WatchItem['source']) => days.find(day => day.source === source && day.status === 'checked')?.issueDate ?? 'Henüz yok';
  const unreadPdfs = days.filter(day => day.source === 'resmi_gazete').reduce((sum, day) => sum + day.unreadCount, 0);

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Mevzuat Bekçisi</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Resmî Gazete ve GİB duyurularını vergi, ihale ve yapı konularında tarar. Buradaki kayıtlar hiçbir oranı değiştirmez; metni okuyup gerekirse oranı ayrıca güncelleyin.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <p>Son başarılı kontrol: Resmî Gazete <b>{lastChecked('resmi_gazete')}</b>, GİB <b>{lastChecked('gib')}</b></p>
          {unreadPdfs > 0 && (
            <p className="mt-2 text-muted-foreground">Son günlerde {unreadPdfs} PDF kararın metni okunamadı veya uzun olduğu için yalnız ilk 20 sayfası okundu. Önemli günlerde Gazete'ye ayrıca göz atın.</p>
          )}
          {failedDays.length > 0 && (
            <p className="mt-2 text-destructive">
              Kontrol edilemeyen günler: {failedDays.map(day => `${SOURCE_LABEL[day.source]} ${day.issueDate} (${day.errorCode ?? 'bilinmiyor'})`).join(', ')}. Bu günlerde değişiklik kaçmış olabilir.
            </p>
          )}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
        {loadFailed && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-destructive">Kayıtlar yüklenemedi.</span>
            <Button variant="outline" size="sm" onClick={() => void load()}>Yeniden dene</Button>
          </div>
        )}
        {!loading && !loadFailed && items.length === 0 && (
          <p className="text-sm text-muted-foreground">Eşleşen kayıt yok. İlk tarama uygulama açıldıktan yaklaşık bir dakika sonra çalışır.</p>
        )}

        <ul className="space-y-3">
          {items.map(item => (
            <li key={item.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{SOURCE_LABEL[item.source]}{item.region ? ` (${item.region})` : ''} · {item.issueDate} · {STATUS_LABEL[item.status]} · {item.matchScope === 'body' ? 'Metinde geçiyor' : 'Başlıkta'}: {item.matchedKeywords.join(', ')}</p>
                  <a href={item.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-start gap-1 font-medium hover:underline">
                    {item.title}<ExternalLink size={14} className="mt-1 shrink-0" />
                  </a>
                </div>
                {item.status === 'new' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={savingId === item.id} onClick={() => void review(item.id, 'dismissed')}>İlgisiz</Button>
                    <Button size="sm" disabled={savingId === item.id} onClick={() => void review(item.id, 'reviewed')}>İncelendi</Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PageContainer>
  );
}
