import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";

type PdfReport = {
  file: { fileName: string; pageCount: number };
  pdfa: { claimed: { part: string; conformance: string } | null; note: string };
  summary: { hata: number; uyari: number; elle: number };
  findings: Array<{ kod: string; seviye: string; mesaj: string; madde: string; sayfalar?: number[] }>;
  disclaimer: string;
};

export function PdfPreflightPanel({ documentId, refreshKey }: { documentId: string; refreshKey: number }) {
  const [report, setReport] = useState<PdfReport | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setReport(null);
    setError(false);
    fetchWithAuth(`/api/smartcheck/documents/${documentId}/pdf-preflight`)
      .then(async response => {
        if (!response.ok) throw new Error("PDF_PREFLIGHT_UNAVAILABLE");
        const body = await response.json() as PdfReport;
        if (!cancelled) setReport(body);
      }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [documentId, refreshKey]);

  if (error) return <p className="p-4 text-xs text-amber-400">PDF/A ön kontrolü okunamadı. İşleme tamamlandıktan sonra yeniden açın.</p>;
  if (!report) return <p className="p-4 text-xs text-zinc-500">PDF/A ön kontrolü yükleniyor…</p>;
  return <section className="space-y-3 border-t border-zinc-800 p-4 text-xs" aria-label="PDF/A ön kontrolü">
    <h3 className="font-bold text-zinc-200">PDF/A ön kontrolü · {report.file.pageCount} sayfa</h3>
    <p className="text-zinc-400">{report.summary.hata} hata · {report.summary.uyari} uyarı · {report.summary.elle} elle kontrol</p>
    <p className="text-zinc-500">{report.pdfa.claimed ? `PDF/A-${report.pdfa.claimed.part}${report.pdfa.claimed.conformance} kimlik beyanı` : "PDF/A kimlik beyanı yok"}</p>
    <ul className="space-y-2">{report.findings.map((finding, index) => <li key={`${finding.kod}-${index}`} className="rounded-md border border-zinc-800 p-3 text-zinc-400"><b className={finding.seviye === "hata" ? "text-red-400" : "text-zinc-300"}>{finding.seviye.toUpperCase()} · {finding.kod}</b><p className="mt-1">{finding.mesaj}</p><p className="mt-1 text-zinc-600">{finding.madde}{finding.sayfalar?.length ? ` · sayfalar: ${finding.sayfalar.join(", ")}` : ""}</p></li>)}</ul>
    <p className="text-zinc-500">{report.disclaimer} {report.pdfa.note}</p>
  </section>;
}
