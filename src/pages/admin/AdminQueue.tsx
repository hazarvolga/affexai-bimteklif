import { useEffect, useState, useRef } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/button';
import { fetchWithAuth } from '../../lib/api';
import { toast } from 'sonner';
import {
  Cpu,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  LifeBuoy,
  Search,
  Filter,
  Building2,
  FileText
} from 'lucide-react';

interface QueueJob {
  id: string;
  kind: string;
  fileName: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'stale';
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  companyId: string;
  companyName: string;
  isStale: boolean;
}

interface QueueSummary {
  queued: number;
  running: number;
  succeeded24h: number;
  failed24h: number;
  stale: number;
}

export function AdminQueue() {
  const [summary, setSummary] = useState<QueueSummary>({
    queued: 0,
    running: 0,
    succeeded24h: 0,
    failed24h: 0,
    stale: 0
  });
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadQueue = async (isBackground = false) => {
    try {
      if (!isBackground) setRefreshing(true);
      const res = await fetchWithAuth('/api/admin/queue');
      if (!res.ok) {
        throw new Error('Kuyruk bilgileri alınamadı');
      }
      const data = await res.json();
      setSummary(data.summary || {
        queued: 0,
        running: 0,
        succeeded24h: 0,
        failed24h: 0,
        stale: 0
      });
      setJobs(data.jobs || []);
    } catch (err: any) {
      if (!isBackground) {
        toast.error(err.message || 'Kuyruk yüklenemedi');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        loadQueue(true);
      }, 15000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh]);

  const handleRecover = async (runId: string) => {
    try {
      setActionInProgress(runId);
      const res = await fetchWithAuth('/api/admin/queue/recover', {
        method: 'POST',
        body: JSON.stringify({ runId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Kurtarma işlemi başarısız');
      }
      toast.success('Kilitli iş başarıyla kurtarıldı ve kuyruğa alındı');
      loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'İş kurtarılamadı');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRetry = async (runId: string) => {
    try {
      setActionInProgress(runId);
      const res = await fetchWithAuth('/api/admin/queue/retry', {
        method: 'POST',
        body: JSON.stringify({ runId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Yeniden deneme başarısız');
      }
      toast.success('İş yeniden kuyruğa eklendi');
      loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Yeniden başlatılamadı');
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (statusFilter === 'stale') {
      if (!job.isStale) return false;
    } else if (statusFilter !== 'all' && job.status !== statusFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCompany = job.companyName.toLowerCase().includes(q);
      const matchFile = job.fileName.toLowerCase().includes(q);
      const matchKind = job.kind.toLowerCase().includes(q);
      const matchId = job.id.toLowerCase().includes(q);
      return matchCompany || matchFile || matchKind || matchId;
    }

    return true;
  });

  return (
    <PageContainer>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Cpu className="text-indigo-400" size={26} />
            IFC & Belge Kuyruk İzleme
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Graphile Worker ve Python IfcOpenShell arka plan işçilerinin gerçek zamanlı durumu
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground dark:text-muted-foreground">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-border bg-card text-indigo-500"
            />
            <span>15 sn Otomatik Yenile</span>
          </label>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadQueue()}
            disabled={refreshing}
            className="border-border bg-card text-foreground hover:bg-surface-elevated text-xs"
          >
            <RefreshCw size={14} className={`mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
            <span>Kuyrukta Bekleyen</span>
            <Clock size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">{summary.queued}</div>
          <div className="text-[10px] text-muted-foreground mt-1">İşlem sırası bekliyor</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
            <span>Şu An Çalışan</span>
            <RefreshCw size={16} className="text-amber-400 animate-spin" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{summary.running}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Aktif işlenen döküman</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
            <span>Başarılı (24s)</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{summary.succeeded24h}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Son 24 saat tamamlanan</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
            <span>Başarısız (24s)</span>
            <XCircle size={16} className="text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{summary.failed24h}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Hata alan işler</div>
        </div>

        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-amber-300 text-xs mb-2">
            <span>Kilitli / Stale (&gt;15dk)</span>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300">{summary.stale}</div>
          <div className="text-[10px] text-amber-400/80 mt-1">Müdahale gerekebilir</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter size={16} className="text-muted-foreground shrink-0" />
          {[
            { key: 'all', label: 'Tümü' },
            { key: 'running', label: 'Çalışan' },
            { key: 'queued', label: 'Bekleyen' },
            { key: 'stale', label: 'Kilitli (Stale)' },
            { key: 'failed', label: 'Hatalı' },
            { key: 'completed', label: 'Başarılı' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-surface-elevated text-muted-foreground hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Firma, dosya adı veya ID ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-xs text-foreground placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Jobs Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-background text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Firma / Döküman</th>
                <th className="px-5 py-3.5">Tür</th>
                <th className="px-5 py-3.5">Durum</th>
                <th className="px-5 py-3.5">Deneme</th>
                <th className="px-5 py-3.5">Tarih / Süre</th>
                <th className="px-5 py-3.5 text-right">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground dark:text-muted-foreground">
              {loading && jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <Clock size={20} className="animate-spin mx-auto mb-2 text-indigo-400" />
                    Kuyruk kayıtları yükleniyor...
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Eşleşen kuyruk işlemi bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const isStale = job.isStale;
                  const isRunning = job.status === 'running';
                  const isFailed = job.status === 'failed';

                  return (
                    <tr key={job.id} className="hover:bg-surface-elevated transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-muted-foreground shrink-0" />
                          <span className="font-semibold text-foreground">{job.companyName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                          <FileText size={12} className="text-muted-foreground" />
                          <span className="truncate max-w-xs">{job.fileName}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="rounded border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-bold text-foreground dark:text-muted-foreground uppercase">
                          {job.kind}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        {isStale ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">
                            <AlertTriangle size={12} /> Kilitli (Stale)
                          </span>
                        ) : isRunning ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold text-blue-400">
                            <RefreshCw size={12} className="animate-spin" /> Çalışıyor
                          </span>
                        ) : job.status === 'queued' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            <Clock size={12} /> Bekliyor
                          </span>
                        ) : job.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                            <CheckCircle2 size={12} /> Başarılı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-bold text-red-400">
                            <XCircle size={12} /> Hata
                          </span>
                        )}

                        {job.errorMessage && (
                          <p className="text-[10px] text-red-400/90 mt-1 max-w-xs truncate" title={job.errorMessage}>
                            {job.errorMessage}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3.5 font-medium">
                        {job.attempts} / {job.maxAttempts}
                      </td>

                      <td className="px-5 py-3.5 text-muted-foreground">
                        <div>{new Date(job.createdAt).toLocaleTimeString('tr-TR')}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(job.createdAt).toLocaleDateString('tr-TR')}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isStale && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRecover(job.id)}
                              disabled={actionInProgress === job.id}
                              className="border-amber-600/50 bg-amber-600/10 text-amber-300 hover:bg-amber-600/20 text-[11px] h-7 px-2.5"
                            >
                              <LifeBuoy size={12} className="mr-1" />
                              Kurtar
                            </Button>
                          )}

                          {isFailed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetry(job.id)}
                              disabled={actionInProgress === job.id}
                              className="border-indigo-600/50 bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20 text-[11px] h-7 px-2.5"
                            >
                              <RotateCcw size={12} className="mr-1" />
                              Yeniden Dene
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
