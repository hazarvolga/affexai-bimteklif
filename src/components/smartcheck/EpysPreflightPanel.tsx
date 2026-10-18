import { useEffect, useState } from "react";
import { FileCheck2, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface Ek9Row {
  no: number;
  bolum: string;
  kategori: string;
  baslik: string;
  soru: string;
  karar: string;
  elleNotu: string;
  bulgu: number;
}

interface Finding {
  kod: string;
  seviye: "hata" | "uyari" | "bilgi" | "elle";
  mesaj: string;
  madde: string;
  ek9: number | null;
  varliklar: string[];
  sayi: number | null;
}

interface PreflightReport {
  summary: { hata: number; uyari: number; bilgi: number; elle: number };
  ek9Table?: { tablo: string; baslik: string; satirSayisi: number };
  ek9: Ek9Row[];
  findings: Finding[];
  findingsTruncated: boolean;
  disclaimer: string;
  ruleSource: { regulation: Record<string, string>; engine: { name: string; version: string; upstreamCommit: string } };
  model: { fileName: string; schema: string; discipline?: string | null };
}

const DECISION_CLASS: Record<string, string> = {
  "Evet": "border-emerald-500/30 text-emerald-400",
  "Evet (uyarıyla)": "border-amber-500/30 text-amber-300",
  "Hayır": "border-red-500/30 text-red-400",
  "Elle": "border-border text-muted-foreground",
  "Kısmen (elle tamamlanacak)": "border-sky-500/30 text-sky-300",
};

/** RG 33331 EK-9 pre-check for one IFC document; advisory, never an official decision. */
export function EpysPreflightPanel({ documentId, refreshKey }: { documentId: string; refreshKey: number }) {
  const [report, setReport] = useState<PreflightReport | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetchWithAuth(`/api/smartcheck/documents/${documentId}/epys-preflight`)
      .then(async response => {
        if (cancelled) return;
        if (response.status === 404) return setState("missing");
        if (!response.ok) return setState("error");
        setReport(await response.json() as PreflightReport);
        setState("ready");
      })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [documentId, refreshKey]);

  if (state === "loading") return <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" />e-PYS ön kontrolü yükleniyor…</div>;
  if (state === "missing") return <div className="p-4 text-xs text-muted-foreground">Bu IFC için e-PYS (RG 33331) ön kontrolü henüz yok. Sunucu tarafı IFC işlemesi tamamlandığında burada görünür.</div>;
  if (state === "error" || !report) return <div className="p-4 text-xs text-amber-400">e-PYS ön kontrolü şu anda okunamıyor.</div>;

  return (
    <section className="space-y-4 border-t border-border p-4" aria-label="e-PYS ön kontrolü">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold text-foreground">
            <FileCheck2 size={14} className="text-sky-400" />
            e-PYS ön kontrolü · EK-9 {report.ek9Table ? `${report.ek9Table.tablo.startsWith("Tablo") ? report.ek9Table.tablo : `Tablo ${report.ek9Table.tablo}`} (${report.ek9Table.baslik} — ${report.ek9Table.satirSayisi} satır)` : "Model Kalite Kontrol Formu"}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {report.ruleSource.regulation.ad} · RG {report.ruleSource.regulation.resmiGazete} · şema {report.model.schema}
            {report.model.discipline ? ` · disiplin ${report.model.discipline}` : ""}
          </p>
        </div>
        <div className="flex gap-2 text-[10px]">
          <Badge variant="outline" className="border-red-500/30 text-red-400">{report.summary.hata} hata</Badge>
          <Badge variant="outline" className="border-amber-500/30 text-amber-300">{report.summary.uyari} uyarı</Badge>
          <Badge variant="outline" className="border-border text-muted-foreground">{report.summary.elle} elle</Badge>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-card text-muted-foreground"><tr><th className="p-2">No</th><th className="p-2">Bölüm</th><th className="p-2">Kontrol</th><th className="p-2">Karar</th><th className="p-2">Bulgu</th></tr></thead>
          <tbody>
            {report.ek9.map(row => (
              <tr key={row.no} className="border-t border-border align-top">
                <td className="p-2 font-mono text-muted-foreground">{row.no}</td>
                <td className="p-2 text-muted-foreground">{row.bolum}</td>
                <td className="p-2 text-foreground dark:text-muted-foreground"><b>{row.baslik}</b><div className="text-[11px] text-muted-foreground">{row.soru}</div>{row.elleNotu && <div className="mt-1 text-[11px] text-muted-foreground">{row.elleNotu}</div>}</td>
                <td className="p-2"><Badge variant="outline" className={DECISION_CLASS[row.karar] ?? "border-border text-muted-foreground"}>{row.karar}</Badge></td>
                <td className="p-2 text-muted-foreground">{row.bulgu}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {report.findings.length > 0 && (
        <details className="rounded-xl border border-border p-3 text-xs">
          <summary className="cursor-pointer text-foreground dark:text-muted-foreground">Bulgu ayrıntısı ({report.findings.length}{report.findingsTruncated ? "+" : ""})</summary>
          <ul className="mt-3 space-y-2">
            {report.findings.map((finding, index) => (
              <li key={`${finding.kod}-${index}`} className="text-muted-foreground">
                <span className={finding.seviye === "hata" ? "text-red-400" : finding.seviye === "uyari" ? "text-amber-300" : "text-muted-foreground"}>{finding.seviye.toUpperCase()}</span> [{finding.madde}] {finding.mesaj}
                {finding.varliklar.length > 0 && <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">GlobalId: {finding.varliklar.join(", ")}{finding.sayi && finding.sayi > finding.varliklar.length ? ` … toplam ${finding.sayi}` : ""}</div>}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="text-[10px] leading-relaxed text-muted-foreground">{report.disclaimer} Kural verisi: {report.ruleSource.engine.name} {report.ruleSource.engine.version} ({report.ruleSource.engine.upstreamCommit}).</p>
    </section>
  );
}
