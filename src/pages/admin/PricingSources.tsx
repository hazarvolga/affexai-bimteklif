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
  Sparkles,
  Plus,
  Trash2,
  Globe,
  Link as LinkIcon,
  HelpCircle,
  Moon,
  Play,
  Cpu
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
  const [auditResult, setAuditResult] = useState<{ items: Array<{ id: string; itemCode: string; itemName: string; crawledPrice: string; unit: string; sourceName: string; reviewedAt: string; validityStart: string; validityEnd: string }> } | null>(null);
  const [auditError, setAuditError] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  // New Source Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingSource, setCreatingSource] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newSource, setNewSource] = useState({
    name: '',
    code: '',
    authority: '',
    category: 'market_commodity',
    sourceUrl: '',
    syncFrequency: 'weekly',
    versionTag: '2026/1',
  });

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.name.trim() || !newSource.sourceUrl.trim()) {
      toast.error('Kaynak adı ve URL zorunludur.');
      return;
    }
    // Auto-generate code if empty
    const code = newSource.code.trim() 
      ? newSource.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : newSource.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30);

    setCreatingSource(true);
    try {
      const res = await fetchWithAuth('/api/admin/pricing-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSource, code }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`"${data.name}" veri kaynağı başarıyla eklendi.`);
        setShowAddModal(false);
        setNewSource({
          name: '',
          code: '',
          authority: '',
          category: 'market_commodity',
          sourceUrl: '',
          syncFrequency: 'weekly',
          versionTag: '2026/1',
        });
        loadData();
      } else {
        toast.error(data.error || 'Kaynak eklenemedi.');
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setCreatingSource(false);
    }
  };

  const handleDeleteSource = async (sourceId: string, name: string) => {
    if (!window.confirm(`"${name}" veri kaynağını ve bağlı kayıtları silmek istediğinize emin misiniz?`)) return;
    setDeletingId(sourceId);
    try {
      const res = await fetchWithAuth(`/api/admin/pricing-sources/${sourceId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`"${name}" kaynağı silindi.`);
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Silme işlemi başarısız.');
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setDeletingId(null);
    }
  };

  const [schedulerStatus, setSchedulerStatus] = useState<any | null>(null);
  const [runningBatch, setRunningBatch] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [srcRes, stgRes, schRes] = await Promise.all([
        fetchWithAuth('/api/admin/pricing-sources').then((r) => r.json()),
        fetchWithAuth('/api/admin/pricing-sources/staging').then((r) => r.json()),
        fetchWithAuth('/api/admin/pricing-sources/scheduler/status').then((r) => r.json()).catch(() => null),
      ]);
      setSources(Array.isArray(srcRes) ? srcRes : []);
      setStagingItems(Array.isArray(stgRes) ? stgRes : []);
      if (schRes) setSchedulerStatus(schRes);
    } catch (error) {
      console.error(error);
      toast.error('Fiyat kaynakları yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBatch = async () => {
    setRunningBatch(true);
    toast.info('Sıralı gece taraması başlatıldı. Kaynaklar sırayla taranıyor (3sn nezaket beklemesiyle)...');
    try {
      const res = await fetchWithAuth('/api/admin/pricing-sources/scheduler/trigger', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Sıralı toplu tarama tamamlandı.');
        loadData();
      } else {
        toast.error(data.error || 'Toplu tarama başlatılamadı.');
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setRunningBatch(false);
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

  const runAuditSearch = async () => {
    const q = auditQuery.trim();
    if (!q || auditLoading) return;
    setAuditLoading(true); setAuditError(''); setAuditResult(null);
    try {
      const response = await fetchWithAuth(`/api/pricing/benchmarks?q=${encodeURIComponent(q)}`);
      if (!response.ok) throw new Error('Onaylı kaynak kayıtları sorgulanamadı.');
      const result = await response.json();
      if (!Array.isArray(result.items)) throw new Error('Kaynak yanıtı geçersiz.');
      setAuditResult({ items: result.items });
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : 'Kaynak sorgusu başarısız.');
    } finally { setAuditLoading(false); }
  };

  const pendingStagingCount = stagingItems.filter((i) => i.status === 'pending').length;
  const activeSources = sources.filter((source) => source.status === 'active');
  const sealedSources = sources.filter((source) => Boolean(source.dataHash));
  const totalSourceItems = sources.reduce((sum, source) => sum + source.itemCount, 0);

  return (
    <PageContainer>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader 
          title="Fiyat & Poz Kaynakları (Crawler Governance)" 
          description="Fiyat kaynaklarının, toplanan kayıtların ve insan incelemesinin yönetimi."
          icon={Database} 
        />
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Button 
            onClick={() => setShowAddModal(true)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
          >
            <Plus size={14} className="mr-1.5" /> Yeni Kaynak Ekle
          </Button>
          <Button 
            onClick={loadData} 
            variant="outline" 
            className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs"
          >
            <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Yenile
          </Button>
        </div>
      </div>

      {/* WORKFLOW EXPLANATION BANNER */}
      <div className="mt-6 rounded-xl border border-indigo-900/30 bg-indigo-950/20 p-5">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={18} className="text-indigo-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">ÇŞB & Piyasa Crawler Mekanizması Nasıl Çalışır?</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs text-zinc-300">
          <div className="border-l-2 border-indigo-500 pl-3">
            <span className="font-bold text-white block mb-0.5">1. Kaynak & URL Tanımı</span>
            <span>Resmi Gazete, ÇŞB YFK, TÜİK veya serbest piyasa demir/beton web adresleri sisteme tanımlanır.</span>
          </div>
          <div className="border-l-2 border-amber-500 pl-3">
            <span className="font-bold text-white block mb-0.5">2. Canlı Web Taraması (Bot)</span>
            <span>Belirlenen sıklıkla veya "Şimdi Tara" butonuyla web sayfalarından güncel fiyat ve endeksler çekilir.</span>
          </div>
          <div className="border-l-2 border-purple-500 pl-3">
            <span className="font-bold text-white block mb-0.5">3. İnceleme Havuzu (Staging Diff)</span>
            <span>Fiyat farkları doğrudan tekliflere yansıtılmaz. Önce süper admin onayına (Human-in-the-loop) sunulur.</span>
          </div>
          <div className="border-l-2 border-emerald-500 pl-3">
            <span className="font-bold text-white block mb-0.5">4. Mühürlü Poz Kataloğu</span>
            <span>Onaylanan ve geçerlilik tarihleri uygun kayıtlar teklife aktarılabilir. İnceleme onayı resmî uygunluk belgesi değildir.</span>
          </div>
        </div>
      </div>

      {/* NIGHTLY BATCH SCHEDULER BANNER */}
      <div className="mt-4 rounded-xl border border-blue-900/30 bg-blue-950/20 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-blue-900/40 text-blue-400 border border-blue-800/40 shrink-0 mt-0.5 md:mt-0">
            <Moon size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-white">Otomatik Gece Taraması (Nightly Batch Sync)</h4>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${activeSources.length > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                <CheckCircle2 size={10} className="mr-1" /> {activeSources.length} Aktif Kaynak · Her Gece 03:00 TSİ
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                <Cpu size={10} className="mr-1" /> Sıralı Nezaket Kuyruğu (Zero-Spike)
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Yalnız doğrulanıp aktif edilen kaynaklar her gece 03:00'te 2.5 sn aralıklarla sırayla taranır ve onay havuzuna aktarılır.
              {schedulerStatus?.lastRunAt ? (
                <span className="text-zinc-300 ml-1">
                  Son çalışma: <strong className="text-white">{new Date(schedulerStatus.lastRunAt).toLocaleDateString('tr-TR')} {new Date(schedulerStatus.lastRunAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</strong> ({schedulerStatus.lastSummary?.successfulSources || 0}/{schedulerStatus.lastSummary?.totalSources || 0} kaynak, {schedulerStatus.lastSummary?.totalItemsStaged || 0} yeni fiyat).
                </span>
              ) : activeSources.length > 0 ? (
                <span className="text-zinc-500 ml-1"> (İlk döngü bu gece 03:00'te başlayacak).</span>
              ) : (
                <span className="text-amber-400 ml-1"> Aktif kaynak olmadığı için tarama beklemede.</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          <Button
            onClick={handleTriggerBatch}
            disabled={runningBatch || activeSources.length === 0}
            variant="outline"
            className="border-blue-800/50 bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 text-xs font-semibold"
          >
            {runningBatch ? (
              <RefreshCw size={13} className="mr-1.5 animate-spin text-blue-400" />
            ) : (
              <Play size={13} className="mr-1.5 text-blue-400" />
            )}
            {runningBatch ? 'Sırayla Taranıyor...' : activeSources.length === 0 ? 'Aktif Kaynak Yok' : 'Toplu Taramayı Şimdi Çalıştır'}
          </Button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tanımlı Veri Kaynakları</span>
            <Building2 size={16} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{sources.length} Kaynak</div>
          <p className="text-[11px] text-zinc-500 mt-1">ÇŞB, TÜİK, Demir, Beton, e-PYS</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Kaynak Veri Satırı</span>
            <Layers size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {totalSourceItems.toLocaleString('tr-TR')}
          </div>
          <p className={`text-[11px] mt-1 ${totalSourceItems > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {totalSourceItems > 0 ? 'Kaynak kayıtlarındaki toplam kalem' : 'Doğrulanmış fiyat verisi yok'}
          </p>
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
          <div className={`text-sm font-mono font-bold truncate mt-1 ${sealedSources.length > 0 ? 'text-sky-400' : 'text-amber-400'}`}>
            {sealedSources.length}/{sources.length} Kaynak Mühürlü
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">SHA-256 kanıtı olan kaynaklar</p>
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
          Onaylı Kayıt Arama
        </button>
      </div>

      {/* TAB CONTENT 1: SOURCES */}
      {activeTab === 'sources' && (
        <div className="mt-6">
          {sources.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center">
              <Database size={40} className="mx-auto text-zinc-600 mb-3" />
              <h3 className="text-base font-bold text-white mb-1">Henüz Kayıtlı Veri Kaynağı Bulunmuyor</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mb-5">
                Çevre Şehircilik Bakanlığı YFK birim fiyatları, TÜİK endeksleri veya serbest piyasa demir/beton fiyat bağlantılarını ekleyerek botları devreye alabilirsiniz.
              </p>
              <Button 
                onClick={() => setShowAddModal(true)} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                <Plus size={14} className="mr-1.5" /> İlk Kaynağı / Linki Ekle
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                        <span className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        <span className={`text-[11px] font-medium ${s.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {s.status === 'active' ? 'Aktif' : s.status === 'stale' ? 'Doğrulanmadı' : s.status === 'syncing' ? 'Taranıyor' : 'Hata'}
                        </span>
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
                        <span className="font-semibold text-white">{s.itemCount > 0 ? `${s.itemCount.toLocaleString('tr-TR')} Kalem` : 'Henüz veri yok'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Yürürlük:</span>
                        <span className="text-zinc-300">
                          {!s.validityStart && !s.validityEnd ? 'Geçerlilik kanıtı yok' : `${s.validityStart ? new Date(s.validityStart).toLocaleDateString('tr-TR') : '-'} – ${s.validityEnd ? new Date(s.validityEnd).toLocaleDateString('tr-TR') : 'Bitiş tarihi yok'}`}
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
                        className="inline-flex items-center text-xs text-zinc-400 hover:text-white transition-colors truncate max-w-[150px]"
                        title={s.sourceUrl}
                      >
                        <Globe size={12} className="mr-1 shrink-0" />
                        <span className="truncate">Kaynak Linki</span>
                        <ExternalLink size={10} className="ml-1 shrink-0" />
                      </a>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleSync(s.id, s.name)}
                        disabled={syncingId === s.id || s.status !== 'active'}
                        title={s.status === 'active' ? 'Kaynağı şimdi tara' : 'Kaynak doğrulanıp aktif edilmeden tarama başlatılamaz'}
                        className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 text-xs py-1 h-7"
                      >
                        <RefreshCw size={12} className={`mr-1.5 ${syncingId === s.id ? 'animate-spin' : ''}`} />
                        {syncingId === s.id ? 'Taranıyor...' : s.status === 'active' ? 'Şimdi Tara' : 'Doğrulama Gerekli'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSource(s.id, s.name)}
                        disabled={deletingId === s.id}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                        title="Kaynağı Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: YENİ VERİ KAYNAĞI / LİNKİ EKLE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#0c0c0e] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-indigo-400" />
                <h3 className="text-base font-bold text-white">Yeni Fiyat Kaynağı / Linki Ekle</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSource} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Kaynak / Liste Adı *</label>
                <input 
                  type="text" 
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  placeholder="örn: TÇMB Çimento Endeksi veya Kayseri Demir Borsası"
                  required
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Kaynak Kodu (Slug)</label>
                  <input 
                    type="text" 
                    value={newSource.code}
                    onChange={(e) => setNewSource({ ...newSource, code: e.target.value })}
                    placeholder="örn: market_cement_central"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500">Boş bırakılırsa addan üretilir.</span>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Yetkili / Kurum</label>
                  <input 
                    type="text" 
                    value={newSource.authority}
                    onChange={(e) => setNewSource({ ...newSource, authority: e.target.value })}
                    placeholder="örn: Türkiye Çimento Üreticileri Birliği"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Kaynak URL / Web Sayfası Linki *</label>
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3 top-2.5 text-zinc-500" />
                  <input 
                    type="url" 
                    value={newSource.sourceUrl}
                    onChange={(e) => setNewSource({ ...newSource, sourceUrl: e.target.value })}
                    placeholder="https://www.ornek.gov.tr/fiyatlar"
                    required
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Kategori</label>
                  <select 
                    value={newSource.category}
                    onChange={(e) => setNewSource({ ...newSource, category: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="market_commodity">Serbest Piyasa</option>
                    <option value="official_gazette">Resmi Gazete / ÇŞB</option>
                    <option value="tuik_index">TÜİK Endeksi</option>
                    <option value="epys_standard">e-PYS Standart</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Tarama Sıklığı</label>
                  <select 
                    value={newSource.syncFrequency}
                    onChange={(e) => setNewSource({ ...newSource, syncFrequency: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="daily">Günlük</option>
                    <option value="weekly">Haftalık</option>
                    <option value="monthly">Aylık</option>
                    <option value="realtime">Canlı (Anlık)</option>
                    <option value="annually">Yıllık</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Sürüm Etiketi</label>
                  <input 
                    type="text" 
                    value={newSource.versionTag}
                    onChange={(e) => setNewSource({ ...newSource, versionTag: e.target.value })}
                    placeholder="2026/1"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddModal(false)}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={creatingSource}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  {creatingSource ? 'Ekleniyor...' : 'Kaydet ve Başlat'}
                </Button>
              </div>
            </form>
          </div>
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
            <h3 className="text-base font-bold text-white mb-2">Onaylı Kaynak Kayıtları</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Poz numarası veya açıklaması ile sistemdeki onaylanmış, geçerli tarihli TRY fiyat kayıtlarını arayın.
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
              <Button disabled={auditLoading} onClick={runAuditSearch} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-5">
                {auditLoading ? 'Sorgulanıyor…' : 'Onaylı kayıtları ara'}
              </Button>
            </div>

            <p className="mt-4 text-xs text-zinc-400">Bu arama yalnızca onaylanmış kaynak kayıtlarını listeler; resmî kurum veya e-PYS uygunluk doğrulaması yapmaz.</p>
            {auditError && <p role="alert" className="mt-4 text-sm text-red-400">{auditError}</p>}
            {auditResult && <div className="mt-6 space-y-3">
              {auditResult.items.length === 0 && <p className="text-sm text-zinc-400">Geçerli tarihlere sahip onaylı kayıt bulunamadı. Bu sonuç resmî katalogda kayıt olmadığı anlamına gelmez.</p>}
              {auditResult.items.map(item => <div key={item.id} className="rounded-lg border border-zinc-800 p-4 text-sm">
                <h4 className="text-white">{item.itemCode} — {item.itemName}</h4>
                <p className="text-zinc-300">{Number(item.crawledPrice).toLocaleString('tr-TR')} ₺ / {item.unit}</p>
                <p className="text-xs text-zinc-400">Kaynak: {item.sourceName} · İnceleme: {new Date(item.reviewedAt).toLocaleDateString('tr-TR')}</p>
                <p className="text-xs text-zinc-400">Geçerlilik: {new Date(item.validityStart).toLocaleDateString('tr-TR')} – {new Date(item.validityEnd).toLocaleDateString('tr-TR')}</p>
              </div>)}
            </div>}

          </div>
        </div>
      )}
    </PageContainer>
  );
}
