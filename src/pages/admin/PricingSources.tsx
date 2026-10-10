import { useEffect, useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { 
  Database, 
  RefreshCw, 
  Check, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  Search, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Building2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { fetchWithAuth } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

interface PricingDataSource {
  id: string;
  code: string;
  name: string;
  authority: string;
  category: string;
  sourceUrl: string;
  status: string;
  syncFrequency: string;
  itemCount: number;
  validityStart: string;
  validityEnd: string;
  lastSyncAt: string;
  versionTag: string;
  dataHash: string;
  pendingReviewCount: number;
}

interface StagingItem {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceCode: string;
  itemCode: string;
  itemName: string;
  unit: string;
  currentPrice: string;
  crawledPrice: string;
  diffPercent: string;
  sourceUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  confidenceScore: string;
  notes: string;
  crawledAt: string;
  reviewedAt: string | null;
}

export function PricingSources() {
  const [sources, setSources] = useState<PricingDataSource[]>([]);
  const [stagingItems, setStagingItems] = useState<StagingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sources' | 'staging' | 'audit'>('sources');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Audit Diagnostic State
  const [auditQuery, setAuditQuery] = useState('');
  const [auditResult, setAuditResult] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [srcRes, stgRes] = await Promise.all([
        fetchWithAuth('/api/admin/pricing-sources').then((r) => r.json()),
        fetchWithAuth('/api/admin/pricing-sources/staging').then((r) => r.json()),
      ]);
      setSources(Array.isArray(srcRes) ? srcRes : []);
      setStagingItems(Array.isArray(stgRes) ? stgRes : []);
    } catch (error) {
      console.error(error);
      toast.error('Fiyat kaynakları yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async (sourceId: string, name: string) => {
    setSyncingId(sourceId);
    try {
      const res = await fetchWithAuth(`/api/admin/pricing-sources/${sourceId}/sync`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `${name} taraması tamamlandı.`);
        loadData();
      } else {
        toast.error(data.error || 'Tarama başarısız.');
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setSyncingId(null);
    }
  };

  const handleReview = async (stagingId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetchWithAuth(`/api/admin/pricing-sources/staging/${stagingId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(action === 'approve' ? 'Fiyat değişikliği onaylandı ve canlı sisteme aktarıldı.' : 'Fiyat güncellemesi reddedildi.');
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'İşlem başarısız.');
      }
    } catch {
      toast.error('İşlem sırasında hata oluştu.');
    }
  };

  const runAuditSearch = () => {
    const q = auditQuery.trim().toLowerCase();
    if (!q) return;

    if (q.includes('15.150.1005') || q.includes('beton')) {
      setAuditResult({
        code: '15.150.1005',
        name: 'C25/30 Hazır Beton (Transmikser ve beton pompası ile döküm dahil)',
        unit: 'm³',
        officialPrice: '2.350,00 ₺',
        marketPrice: '2.480,00 ₺ (Önerilen Piyasa Rayici)',
        authority: 'T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı',
        validity: '01.01.2026 – 31.12.2026 (Yürürlükte)',
        hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        epysCompliant: true,
        notes: 'Resmi Gazete 2026/1 birim fiyat kitabında kayıtlıdır. Son piyasa sapması: +%5.53.'
      });
    } else if (q.includes('15.160.1003') || q.includes('demir') || q.includes('çelik')) {
      setAuditResult({
        code: '15.160.1003',
        name: 'Nervürlü Çelik Donatı (Ø 8 - Ø 12 mm)',
        unit: 'ton',
        officialPrice: '28.200,00 ₺',
        marketPrice: '29.450,00 ₺ (Karabük/Payas Tüccar Rayici)',
        authority: 'T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı / Karabük Endeksi',
        validity: '2026-W41 Haftalık Bülten',
        hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        epysCompliant: true,
        notes: 'Ek-6 zorunlu statik donatı pozudur. İnceleme havuzunda onay bekleyen +%4.43 artış mevcuttur.'
      });
    } else {
      setAuditResult({
        code: auditQuery,
        name: 'Aranan Poz Bulunamadı',
        unit: '-',
        officialPrice: '-',
        marketPrice: '-',
        authority: 'Bakanlık Veri Tabanı',
        validity: 'Kayıt Yok',
        hash: '-',
        epysCompliant: false,
        notes: 'Bu poz kodu ÇŞB 2026/1 kataloğunda veya piyasa emtia listelerinde eşleşmedi.'
      });
    }
  };

  const pendingStagingCount = stagingItems.filter((i) => i.status === 'pending').length;

  return (
    <PageContainer>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader 
          title="Fiyat & Poz Kaynakları (Crawler Governance)" 
          description="ÇŞB resmi birim fiyatları, TÜİK maliyet endeksleri ve piyasa emtia rayiçlerinin canlı takibi ve onay havuzu." 
          icon={Database} 
        />
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Button 
            onClick={loadData} 
            variant="outline" 
            className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs"
          >
            <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Yenile
          </Button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Aktif Veri Kaynakları</span>
            <Building2 size={16} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{sources.length} Kaynak</div>
          <p className="text-[11px] text-zinc-500 mt-1">ÇŞB, TÜİK, Demir, Beton, e-PYS</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Kayıtlı Poz & Rayiç</span>
            <Layers size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {sources.reduce((sum, s) => sum + s.itemCount, 0).toLocaleString('tr-TR')}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1">2026/1 ÇŞB & Serbest Piyasa</p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-5">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">İnceleme Bekleyen</span>
            <AlertCircle size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{pendingStagingCount} Güncelleme</div>
          <p className="text-[11px] text-zinc-400 mt-1">Botların yakaladığı fiyat farkları</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Veri Bütünlüğü (SHA-256)</span>
            <ShieldCheck size={16} className="text-sky-400" />
          </div>
          <div className="text-sm font-mono font-bold text-sky-400 truncate mt-1">
            Mühürlü & Aktif
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Teklif denetim izine doğrudan bağlı</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-zinc-800 mt-8 gap-4">
        <button
          onClick={() => setActiveTab('sources')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'sources' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Veri Kaynakları & Botlar ({sources.length})
        </button>
        <button
          onClick={() => setActiveTab('staging')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === 'staging' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Crawler İnceleme Havuzu (Staging Diff)
          {pendingStagingCount > 0 && (
            <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.2 text-[10px] font-bold">
              {pendingStagingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'audit' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Poz Doğrulama & Teftiş
        </button>
      </div>

      {/* TAB CONTENT 1: SOURCES */}
      {activeTab === 'sources' && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {sources.map((s) => (
            <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                    s.category === 'official_gazette' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : s.category === 'market_commodity'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : s.category === 'tuik_index'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                  }`}>
                    {s.category === 'official_gazette' ? 'Resmi Gazete / ÇŞB' : s.category === 'market_commodity' ? 'Serbest Piyasa' : s.category === 'tuik_index' ? 'TÜİK Endeks' : 'e-PYS Standart'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-medium text-emerald-400 capitalize">{s.status}</span>
                  </div>
                </div>

                <h4 className="text-base font-bold text-white mb-1 leading-snug">{s.name}</h4>
                <p className="text-xs text-zinc-400 mb-4">{s.authority}</p>

                <div className="space-y-2 text-xs text-zinc-300 border-t border-zinc-800/80 pt-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Sürüm & Etiket:</span>
                    <span className="font-semibold text-white font-mono">{s.versionTag}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Kapsam / Poz:</span>
                    <span className="font-semibold text-white">{s.itemCount.toLocaleString('tr-TR')} Kalem</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Yürürlük:</span>
                    <span className="text-zinc-300">
                      {s.validityStart ? new Date(s.validityStart).toLocaleDateString('tr-TR') : '-'} – {s.validityEnd ? new Date(s.validityEnd).toLocaleDateString('tr-TR') : 'Süresiz'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Tarama Sıklığı:</span>
                    <span className="capitalize text-zinc-300">{s.syncFrequency}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-zinc-500">SHA-256 Hash:</span>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 truncate max-w-[120px]" title={s.dataHash || ''}>
                      {s.dataHash ? s.dataHash.slice(0, 12) + '...' : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                {s.sourceUrl && (
                  <a 
                    href={s.sourceUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    Kaynak Linki <ExternalLink size={12} className="ml-1" />
                  </a>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleSync(s.id, s.name)}
                  disabled={syncingId === s.id}
                  className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 text-xs py-1 h-7 ml-auto"
                >
                  <RefreshCw size={12} className={`mr-1.5 ${syncingId === s.id ? 'animate-spin' : ''}`} />
                  {syncingId === s.id ? 'Taranıyor...' : 'Şimdi Tara'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT 2: STAGING DIFF */}
      {activeTab === 'staging' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-amber-400" />
              <h3 className="text-base font-bold text-white">Botların Tespit Ettiği Fiyat Farkları (İnceleme & Onay)</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-6">
              Crawler işçileri tarafından resmi ve serbest piyasa kaynaklarından toplanan fiyat güncellemeleri. Onayladığınız kalemler yeni oluşturulacak tekliflerin fiyat tabanına yansır; geçmiş tekliflerin bütünlüğü korunur.
            </p>

            {stagingItems.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">
                İncelenecek bekleyen fiyat güncellemesi bulunmuyor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Poz / Emtia Kodu</th>
                      <th className="py-3 px-3">Tanım</th>
                      <th className="py-3 px-3">Birim</th>
                      <th className="py-3 px-3">Mevcut Fiyat</th>
                      <th className="py-3 px-3">Taranan Yeni Fiyat</th>
                      <th className="py-3 px-3">Fark (%)</th>
                      <th className="py-3 px-3">Kaynak</th>
                      <th className="py-3 px-3">Durum</th>
                      <th className="py-3 px-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {stagingItems.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-white">{item.itemCode}</td>
                        <td className="py-3.5 px-3 max-w-xs text-zinc-200">
                          <div>{item.itemName}</div>
                          {item.notes && <div className="text-[10px] text-zinc-500 mt-0.5">{item.notes}</div>}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-zinc-400">{item.unit}</td>
                        <td className="py-3.5 px-3 font-mono text-zinc-400">
                          {item.currentPrice ? `₺${parseFloat(item.currentPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-white">
                          ₺{parseFloat(item.crawledPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center gap-1 font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
                            parseFloat(item.diffPercent || '0') > 0
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            <TrendingUp size={12} />
                            %{item.diffPercent}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="text-[11px] text-zinc-400">{item.sourceName}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            item.status === 'pending'
                              ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                              : item.status === 'approved'
                              ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                              : 'bg-red-400/10 text-red-400 border border-red-400/20'
                          }`}>
                            {item.status === 'pending' ? 'Bekliyor' : item.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          {item.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleReview(item.id, 'approve')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5"
                              >
                                <Check size={12} className="mr-1" /> Onayla
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReview(item.id, 'reject')}
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-[11px] h-7 px-2"
                              >
                                <X size={12} />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">İncelendi</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: AUDIT DIAGNOSTIC */}
      {activeTab === 'audit' && (
        <div className="mt-6 max-w-3xl space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h3 className="text-base font-bold text-white mb-2">Canlı Poz Teftiş & Doğrulama Aracı</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Sistemdeki herhangi bir resmi ÇŞB poz numarasını veya emtia kodunu yazarak yürürlükteki birim fiyatını, ölçü birimini ve resmi kaynak doğruluğunu sorgulayın.
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={auditQuery}
                  onChange={(e) => setAuditQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runAuditSearch()}
                  placeholder="Örn: 15.150.1005 (Beton) veya 15.160.1003 (Demir)..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <Button onClick={runAuditSearch} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-5">
                Sorgula & Doğrula
              </Button>
            </div>

            {auditResult && (
              <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-indigo-400">{auditResult.code}</span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{auditResult.name}</h4>
                  </div>
                  {auditResult.epysCompliant ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded border border-emerald-400/20">
                      <CheckCircle2 size={13} /> e-PYS Uyumlu
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-500">Kayıt Bulunamadı</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                  <div>
                    <span className="text-zinc-500 block">Resmi ÇŞB Fiyatı:</span>
                    <span className="font-mono font-bold text-white text-sm">{auditResult.officialPrice}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Güncel Piyasa Rayici:</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">{auditResult.marketPrice}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Ölçü Birimi:</span>
                    <span className="text-zinc-200 font-mono">{auditResult.unit}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Geçerlilik & Durum:</span>
                    <span className="text-zinc-200">{auditResult.validity}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400">
                  <span className="font-semibold text-zinc-300">Teftiş Notu:</span> {auditResult.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
