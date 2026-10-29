import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api';
import { SourcePermissionReview } from './SourcePermissionReview';

type Source = { id: string; name: string; reviewStatus: string };
type Page = { companyId: string | null; sources: Source[]; nextCursor: string | null };
export function TenantSourcePermissionList() {
  const { role, company, user } = useAuth();
  const allowed = (role === 'owner' || role === 'admin') && !user?.impersonatedBy;
  const [page, setPage] = useState<Page>({ companyId: null, sources: [], nextCursor: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const cursor = cursors.at(-1) ?? null;
  const current = page.companyId === company?.id ? page : { companyId: null, sources: [], nextCursor: null };
  useEffect(() => { setCursors([null]); setSearch(''); setQuery(''); }, [company?.id]);
  useEffect(() => {
    let active = true; setPage({ companyId: company?.id ?? null, sources: [], nextCursor: null }); setError(false);
    if (!allowed || !company?.id) return () => { active = false; };
    const params = new URLSearchParams(); if (query) params.set('q', query); if (cursor) params.set('cursor', cursor);
    setLoading(true);
    fetchWithAuth(`/api/pricing/source-permission-reviews?${params}`).then(async response => {
      if (!response.ok) throw new Error('sources_unavailable');
      const body = await response.json() as {items?: unknown; nextCursor?: unknown};
      if (!Array.isArray(body.items) || (body.nextCursor !== null && typeof body.nextCursor !== 'string')) throw new Error('sources_invalid');
      if (active) setPage({ companyId: company.id, sources: body.items as Source[], nextCursor: body.nextCursor as string | null });
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, company?.id, attempt, query, cursor]);
  if (!allowed) return null;
  return <section className="rounded-xl border border-border bg-card p-5" aria-label="Fiyat kaynakları kullanım izni">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">Fiyat kaynakları · teklif kullanım izni</h2><button type="button" className="text-xs underline" onClick={() => setAttempt(value => value + 1)} disabled={loading}>Kaynakları yenile</button></div>
    <p className="mt-1 text-xs text-muted-foreground">Fiyat satırı onayı ile kaynağın kullanım izni ayrı incelemelerdir. İzni incelenmeyen fiyatlar yeni tekliflere eklenemez.</p>
    <form className="mt-3 flex gap-2" onSubmit={event => { event.preventDefault(); setCursors([null]); setQuery(search.trim()); }}>
      <label className="sr-only" htmlFor="permission-source-search">Kaynak adı veya belge numarası</label>
      <input id="permission-source-search" maxLength={100} className="min-w-0 flex-1 rounded border border-border bg-background p-2 text-xs" placeholder="Kaynak adı veya belge numarası" value={search} onChange={event => setSearch(event.target.value)} />
      <button className="rounded border border-border px-3 text-xs" type="submit">Ara</button>
    </form>
    {loading ? <p role="status" className="mt-3 text-xs">Kaynaklar yükleniyor…</p> : null}
    {error ? <p role="alert" className="mt-3 text-xs text-destructive">Kaynaklar yüklenemedi. <button className="underline" onClick={() => setAttempt(value => value + 1)}>Yeniden dene</button></p> : null}
    {!loading && !error && current.sources.length === 0 ? <p className="mt-3 text-xs">Bu aramada fiyat kaynağı bulunamadı.</p> : null}
    {current.sources.map(source => <div className="mt-3 rounded border border-border p-3" key={source.id}><p className="text-sm font-medium">{source.name}</p><SourcePermissionReview sourceId={source.id} mode="tenant" /></div>)}
    <div className="mt-3 flex gap-2 text-xs"><button type="button" className="rounded border border-border px-3 py-1 disabled:opacity-40" disabled={loading || cursors.length === 1} onClick={() => setCursors(values => values.slice(0,-1))}>Önceki</button><button type="button" className="rounded border border-border px-3 py-1 disabled:opacity-40" disabled={loading || !current.nextCursor} onClick={() => current.nextCursor && setCursors(values => [...values,current.nextCursor])}>Sonraki</button></div>
  </section>;
}
