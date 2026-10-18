import { useCallback, useEffect, useState } from "react";
import { Activity, AlertCircle, Check, Clock3, Database, ExternalLink, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SourceHealth = {
  adapter: {
    id: string;
    adapterKey: string;
    displayName: string;
    authority: string;
    cadence: string;
    sourceUrl: string;
    lastSourceHash: string | null;
    lastSuccessAt: string | null;
    enabled: boolean;
  };
  latestRun: { status: string; createdAt: string; completedAt: string | null; sourceHash: string | null } | null;
  health: "never_run" | "error" | "awaiting_review" | "healthy";
};

type ReviewItem = {
  id: string;
  itemType: "price_snapshot" | "regulation_diff";
  title: string;
  rationale: string;
  createdAt: string;
  adapter: { displayName: string; adapterKey: string };
  run: { id: string; sourceDocumentIdentifier: string; status: string };
};

const healthCopy: Record<SourceHealth["health"], { label: string; className: string }> = {
  never_run: { label: "İlk çalıştırma bekliyor", className: "text-muted-foreground border-border bg-card" },
  error: { label: "Hata", className: "text-red-400 border-red-500/20 bg-red-500/10" },
  awaiting_review: { label: "Reviewer bekliyor", className: "text-amber-400 border-amber-500/20 bg-amber-500/10" },
  healthy: { label: "Sağlıklı", className: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Henüz çalışmadı";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tarih yok" : date.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

async function readJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetchWithAuth(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Kaynak verisi alınamadı.");
  return body as T;
}

export function SourceIntelligencePanel() {
  const [health, setHealth] = useState<SourceHealth[]>([]);
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [healthData, queueData] = await Promise.all([
        readJson<SourceHealth[]>("/api/source-intelligence/health"),
        readJson<ReviewItem[]>("/api/source-intelligence/review-queue"),
      ]);
      setHealth(healthData);
      setQueue(queueData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaynak istihbaratı yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const decide = async (item: ReviewItem, status: "approved" | "rejected") => {
    setBusyId(item.id);
    try {
      await readJson(`/api/source-intelligence/review-items/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, notes: "TeklifPro reviewer kuyruğunda karara bağlandı." }),
      });
      toast.success(status === "approved" ? "Kaynak verisi onaylandı." : "Kaynak verisi reddedildi.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review kararı kaydedilemedi.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground">
              <Activity size={15} className="text-orange-500" /> Kaynak sağlık merkezi
            </CardTitle>
            <CardDescription className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Resmî kaynaklar ham, normalize ve diff katmanlarından geçer; fiyat veya mevzuat değişikliği reviewer onayı olmadan kanonikleşmez.
            </CardDescription>
          </div>
          <Button aria-label="Kaynak durumunu yenile" variant="ghost" size="icon-sm" onClick={() => void refresh()} disabled={loading} className="text-muted-foreground hover:text-foreground">
            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground"><Loader2 size={14} className="animate-spin text-orange-500" /> Kaynak durumu okunuyor</div>
        ) : health.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background p-4 text-xs leading-relaxed text-muted-foreground">
            Henüz şirket için resmî adaptör kaydı yok. Gerçek kaynak bağlantısı, lisans ve çalışma sıklığı tanımlanmadan sistem kaynak için “LIVE” iddiasında bulunmaz.
          </div>
        ) : (
          <div className="space-y-2">
            {health.map((entry) => {
              const status = healthCopy[entry.health];
              return (
                <div key={entry.adapter.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Database size={14} className="shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-black uppercase tracking-tight text-foreground">{entry.adapter.displayName}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{entry.adapter.authority} · {entry.adapter.cadence}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-widest", status.className)}>{status.label}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock3 size={10} /> Son başarı: {formatDate(entry.adapter.lastSuccessAt)}</span>
                    <a href={entry.adapter.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-orange-400"><ExternalLink size={10} /> Kaynak</a>
                  </div>
                  {entry.adapter.lastSourceHash && <p className="mt-2 truncate font-mono text-[10px] text-foreground" title={entry.adapter.lastSourceHash}>SHA-256: {entry.adapter.lastSourceHash}</p>}
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground dark:text-muted-foreground"><ShieldCheck size={13} className="text-orange-500" /> Reviewer kuyruğu</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{queue.length ? `${queue.length} karar bekliyor` : "Bekleyen kaynak kararı yok"}</p>
            </div>
            {queue.length > 0 && <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-400">ONAY GEREKİYOR</Badge>}
          </div>
          {queue.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-3 text-[10px] text-muted-foreground"><Check size={13} className="text-emerald-500" /> Kaynak değişiklikleri insan onayı olmadan teklif motoruna aktarılmaz.</div>
          ) : (
            <div className="space-y-2">
              {queue.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-black uppercase tracking-tight text-foreground">{item.title}</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{item.rationale}</p>
                      <p className="mt-1 font-mono text-[10px] text-foreground">{item.adapter.adapterKey} · {item.run.sourceDocumentIdentifier}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button aria-label={`${item.title} onayla`} size="icon-xs" onClick={() => void decide(item, "approved")} disabled={busyId === item.id} className="bg-emerald-600 text-white hover:bg-emerald-500"><Check size={12} /></Button>
                      <Button aria-label={`${item.title} reddet`} size="icon-xs" variant="destructive" onClick={() => void decide(item, "rejected")} disabled={busyId === item.id}><X size={12} /></Button>
                    </div>
                  </div>
                  {busyId === item.id && <div className="mt-2 flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground"><Loader2 size={10} className="animate-spin" /> Kaydediliyor</div>}
                </div>
              ))}
              {queue.length > 8 && <p className="text-center text-[10px] text-muted-foreground">+{queue.length - 8} karar daha</p>}
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-orange-500/10 bg-orange-500/[0.03] p-3 text-[10px] leading-relaxed text-muted-foreground">
          <AlertCircle size={13} className="mt-0.5 shrink-0 text-orange-500" />
          Bu panel veri çekmez; güvenli adaptör runner tarafından gönderilen, hash’i ve kaynağı doğrulanmış payload’ları gösterir. Kanonik mevzuat kuralı otomatik üretilmez.
        </div>
      </CardContent>
    </Card>
  );
}
