import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Loader2, ShieldAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Row = {
  id: string; sourceCellRange: string; rawDescription: string; rawPositionCode: string; rawUnit: string; rawQuantity: string;
  normalizedUnit: string | null; normalizedQuantity: string | null; normalizedPrice: string | null; reviewStatus: string;
  findingsJson: Array<{ code: string; message: string; ruleVersion: string; suggestion: string }>;
};

async function checksum(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function SmartCheckImportWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("Dosya bekleniyor");
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState({ positionCode: "Poz No", description: "Açıklama", unit: "Birim", quantity: "Miktar", price: "Birim Fiyat", wastePercent: "Zayiat" });
  const polling = useRef<number | null>(null);

  useEffect(() => () => { if (polling.current) window.clearInterval(polling.current); }, []);

  const loadRows = async (id: string) => {
    const response = await fetchWithAuth(`/api/smartcheck/documents/${id}/rows`);
    if (response.ok) setRows(await response.json());
  };

  const poll = (id: string) => {
    if (polling.current) window.clearInterval(polling.current);
    polling.current = window.setInterval(async () => {
      const response = await fetchWithAuth(`/api/smartcheck/documents/${id}/status`);
      if (!response.ok) return;
      const data = await response.json();
      setStage(data.run?.progressMessage ?? data.document.status);
      if (["succeeded", "failed"].includes(data.run?.status)) {
        window.clearInterval(polling.current!);
        polling.current = null;
        setBusy(false);
        if (data.run.status === "succeeded") await loadRows(id);
        else toast.error(data.run.errorMessage ?? "İşleme başarısız.");
      }
    }, 1200);
  };

  const uploadAndProcess = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setStage("Güvenli yükleme hazırlanıyor");
      const createResponse = await fetchWithAuth("/api/smartcheck/documents/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, mimeType: file.type || (file.name.endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), fileSizeBytes: file.size }) });
      const target = await createResponse.json();
      if (!createResponse.ok) throw new Error(target.error ?? "Yükleme kaydı oluşturulamadı.");
      const uploadResponse = target.uploadUrl.startsWith("/api/")
        ? await fetchWithAuth(target.uploadUrl, { method: "PUT", headers: target.headers, body: file })
        : await fetch(target.uploadUrl, { method: "PUT", headers: target.headers, body: file });
      if (!uploadResponse.ok) throw new Error("Dosya yüklenemedi.");
      setDocumentId(target.documentId);
      setStage("Dosya bütünlüğü doğrulanıyor");
      const completeResponse = await fetchWithAuth(`/api/smartcheck/documents/${target.documentId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checksumSha256: await checksum(file) }) });
      if (!completeResponse.ok) throw new Error((await completeResponse.json()).error ?? "Dosya doğrulanamadı.");
      const mappingResponse = await fetchWithAuth(`/api/smartcheck/documents/${target.documentId}/mapping`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mapping) });
      if (!mappingResponse.ok) throw new Error((await mappingResponse.json()).error ?? "Kolon eşlemesi kaydedilemedi.");
      const processResponse = await fetchWithAuth(`/api/smartcheck/documents/${target.documentId}/process`, { method: "POST" });
      if (!processResponse.ok) throw new Error((await processResponse.json()).error ?? "İşleme başlatılamadı.");
      setStage("Kuyrukta işleniyor");
      poll(target.documentId);
    } catch (error) {
      setBusy(false);
      toast.error(error instanceof Error ? error.message : "SmartCheck işlemi başarısız.");
    }
  };

  const review = async (row: Row, status: "approved" | "rejected") => {
    const notes = status === "rejected" ? "Kaynak satır düzeltilmek üzere reddedildi." : undefined;
    const response = await fetchWithAuth(`/api/smartcheck/rows/${row.id}/review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, notes }) });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error ?? "Review kararı kaydedilemedi.");
    if (documentId) await loadRows(documentId);
  };

  return (
    <section className="mb-8 rounded-3xl border border-orange-500/20 bg-zinc-950 p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">Evidence-first pilot</p><h2 className="mt-2 text-xl font-black text-white">Excel/CSV SmartCheck çalışma alanı</h2><p className="mt-1 text-xs text-zinc-500">Yükle → kolonları eşle → bulguları incele → onaylı satırları aktar.</p></div>
        <Badge className="w-fit border-emerald-500/20 bg-emerald-500/10 text-emerald-400">{stage}</Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-700 p-6 text-center hover:border-orange-500/50">
            <FileSpreadsheet className="text-orange-500" /><span className="text-xs font-bold text-zinc-300">{file?.name ?? "XLSX veya CSV seçin (en fazla 25 MB)"}</span>
            <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(mapping).map(([key, value]) => <Input key={key} aria-label={key} value={value} onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value }))} className="h-9 border-zinc-800 bg-zinc-950 text-xs" />)}
          </div>
          <Button disabled={!file || busy} onClick={uploadAndProcess} className="w-full gap-2 bg-orange-600 text-white hover:bg-orange-700">{busy ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />} Yükle ve doğrula</Button>
        </div>
        <div className="overflow-auto rounded-2xl border border-zinc-800">
          {rows.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center text-xs text-zinc-500"><ShieldAlert />Normalize edilmiş satırlar ve kaynak hücre kanıtları burada görünecek.</div> : (
            <table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-zinc-900 text-zinc-500"><tr><th className="p-3">Kaynak</th><th className="p-3">Poz / Açıklama</th><th className="p-3">Miktar</th><th className="p-3">Bulgular</th><th className="p-3">Karar</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-zinc-900"><td className="p-3 font-mono text-orange-400">{row.sourceCellRange}</td><td className="p-3 text-zinc-300"><b>{row.rawPositionCode || "Poz yok"}</b><div className="text-zinc-500">{row.rawDescription}</div></td><td className="p-3 text-zinc-300">{row.normalizedQuantity ?? row.rawQuantity} {row.normalizedUnit ?? row.rawUnit}</td><td className="p-3">{row.findingsJson.length ? row.findingsJson.map((finding) => <div key={finding.code} title={`${finding.ruleVersion}: ${finding.suggestion}`} className="mb-1 text-amber-400">{finding.message}</div>) : <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 size={13}/> Bulgu yok</span>}</td><td className="p-3"><div className="flex gap-2"><Button size="sm" disabled={row.findingsJson.length > 0 || row.reviewStatus === "approved"} onClick={() => review(row, "approved")}>Onayla</Button><Button size="sm" variant="outline" onClick={() => review(row, "rejected")}>Reddet</Button></div></td></tr>)}</tbody></table>
          )}
        </div>
      </div>
    </section>
  );
}
