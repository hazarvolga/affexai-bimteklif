import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Measurement = { totalRows: number; parsedRows: number; manuallyCorrectedRows: number; findingCount: number; approvedRows: number; transferredRows: number; provenanceCompleteRows: number; parseRate: string | number | null; manualReentryFreeRate: string | number | null; provenanceCoverage: string | number | null; processingDurationSeconds: number | null; workflowDurationSeconds: number | null };
type PilotCase = { id: string; pilotId: string; customerReference: string; projectReference: string; documentId: string; status: string; reviewerDecision: string | null; reviewedAt: string | null; latestMeasurement: Measurement | null };
type Summary = { caseCount: number; totalRows: number; parsedRows: number; manuallyCorrectedRows: number; findingCount: number; approvedRows: number; transferredRows: number; provenanceCompleteRows: number; parseRate: number | null; manualReentryFreeRate: number | null; provenanceCoverage: number | null; averageProcessingDurationSeconds: number | null; averageWorkflowDurationSeconds: number | null };

async function readJson<T>(url: string): Promise<T> {
  const response = await fetchWithAuth(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Pilot kanıtı yüklenemedi.");
  return body as T;
}

function percentage(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function PilotEvidence() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cases, setCases] = useState<PilotCase[]>([]);
  const [gates, setGates] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [metrics, caseList] = await Promise.all([
        readJson<{ summary: Summary; gates: Record<string, boolean> }>("/api/smartcheck/pilot-metrics"),
        readJson<PilotCase[]>("/api/smartcheck/pilot-cases"),
      ]);
      setSummary(metrics.summary);
      setGates(metrics.gates);
      setCases(caseList);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pilot kanıtları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const gateCards = [
    ["5 dosya", gates.fiveCases, summary ? `${summary.caseCount}/5` : "—"],
    ["Parse ≥ %90", gates.parseRateAtLeast90, percentage(summary?.parseRate ?? null)],
    ["Yeniden girişsiz ≥ %90", gates.manualReentryFreeAtLeast90, percentage(summary?.manualReentryFreeRate ?? null)],
    ["Provenance eksiksiz", gates.provenanceCompleteForTransfers, summary?.transferredRows ? percentage(summary.provenanceCoverage) : "Aktarım yok"],
  ] as const;

  return (
    <PageContainer>
      <PageHeader title="Pilot Kanıtı" description="Gerçek MEP dosyalarında parse, reviewer, aktarım ve provenance ölçümlerini tenant sınırı içinde takip edin." icon={ClipboardCheck} actions={<Button variant="ghost" onClick={() => void refresh()} disabled={loading} className="gap-2 text-zinc-400 hover:text-white"><RefreshCw size={14} className={cn(loading && "animate-spin")} /> Yenile</Button>} />
      <Card className="border-orange-500/20 bg-orange-500/[0.03] shadow-none"><CardContent className="flex gap-3 p-4 text-[10px] leading-relaxed text-zinc-400"><ShieldAlert size={15} className="shrink-0 text-orange-500" /><span>Bu panel yalnız uygulamaya kaydedilmiş pilot ölçümlerini gösterir. Müşteri izni, teknik reviewer yetkinliği, production S3 ve ticari veri lisansı dış admission kanıtlarıdır; KPI paneli bunları otomatik onaylamaz.</span></CardContent></Card>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{gateCards.map(([label, passed, value]) => <Card key={label} className={cn("border-zinc-800 bg-zinc-900/20 shadow-none", passed ? "border-emerald-500/20" : "border-amber-500/20")}><CardContent className="p-4"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p><div className="mt-2 flex items-end justify-between gap-2"><p className="text-xl font-black text-white">{value}</p><Badge variant="outline" className={passed ? "border-emerald-500/20 text-emerald-400" : "border-amber-500/20 text-amber-400"}>{passed ? "geçti" : "bekliyor"}</Badge></div></CardContent></Card>)}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]"><Card className="border-zinc-800 bg-zinc-900/20 shadow-none"><CardHeader className="pb-3"><CardTitle className="text-xs font-black uppercase tracking-widest text-white">Pilot case kuyruğu</CardTitle><CardDescription className="text-[10px] text-zinc-500">Dosya kimliği ve reviewer kararı yerine hassas müşteri verisi gösterilmez.</CardDescription></CardHeader><CardContent>{loading ? <p className="text-xs text-zinc-500">Yükleniyor…</p> : cases.length === 0 ? <p className="rounded-xl border border-dashed border-zinc-800 p-5 text-xs text-zinc-500">Henüz izinli pilot case kaydı yok.</p> : <div className="space-y-3">{cases.map((pilotCase) => <div key={pilotCase.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-black text-zinc-200">{pilotCase.pilotId}</p><p className="mt-1 text-[9px] text-zinc-600">{pilotCase.customerReference} · {pilotCase.projectReference} · {pilotCase.documentId.slice(0, 8)}…</p></div><Badge variant="outline" className={pilotCase.status === "completed" ? "border-emerald-500/20 text-emerald-400" : "border-amber-500/20 text-amber-400"}>{pilotCase.status}</Badge></div>{pilotCase.latestMeasurement && <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] text-zinc-500 sm:grid-cols-4"><span>Parse <b className="text-zinc-200">{percentage(Number(pilotCase.latestMeasurement.parseRate))}</b></span><span>Düzeltme <b className="text-zinc-200">{pilotCase.latestMeasurement.manuallyCorrectedRows}</b></span><span>Aktarım <b className="text-zinc-200">{pilotCase.latestMeasurement.transferredRows}</b></span><span>Provenance <b className="text-zinc-200">{pilotCase.latestMeasurement.transferredRows ? percentage(Number(pilotCase.latestMeasurement.provenanceCoverage)) : "—"}</b></span></div>}</div>)}</div>}</CardContent></Card><Card className="border-zinc-800 bg-zinc-900/20 shadow-none"><CardHeader className="pb-3"><CardTitle className="text-xs font-black uppercase tracking-widest text-white">Toplam kanıt</CardTitle><CardDescription className="text-[10px] text-zinc-500">Son ölçümlerin ağırlıklı özeti.</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-3 text-center">{[["Satır", summary?.totalRows ?? 0], ["Bulgu", summary?.findingCount ?? 0], ["Onaylı", summary?.approvedRows ?? 0], ["Süre", summary?.averageWorkflowDurationSeconds ? `${Math.round(summary.averageWorkflowDurationSeconds / 60)} dk` : "—"]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"><p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{label}</p><p className="mt-1 text-sm font-black text-zinc-200">{value}</p></div>)}</CardContent></Card></div>
    </PageContainer>
  );
}
