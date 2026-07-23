import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Eye, FileSpreadsheet, Layers3, Loader2, RefreshCw, ShieldAlert, Table2, Upload } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { getMappingProfile, MEP_MAPPING_PROFILES } from "@/smartcheck/import/mapping-profiles";
import type { ColumnMapping } from "@/smartcheck/import/normalize";

type Finding = { code: string; message: string; ruleVersion: string; suggestion: string };

type Row = {
  id: string;
  sheetName: string;
  sourceRowNumber: number;
  sourceCellRange: string;
  rawDescription: string | null;
  rawPositionCode: string | null;
  rawUnit: string | null;
  rawQuantity: string | null;
  rawPrice: string | null;
  rawWastePercent: string | null;
  formulaJson: Record<string, string>;
  normalizedDescription: string | null;
  normalizedPositionCode: string | null;
  normalizedUnit: string | null;
  normalizedQuantity: string | null;
  normalizedPrice: string | null;
  normalizedWastePercent: string | null;
  mappingConfidence: string;
  reviewStatus: string;
  reviewerUserId: string | null;
  reviewedAt: string | null;
  reviewerNotes: string | null;
  findingsJson: Finding[];
};

type PreviewSheet = {
  name: string;
  rowCount: number;
  columnCount: number;
  sampleRows: string[][];
  suggestedMapping: ColumnMapping;
  formulaCells: string[];
};

type DocumentPreview = { kind: "xlsx" | "csv"; sheets: PreviewSheet[] };

