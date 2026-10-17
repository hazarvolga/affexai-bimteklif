import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, Clock3, FileText, Loader2, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RegulationVersion = {
  id: string;
  title: string;
  summary: string;
  category: string;
  impactLevel: "low" | "medium" | "high";
  effectiveFrom: string | null;
  sourceDocumentIdentifier: string;
  governanceStatus: string;
};

type RegulationImpact = {
  quotation: { id: string; quoteNumber: string; projectName: string; status: string };
  itemIds: string[];
  effectiveStatus: "upcoming" | "effective" | "unknown";
  matchType: "targeted" | "quotation_wide";
  confidence: "low" | "medium";
  reason: string;
};

const impactStyles = {
  low: "border-border bg-card text-muted-foreground",
  medium: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  high: "border-red-500/20 bg-red-500/10 text-red-400",
};

function formatDate(value: string | null) {
  if (!value) return "Yürürlük tarihi belirtilmemiş";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tarih yok" : date.toLocaleDateString("tr-TR");
}
async function readJson<T>(url: string): Promise<T> {
  const response = await fetchWithAuth(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Mevzuat etkisi alınamadı.");
  return body as T;
}

export function RegulationImpactPanel() {
  const [versions, setVersions] = useState<RegulationVersion[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [impacts, setImpacts] = useState<Record<string, RegulationImpact[]>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      setVersions(await readJson<RegulationVersion[]>("/api/regulations/versions"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mevzuat sürümleri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadVersions(); }, [loadVersions]);

  const toggleImpact = async (version: RegulationVersion) => {
    if (expandedId === version.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(version.id);
    if (impacts[version.id]) return;
    setBusyId(version.id);
    try {
      const response = await readJson<{ affectedQuotations: RegulationImpact[] }>(`/api/regulations/versions/${version.id}/affected-quotations`);
      setImpacts((current) => ({ ...current, [version.id]: response.affectedQuotations }));
    } catch (error) {
      setExpandedId(null);
      toast.error(error instanceof Error ? error.message : "Teklif etkisi hesaplanamadı.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground"><Search size={15} className="text-orange-500" /> Teklif etki analizi</CardTitle>
        <CardDescription className="text-[10px] leading-relaxed text-muted-foreground">Reviewer onaylı advisory sürümleri teklif geçmişine otomatik uygulamaz; yalnızca yürürlük tarihi ve olası eşleşmeleri görünür kılar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground"><Loader2 size={14} className="animate-spin text-orange-500" /> Advisory sürümler okunuyor</div>
        ) : versions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background p-4 text-xs leading-relaxed text-muted-foreground">Henüz reviewer onaylı advisory mevzuat sürümü yok. Kaynak diff'i onaylandığında burada etkilenebilecek teklifler listelenir.</div>
        ) : versions.slice(0, 8).map((version) => {
          const isExpanded = expandedId === version.id;
          const versionImpacts = impacts[version.id];
          return (
            <div key={version.id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest", impactStyles[version.impactLevel])}>{version.impactLevel}</Badge>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{version.category}</span>
                  </div>
                  <p className="mt-2 text-[11px] font-black uppercase tracking-tight text-foreground">{version.title}</p>
                  <p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-muted-foreground">{version.summary}</p>
                </div>
                <Button aria-label={`${version.title} etki analizini aç`} variant="ghost" size="icon-sm" onClick={() => void toggleImpact(version)} disabled={busyId === version.id} className="shrink-0 text-muted-foreground hover:text-white">
                  {busyId === version.id ? <Loader2 size={13} className="animate-spin" /> : isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[9px] text-muted-foreground"><span className="flex items-center gap-1"><Clock3 size={10} /> {formatDate(version.effectiveFrom)}</span><span className="flex items-center gap-1"><FileText size={10} /> {version.sourceDocumentIdentifier}</span></div>
              {isExpanded && (
                <div className="mt-3 border-t border-border pt-3">
                  {!versionImpacts?.length ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-[9px] text-muted-foreground"><ShieldCheck size={12} className="text-emerald-500" /> Bu sürüm için mevcut latest tekliflerde deterministik eşleşme bulunmadı.</div>
                  ) : (
                    <div className="space-y-2">
                      {versionImpacts.map((impact) => <div key={impact.quotation.id} className="rounded-lg border border-orange-500/10 bg-orange-500/[0.03] p-3"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-tight text-foreground">{impact.quotation.quoteNumber} · {impact.quotation.projectName}</p><Badge variant="outline" className="text-[8px] uppercase tracking-widest text-amber-400">{impact.effectiveStatus}</Badge></div><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{impact.reason}</p><p className="mt-1 text-[8px] text-zinc-700">{impact.itemIds.length} kalem · {impact.matchType} · güven {impact.confidence}</p></div>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {versions.length > 8 && <p className="text-center text-[9px] text-muted-foreground">+{versions.length - 8} advisory sürüm daha</p>}
        <div className="flex items-start gap-2 rounded-xl border border-orange-500/10 bg-orange-500/[0.03] p-3 text-[9px] leading-relaxed text-muted-foreground"><AlertCircle size={13} className="mt-0.5 shrink-0 text-orange-500" /> Bu eşleşme mühendislik veya hukuk onayı değildir; kullanıcı, kaynak metni ve proje sözleşmesini kontrol etmeden teklif değiştirmemelidir.</div>
      </CardContent>
    </Card>
  );
}
