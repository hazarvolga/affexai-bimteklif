import { useEffect, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { fetchWithAuth } from '../../lib/api';
import type { AuditItem, AuditPage } from '../../server/routes/admin-logs';

const actions: Record<string, string> = { 'plan.created': 'Paket oluşturuldu', 'plan.updated': 'Paket güncellendi', 'subscription.updated': 'Abonelik güncellendi', other: 'Diğer işlem' };
const fields: Record<string, string> = { id: 'Kayıt', planId: 'Paket', companyId: 'Firma', monthlyQuoteLimit: 'Aylık teklif kotası', monthlyPrice: 'Aylık fiyat', bonusQuoteLimit: 'Ek teklif kotası', isActive: 'Aktif', status: 'Durum', plan: 'Paket türü', billingCycle: 'Fatura dönemi' };
const display = (value: string | number | boolean | null | undefined) => value == null ? '—' : typeof value === 'boolean' ? value ? 'Evet' : 'Hayır' : String(value);

function AuditDetails({ item }: { item: AuditItem }) {
  const keys = [...new Set([...Object.keys(item.details.before ?? {}), ...Object.keys(item.details.after ?? {})])];
  if (!keys.length) return <p className="text-sm text-muted-foreground">Ayrıntı yok.</p>;
  return <details className="mt-3">
    <summary className="w-fit cursor-pointer text-sm text-teal-300">Değişiklikler</summary>
    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground" aria-hidden="true"><span>Alan</span><span>Önce</span><span>Sonra</span></div>
    <dl className="mt-1 divide-y divide-border">
      {keys.map(key => <div key={key} className="grid grid-cols-3 gap-2 py-2 text-sm [overflow-wrap:anywhere]">
        <dt className="text-muted-foreground">{fields[key] ?? key}</dt>
        <dd className="min-w-0 text-muted-foreground"><span className="sr-only">Önce: </span>{display(item.details.before?.[key])}</dd>
        <dd className="min-w-0 text-foreground"><span className="sr-only">Sonra: </span>{display(item.details.after?.[key])}</dd>
      </div>)}
    </dl>
  </details>;
}

export function AdminLogs() {
  const [page, setPage] = useState<AuditPage | null>(null);
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [limit, setLimit] = useState(25);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const cursor = cursors.at(-1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setPage(null);
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    void fetchWithAuth(`/api/admin/logs?${params}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 403 ? 'Bu kayıtları görüntüleme yetkiniz yok.' : 'Denetim kayıtları yüklenemedi.');
        const data: AuditPage = await response.json();
        if (!controller.signal.aborted) setPage(data);
      }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Denetim kayıtları yüklenemedi.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [cursor, limit, revision]);
  const refresh = () => { setCursors([null]); setRevision(value => value + 1); };
  const iconButton = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface-elevated disabled:opacity-40';

  return <PageContainer>
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="flex items-center gap-3 text-2xl font-semibold text-foreground"><Activity size={22} className="shrink-0 text-teal-400" />Denetim Logları</h1>
      <button type="button" className={iconButton} onClick={refresh} disabled={loading} aria-label="Yenile" title="Yenile"><RefreshCw size={18} /></button>
    </header>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">Sayfa başına
        <select aria-label="Sayfa başına kayıt" className="h-9 rounded-md border border-border bg-card px-2 text-foreground" value={limit} onChange={event => { setLimit(Number(event.target.value)); setCursors([null]); }}>
          {[10, 25, 50, 100].map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Sayfa {cursors.length}</span>
        <button type="button" className={iconButton} title="Önceki sayfa" aria-label="Önceki sayfa" disabled={loading || cursors.length === 1} onClick={() => setCursors(value => value.slice(0, -1))}><ChevronLeft size={18} /></button>
        <button type="button" className={iconButton} title="Sonraki sayfa" aria-label="Sonraki sayfa" disabled={loading || !page?.nextCursor} onClick={() => { if (page?.nextCursor) setCursors(value => [...value, page.nextCursor]); }}><ChevronRight size={18} /></button>
      </div>
    </div>
    <section aria-label="Denetim kayıtları" aria-busy={loading}>
      {loading && <p role="status" className="py-8 text-sm text-muted-foreground">Yükleniyor...</p>}
      {!loading && error && <div role="alert" className="py-8 text-sm text-red-300"><p>{error}</p><button type="button" onClick={() => setRevision(value => value + 1)} className="mt-3 underline underline-offset-4">Tekrar dene</button></div>}
      {!loading && !error && page?.items.length === 0 && <p role="status" className="py-8 text-sm text-muted-foreground">Denetim kaydı bulunamadı.</p>}
      {!loading && !error && page?.items.map(item => <article key={item.id} className="border-b border-border py-5 [overflow-wrap:anywhere]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{actions[item.action] ?? actions.other}</h2>
          <time dateTime={item.createdAt} className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('tr-TR')}</time>
        </div>
        <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
          <div className="min-w-0"><dt className="text-muted-foreground">Yönetici</dt><dd className="mt-1 font-mono text-foreground dark:text-muted-foreground">{item.adminId}</dd></div>
          <div className="min-w-0"><dt className="text-muted-foreground">Firma</dt><dd className="mt-1 font-mono text-foreground dark:text-muted-foreground">{item.targetCompanyId ?? 'Platform'}</dd></div>
        </dl>
        <AuditDetails item={item} />
      </article>)}
    </section>
  </PageContainer>;
}