type QueueItem = {
  id: string;
  documentId: string;
  fileName: string | null;
  status: string;
  currentStage: string;
  progressPercent: number;
  progressMessage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type PriceSnapshotOption = { id: string; positionCode: string | null; description: string; unit: string; amount: string; currency: string; stale: boolean; reviewStatus: string };

const mappingFields: Array<keyof ColumnMapping> = ["positionCode", "description", "unit", "quantity", "price", "wastePercent"];
const mappingLabels: Record<string, string> = { positionCode: "Poz No", description: "Açıklama", unit: "Birim", quantity: "Miktar", price: "Birim Fiyat", wastePercent: "Zayiat" };

async function checksum(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function statusLabel(status: string) {
  return ({ pending_review: "İnceleme bekliyor", approved: "Onaylandı", accepted_exception: "İstisna onaylı", rejected: "Reddedildi" } as Record<string, string>)[status] ?? status;
}

export function SmartCheckImportWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("Dosya bekleniyor");
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headerRow, setHeaderRow] = useState("1");
  const [selectedProfileId, setSelectedProfileId] = useState(MEP_MAPPING_PROFILES[0].id);
  const [quotes, setQuotes] = useState<Array<{ id: string; quoteNumber: string; projectName: string; status: string }>>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [quotationId, setQuotationId] = useState("");
  const [transferredQuotationId, setTransferredQuotationId] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [commercial, setCommercial] = useState({ costUnitPrice: "", wastePercent: "0", vatPercent: "20" });
  const [mapping, setMapping] = useState<ColumnMapping>(MEP_MAPPING_PROFILES[0].mapping);
  const [priceSnapshots, setPriceSnapshots] = useState<PriceSnapshotOption[]>([]);
  const [snapshotByRow, setSnapshotByRow] = useState<Record<string, string>>({});
  const [pilotCaseId, setPilotCaseId] = useState<string | null>(null);
  const [pilotMeta, setPilotMeta] = useState({ pilotId: "", customerReference: "", projectReference: "", permissionReference: "", permissionGrantedAt: new Date().toISOString().slice(0, 10), retentionUntil: "", expectedRowCount: "0" });
  const polling = useRef<number | null>(null);
  const pollInFlight = useRef(false);

  const loadQueue = async () => {
    const response = await fetchWithAuth("/api/smartcheck/queue");
    if (response.ok) setQueue(await response.json());
  };

  const loadPriceSnapshots = async () => {
    const [advisory, approved] = await Promise.all([
      fetchWithAuth("/api/pricing/snapshots?status=advisory&limit=200"),
      fetchWithAuth("/api/pricing/snapshots?status=approved&limit=200"),
    ]);
    const rows = [
      ...(advisory.ok ? await advisory.json() : []),
      ...(approved.ok ? await approved.json() : []),
    ] as PriceSnapshotOption[];
    setPriceSnapshots(rows.filter((snapshot, index, all) => all.findIndex((candidate) => candidate.id === snapshot.id) === index));
  };

  useEffect(() => {
    fetchWithAuth("/api/quotations").then(async (response) => response.ok ? setQuotes(await response.json()) : undefined);
    loadQueue();
    loadPriceSnapshots().catch(() => undefined);
    return () => { if (polling.current) window.clearInterval(polling.current); };
  }, []);

  const loadRows = async (id: string) => {
    const response = await fetchWithAuth(`/api/smartcheck/documents/${id}/rows`);
    if (response.ok) setRows(await response.json());
  };

  const loadPreview = async (id: string) => {
    setPreviewBusy(true);
    const response = await fetchWithAuth(`/api/smartcheck/documents/${id}/preview`);
    const body = await response.json();
    setPreviewBusy(false);
    if (!response.ok) throw new Error(body.error ?? "Dosya önizlenemedi.");
    const nextPreview = body.preview as DocumentPreview;
    setPreview(nextPreview);
    const storedMapping = (body.document?.mapping ?? {}) as ColumnMapping;
    const sheet = storedMapping.sheet ?? nextPreview.sheets[0]?.name ?? "";
    const profile = getMappingProfile(storedMapping.profileId) ?? MEP_MAPPING_PROFILES[0];
    setSelectedSheet(sheet);
    setHeaderRow(String(storedMapping.headerRow ?? profile.mapping.headerRow ?? 1));
    setSelectedProfileId(profile.id);
    setMapping({ ...profile.mapping, ...storedMapping, profileId: profile.id, sheet });
  };

  const poll = (id: string) => {
    if (polling.current) window.clearInterval(polling.current);
    polling.current = window.setInterval(async () => {
      if (pollInFlight.current) return;
      pollInFlight.current = true;
      try {
        const response = await fetchWithAuth(`/api/smartcheck/documents/${id}/status`);
        if (!response.ok) return;
        const data = await response.json();
        setStage(data.run?.progressMessage ?? data.document.status);
        if (["succeeded", "failed"].includes(data.run?.status)) {
          window.clearInterval(polling.current!);
          polling.current = null;
          setBusy(false);
          await loadQueue();
          if (data.run.status === "succeeded") await loadRows(id);
          else toast.error(data.run.errorMessage ?? "İşleme başarısız.");
        }
      } finally {
        pollInFlight.current = false;
      }
    }, 2000);
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setRows([]);
    setSnapshotByRow({});
    setPreview(null);
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
      setPilotCaseId(null);
      setStage("Dosya bütünlüğü doğrulanıyor");
      const completeResponse = await fetchWithAuth(`/api/smartcheck/documents/${target.documentId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checksumSha256: await checksum(file) }) });
      if (!completeResponse.ok) throw new Error((await completeResponse.json()).error ?? "Dosya doğrulanamadı.");
      setStage("Kaynak önizleme hazırlanıyor");
      await loadPreview(target.documentId);
      await loadQueue();
      setStage("Eşleme onayı bekleniyor");
      setBusy(false);
    } catch (error) {
      setBusy(false);
      toast.error(error instanceof Error ? error.message : "SmartCheck yüklemesi başarısız.");
    }
  };

  const admitPilotCase = async () => {
    if (!documentId) return;
    const response = await fetchWithAuth("/api/smartcheck/pilot-cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId, ...pilotMeta, expectedRowCount: Number(pilotMeta.expectedRowCount) }) });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error ?? "Pilot case kaydedilemedi.");
    setPilotCaseId(body.id);
    toast.success("Pilot case izin ve retention referansıyla kaydedildi.");
  };

  const startProcessing = async () => {
    if (!documentId || !selectedSheet) return;
    setBusy(true);
    try {
      const mappingPayload = { ...mapping, profileId: selectedProfileId, sheet: selectedSheet, headerRow: Number(headerRow) };
      const mappingResponse = await fetchWithAuth(`/api/smartcheck/documents/${documentId}/mapping`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mappingPayload) });
      if (!mappingResponse.ok) throw new Error((await mappingResponse.json()).error ?? "Kolon eşlemesi kaydedilemedi.");
      const processResponse = await fetchWithAuth(`/api/smartcheck/documents/${documentId}/process`, { method: "POST" });
      if (!processResponse.ok) throw new Error((await processResponse.json()).error ?? "İşleme başlatılamadı.");
      setStage("Kuyruğa alındı");
      await loadQueue();
      poll(documentId);
    } catch (error) {
      setBusy(false);
      toast.error(error instanceof Error ? error.message : "SmartCheck işlemi başlatılamadı.");
    }
  };

  const retry = async (id: string) => {
    setBusy(true);
    const response = await fetchWithAuth(`/api/smartcheck/documents/${id}/retry`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      setBusy(false);
      return toast.error(body.error ?? "Tekrar deneme kuyruğa alınamadı.");
    }
    setDocumentId(id);
    setStage("Tekrar kuyruğa alındı");
    await loadQueue();
    poll(id);
  };

  const review = async (row: Row, status: "approved" | "rejected" | "accepted_exception", correction?: Record<string, string>) => {
    const notes = status === "rejected" ? window.prompt("Red gerekçesi", "Kaynak satır düzeltilmek üzere reddedildi.")?.trim() : status === "accepted_exception" ? window.prompt("İstisna gerekçesi")?.trim() : undefined;
    if ((status === "accepted_exception" || status === "rejected") && !notes) return;
    const response = await fetchWithAuth(`/api/smartcheck/rows/${row.id}/review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, notes, correction }) });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error ?? "Review kararı kaydedilemedi.");
    if (documentId) await loadRows(documentId);
  };

  const transfer = async () => {
    if (!documentId || !quotationId) return;
    const reviewed = rows.filter((row) => row.reviewStatus === "approved" || row.reviewStatus === "accepted_exception");
    const overrides = Object.fromEntries(reviewed.map((row) => [row.id, {
      ...(commercial.costUnitPrice ? { costUnitPrice: Number(commercial.costUnitPrice) } : {}),
      ...(snapshotByRow[row.id] ? { priceSnapshotId: snapshotByRow[row.id] } : {}),
      wastePercent: Number(commercial.wastePercent), vatPercent: Number(commercial.vatPercent),
    }]));
    const response = await fetchWithAuth(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quotationId, rowIds: reviewed.map((row) => row.id), overrides }) });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error ?? "Aktarım başarısız.");
    setTransferredQuotationId(body.quotationId);
    toast.success(`${body.transferredCount} onaylı satır teklife aktarıldı.`);
  };

  const activeSheet = preview?.sheets.find((sheet) => sheet.name === selectedSheet) ?? preview?.sheets[0];
  const reviewedRows = rows.filter((row) => row.reviewStatus === "approved" || row.reviewStatus === "accepted_exception");
  const snapshotOptionsForRow = (row: Row) => priceSnapshots.filter((snapshot) => !snapshot.positionCode || snapshot.positionCode === row.normalizedPositionCode || snapshot.positionCode === row.rawPositionCode);

  return (
    <section className="mb-8 rounded-3xl border border-orange-500/20 bg-zinc-950 p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">Evidence-first pilot</p><h2 className="mt-2 text-xl font-black text-white">Excel/CSV SmartCheck çalışma alanı</h2><p className="mt-1 text-xs text-zinc-500">Yükle → kaynak önizlemeyi doğrula → kolonları eşle → bulguları incele → aktar.</p></div>
        <Badge className="w-fit border-emerald-500/20 bg-emerald-500/10 text-emerald-400">{stage}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-700 p-6 text-center hover:border-orange-500/50">
            <FileSpreadsheet className="text-orange-500" /><span className="text-xs font-bold text-zinc-300">{file?.name ?? "XLSX veya CSV seçin (en fazla 25 MB)"}</span>
            <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setRows([]); }} />
          </label>
          <Button disabled={!file || busy} onClick={upload} className="w-full gap-2 bg-orange-600 text-white hover:bg-orange-700">{busy && !preview ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />} Yükle ve önizle</Button>

          {preview && <div className="space-y-3 border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-200"><Table2 size={14} className="text-orange-400" /> Kaynak yapısı</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500">Sheet<select aria-label="Sheet" value={selectedSheet} onChange={(event) => { setSelectedSheet(event.target.value); setMapping((current) => ({ ...current, sheet: event.target.value })); }} className="mt-1 h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200">{preview.sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name} · {sheet.rowCount} satır</option>)}</select></label>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500">Başlık satırı<input aria-label="Başlık satırı" type="number" min="1" max="100" value={headerRow} onChange={(event) => setHeaderRow(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200" /></label>
            </div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500">MEP eşleme profili<select aria-label="MEP eşleme profili" value={selectedProfileId} onChange={(event) => { const profile = getMappingProfile(event.target.value); if (!profile) return; setSelectedProfileId(profile.id); setMapping((current) => ({ ...profile.mapping, profileId: profile.id, sheet: selectedSheet, headerRow: Number(headerRow) })); }} className="mt-1 h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200">{MEP_MAPPING_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
            <p className="text-[10px] leading-relaxed text-zinc-500">Profil yalnız kolon eşleme önerisidir; miktar, fiyat ve kural onayı üretmez.</p>
            <div className="grid grid-cols-2 gap-2">{mappingFields.map((key) => <Input key={key} aria-label={key} placeholder={mappingLabels[key]} value={String(mapping[key] ?? "")} onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value }))} className="h-9 border-zinc-800 bg-zinc-950 text-xs" />)}</div>
            <Button disabled={busy || previewBusy || !selectedSheet} onClick={startProcessing} className="w-full gap-2 bg-sky-600 text-white hover:bg-sky-700">{busy ? <Loader2 className="animate-spin" size={15} /> : <Layers3 size={15} />} Eşlemeyi onayla ve işle</Button>
          </div>}
          {documentId && <div className="space-y-3 border-t border-zinc-800 pt-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-zinc-200">Pilot kanıt kaydı</p><p className="mt-1 text-[10px] text-zinc-500">Müşteri adı yerine kontrollü referans, izin ve retention kaydedilir.</p></div>{pilotCaseId && <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">Case kaydedildi</Badge>}</div><div className="grid grid-cols-2 gap-2"><Input aria-label="Pilot kimliği" placeholder="Pilot kimliği" value={pilotMeta.pilotId} onChange={(event) => setPilotMeta((value) => ({ ...value, pilotId: event.target.value }))} className="border-zinc-800 bg-zinc-950 text-xs" /><Input aria-label="Müşteri referansı" placeholder="Müşteri referansı" value={pilotMeta.customerReference} onChange={(event) => setPilotMeta((value) => ({ ...value, customerReference: event.target.value }))} className="border-zinc-800 bg-zinc-950 text-xs" /></div><div className="grid grid-cols-2 gap-2"><Input aria-label="Proje referansı" placeholder="Proje referansı" value={pilotMeta.projectReference} onChange={(event) => setPilotMeta((value) => ({ ...value, projectReference: event.target.value }))} className="border-zinc-800 bg-zinc-950 text-xs" /><Input aria-label="İzin referansı" placeholder="İzin referansı" value={pilotMeta.permissionReference} onChange={(event) => setPilotMeta((value) => ({ ...value, permissionReference: event.target.value }))} className="border-zinc-800 bg-zinc-950 text-xs" /></div><div className="grid grid-cols-3 gap-2"><Input aria-label="İzin tarihi" type="date" value={pilotMeta.permissionGrantedAt} onChange={(event) => setPilotMeta((value) => ({ ...value, permissionGrantedAt: event.target.value }))} className="border-zinc-800 bg-zinc-950 text-xs" /><Input aria-label="Retention tarihi" type="date" value={pilotMeta.retentionUntil} onChange={(event) => setPilotMeta((value) => ({ ...value, retentionUntil: event.target.value }))} className="border-zinc-800 bg-zinc-950 text-xs" /><Input aria-label="Beklenen satır" type="number" min="0" placeholder="Beklenen satır" value={pilotMeta.expectedRowCount} onChange={(event) => setPilotMeta((value) => ({ ...value, expectedRowCount: event.target.value }))} className="border-zinc-800 bg-zinc-950 text-xs" /></div><Button disabled={busy || Boolean(pilotCaseId) || !pilotMeta.pilotId || !pilotMeta.customerReference || !pilotMeta.projectReference || !pilotMeta.permissionReference || !pilotMeta.retentionUntil} onClick={() => void admitPilotCase()} variant="outline" className="w-full border-orange-500/30 text-orange-300 hover:bg-orange-500/10">{pilotCaseId ? "Pilot case kaydedildi" : "İzin ve retention ile pilot case oluştur"}</Button></div>}
        </div>

        <div className="space-y-4 overflow-auto rounded-2xl border border-zinc-800">
          {preview && !rows.length && activeSheet && <div className="border-b border-zinc-800 p-4"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold text-zinc-200">Kaynak önizleme · {activeSheet.name}</p><p className="mt-1 text-[10px] text-zinc-500">{activeSheet.rowCount} satır · {activeSheet.columnCount} kolon · Önerilen eşleme güvenli olmayan taslaktır.</p></div>{activeSheet.formulaCells.length > 0 && <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">{activeSheet.formulaCells.length} formül hücresi</Badge>}</div><div className="overflow-auto rounded-xl border border-zinc-900"><table className="w-full min-w-[640px] text-left text-[11px]"><tbody>{activeSheet.sampleRows.map((row, rowIndex) => <tr key={`${rowIndex}-${row.join("|")}`} className={rowIndex === Number(headerRow) - 1 ? "bg-orange-500/10 text-orange-200" : "border-t border-zinc-900 text-zinc-400"}>{row.map((value, columnIndex) => <td key={`${rowIndex}-${columnIndex}`} className="max-w-48 truncate p-2" title={value}>{value || "—"}</td>)}</tr>)}</tbody></table></div></div>}
          {rows.length === 0 && !preview ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center text-xs text-zinc-500"><ShieldAlert />Önce kaynak dosya önizlemesi, ardından normalize edilmiş satırlar ve kanıtlar burada görünecek.</div> : rows.length === 0 && previewBusy ? <div className="flex min-h-32 items-center justify-center gap-2 p-8 text-xs text-zinc-500"><Loader2 className="animate-spin" size={16} />Önizleme hazırlanıyor…</div> : rows.length === 0 && preview ? <div className="flex items-center gap-2 p-4 text-xs text-zinc-500"><Eye size={14} className="text-sky-400" />Önizlemeyi kontrol edin; işlem başladığında normalize edilmiş sonuçlar burada görünecek.</div> : <table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-zinc-900 text-zinc-500"><tr><th className="p-3">Kaynak</th><th className="p-3">Poz / Açıklama</th><th className="p-3">Miktar</th><th className="p-3">Bulgular</th><th className="p-3">Karar</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-zinc-900 align-top"><td className="p-3 font-mono text-orange-400">{row.sheetName}!{row.sourceCellRange}<div className="mt-1 text-[10px] text-zinc-600">satır {row.sourceRowNumber}</div></td><td className="p-3 text-zinc-300"><b>{row.rawPositionCode || "Poz yok"}</b><div className="text-zinc-500">{row.rawDescription}</div><Badge className="mt-2 border-zinc-700 bg-zinc-900 text-[10px] text-zinc-400">{Math.round(Number(row.mappingConfidence) * 100)}% eşleme</Badge></td><td className="p-3 text-zinc-300">{row.normalizedQuantity ?? row.rawQuantity} {row.normalizedUnit ?? row.rawUnit}</td><td className="p-3">{row.findingsJson.length ? row.findingsJson.map((finding) => <div key={finding.code} title={`${finding.ruleVersion}: ${finding.suggestion}`} className="mb-1 text-amber-400">{finding.message}</div>) : <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 size={13} /> Bulgu yok</span>}</td><td className="p-3"><div className="mb-2 text-[10px] text-zinc-500">{statusLabel(row.reviewStatus)}</div><div className="flex flex-wrap gap-2"><Button size="sm" disabled={row.findingsJson.length > 0 || row.reviewStatus === "approved"} onClick={() => review(row, "approved")}>Onayla</Button>{row.findingsJson.length > 0 && <Button size="sm" variant="outline" onClick={() => { const quantity = window.prompt("Düzeltilmiş miktar", row.rawQuantity ?? ""); if (quantity !== null) review(row, "approved", { quantity }); }}>Miktarı düzelt</Button>}<Button size="sm" variant="outline" onClick={() => review(row, "accepted_exception")}>İstisna</Button><Button size="sm" variant="outline" onClick={() => review(row, "rejected")}>Reddet</Button><Button size="sm" variant="ghost" onClick={() => setExpandedRowId((current) => current === row.id ? null : row.id)}><ChevronDown size={13} className={expandedRowId === row.id ? "rotate-180" : ""} />Kanıt</Button></div></td></tr>).flatMap((rowElement, index) => { const row = rows[index]; return expandedRowId === row.id ? [rowElement, <tr key={`${row.id}-evidence`} className="border-t border-sky-500/10 bg-sky-500/[0.03]"><td colSpan={5} className="p-4"><div className="grid gap-4 md:grid-cols-3"><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-sky-400">Kaynak değer</p><dl className="space-y-1 text-[11px] text-zinc-400"><div className="flex justify-between gap-3"><dt>Poz</dt><dd>{row.rawPositionCode || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Açıklama</dt><dd>{row.rawDescription || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Birim</dt><dd>{row.rawUnit || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Miktar</dt><dd>{row.rawQuantity || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Fiyat</dt><dd>{row.rawPrice || "—"}</dd></div></dl></div><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">Normalize değer</p><dl className="space-y-1 text-[11px] text-zinc-400"><div className="flex justify-between gap-3"><dt>Poz</dt><dd>{row.normalizedPositionCode || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Açıklama</dt><dd>{row.normalizedDescription || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Birim</dt><dd>{row.normalizedUnit || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Miktar</dt><dd>{row.normalizedQuantity || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Fiyat</dt><dd>{row.normalizedPrice || "—"}</dd></div></dl></div><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-orange-400">Kural ve inceleme</p><dl className="space-y-1 text-[11px] text-zinc-400"><div className="flex justify-between gap-3"><dt>Durum</dt><dd>{statusLabel(row.reviewStatus)}</dd></div><div className="flex justify-between gap-3"><dt>İnceleme</dt><dd>{row.reviewedAt ? new Date(row.reviewedAt).toLocaleString("tr-TR") : "Bekliyor"}</dd></div><div className="flex justify-between gap-3"><dt>Not</dt><dd>{row.reviewerNotes || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Formül</dt><dd>{Object.keys(row.formulaJson ?? {}).length ? Object.entries(row.formulaJson).map(([cell, formula]) => <span key={cell} className="block font-mono text-amber-300">{cell}: {formula}</span>) : "Yok"}</dd></div></dl>{row.findingsJson.map((finding) => <p key={finding.code} className="mt-2 text-[10px] text-amber-300">{finding.code} · {finding.ruleVersion}<br />{finding.suggestion}</p>)}</div></div></td></tr>] : [rowElement]; })}</tbody></table>}
        </div>
      </div>

      {reviewedRows.length > 0 && priceSnapshots.length > 0 && <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4"><div className="mb-3"><p className="text-xs font-bold text-sky-200">Fiyat kanıtı eşlemesi</p><p className="mt-1 text-[10px] text-zinc-500">Snapshot seçimi opsiyoneldir; seçilen kaynak hash’i aktarımda kalem kanıtına bağlanır. Fiyat kilidi için tüm kalemler kanıtlı olmalıdır.</p></div><div className="grid gap-2 md:grid-cols-2">{reviewedRows.map((row) => <label key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-[10px] text-zinc-400"><span className="min-w-0 truncate">{row.normalizedPositionCode || row.rawPositionCode || "Poz yok"} · {row.normalizedDescription || row.rawDescription || "Kalem"}</span><select aria-label={`Fiyat kanıtı ${row.id}`} value={snapshotByRow[row.id] ?? ""} onChange={(event) => setSnapshotByRow((current) => ({ ...current, [row.id]: event.target.value }))} className="h-8 max-w-64 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-[10px] text-zinc-300"><option value="">Snapshot seç</option>{snapshotOptionsForRow(row).map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{snapshot.positionCode ?? "Genel"} · {snapshot.description.slice(0, 24)} · {Number(snapshot.amount).toLocaleString("tr-TR")} {snapshot.currency}{snapshot.stale ? " · eski" : ""}</option>)}</select></label>)}</div></div>}

      {queue.length > 0 && <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold text-zinc-200">İşleme kuyruğu</p><p className="mt-1 text-[10px] text-zinc-500">Tenant içindeki son SmartCheck işlemleri; başarısız run yalnızca açık retry ile tekrar başlar.</p></div><Button size="sm" variant="ghost" onClick={loadQueue}><RefreshCw size={13} />Yenile</Button></div><div className="grid gap-2 md:grid-cols-2">{queue.slice(0, 6).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 p-3"><div className="min-w-0"><p className="truncate text-xs text-zinc-300">{item.fileName ?? "Dosya"}</p><p className="mt-1 text-[10px] text-zinc-500">{item.progressMessage ?? item.currentStage} · %{item.progressPercent}</p>{item.errorCode && <p className="mt-1 truncate text-[10px] text-rose-300" title={item.errorMessage ?? item.errorCode}>{item.errorCode}</p>}</div><div className="flex shrink-0 items-center gap-2"><Badge className={item.status === "failed" ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : item.status === "succeeded" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-sky-500/30 bg-sky-500/10 text-sky-300"}>{item.status}</Badge>{item.status === "failed" && <Button size="sm" variant="outline" onClick={() => retry(item.documentId)}>Retry</Button>}</div></div>)}</div></div>}

      {reviewedRows.length > 0 && <div className="mt-4 grid gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 md:grid-cols-5"><div className="md:col-span-2"><p className="text-xs font-bold text-emerald-300">{reviewedRows.length} satır aktarım için hazır</p><p className="mt-1 text-[10px] text-zinc-500">İstisna satırları gerekçesiyle birlikte korunur.</p></div><select aria-label="Taslak teklif" value={quotationId} onChange={(event) => setQuotationId(event.target.value)} className="h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-200"><option value="">Taslak teklif seçin</option>{quotes.filter((quote) => quote.status === "draft").map((quote) => <option key={quote.id} value={quote.id}>{quote.quoteNumber} · {quote.projectName}</option>)}</select><Input aria-label="Gerçek maliyet" placeholder="Gerçek maliyet (opsiyonel)" value={commercial.costUnitPrice} onChange={(event) => setCommercial((value) => ({ ...value, costUnitPrice: event.target.value }))} className="border-zinc-800 bg-zinc-950" /><Button disabled={!quotationId} onClick={transfer} className="bg-emerald-600 text-white hover:bg-emerald-700">Onaylıları aktar</Button>{transferredQuotationId && <Link className="text-xs font-bold text-emerald-400 underline" to={`/app/quotes/${transferredQuotationId}`}>Teklif taslağını aç</Link>}</div>}
    </section>
  );
}
