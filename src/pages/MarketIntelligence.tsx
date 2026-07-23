import { useCallback, useEffect, useState } from "react";
import { BarChart3, Check, FileUp, Loader2, RefreshCw, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SupplierEntry = { id: string; description: string; positionCode: string | null; unit: string; unitPrice: string; currency: string; outlierStatus: string; baselineCount: number; confidence: string; reviewStatus: string; priceSnapshotId: string | null; sourceProcessingRunId: string | null; sourceQuantityRowId: string | null; sourceCellRange: string | null };
type SupplierSubmission = { id: string; supplierName: string; documentId: string | null; sourceDocumentIdentifier: string; quoteNumber: string | null; region: string | null; deliveryTerms: string | null; status: string; confidence: string; entries: SupplierEntry[] };

const emptyForm = { supplierName: "", sourceDocumentIdentifier: "", quoteNumber: "", region: "", deliveryTerms: "", validUntil: "" };
const emptyEntry = { positionCode: "", description: "", unit: "adet", unitPrice: "", region: "" };

async function readJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetchWithAuth(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Piyasa verisi işlemi başarısız.");
  return body as T;
}
async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function uploadSourceFile(file: File) {
  const checksumSha256 = await sha256(file);
  const target = await readJson<{ documentId: string; uploadUrl: string; method: string }>("/api/smartcheck/documents/uploads", { method: "POST", body: JSON.stringify({ fileName: file.name, mimeType: file.type || "application/octet-stream", fileSizeBytes: file.size }) });
  const uploadResponse = target.uploadUrl.startsWith("/")
    ? await fetchWithAuth(target.uploadUrl, { method: target.method, headers: { "content-type": file.type || "application/octet-stream" }, body: file })
    : await fetch(target.uploadUrl, { method: target.method, headers: { "content-type": file.type || "application/octet-stream" }, body: file });
  if (!uploadResponse.ok) throw new Error("Kaynak dosya yüklenemedi.");
  await readJson(`/api/smartcheck/documents/${target.documentId}/complete`, { method: "POST", body: JSON.stringify({ checksumSha256 }) });
  return { documentId: target.documentId, checksumSha256, fileName: file.name };
}

export function MarketIntelligence() {
  const [submissions, setSubmissions] = useState<SupplierSubmission[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [entry, setEntry] = useState(emptyEntry);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [memory, setMemory] = useState<{ count: number; median: number | null; min: number | null; max: number | null } | null>(null);
  const activeSubmission = submissions.find((submission) => submission.id === activeId) ?? null;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [quotes, memoryResponse] = await Promise.all([
        readJson<SupplierSubmission[]>("/api/market-intelligence/supplier-quotes"),
        readJson<{ summary: { count: number; median: number | null; min: number | null; max: number | null } }>("/api/market-intelligence/price-memory?currency=TRY"),
      ]);
      setSubmissions(quotes);
      setMemory(memoryResponse.summary);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Piyasa verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const createSubmission = async () => {
    if (!file || !form.supplierName) return toast.error("Tedarikçi ve kaynak XLSX/CSV dosyası zorunludur.");
    setSaving(true);
    try {
      const uploaded = await uploadSourceFile(file);
      const created = await readJson<SupplierSubmission>("/api/market-intelligence/supplier-quotes", { method: "POST", body: JSON.stringify({ ...form, sourceDocumentIdentifier: form.sourceDocumentIdentifier || uploaded.fileName, documentId: uploaded.documentId, sourceDocumentHash: uploaded.checksumSha256, vatStatus: "unknown", freightStatus: "unknown" }) });
      setActiveId(created.id);
      setForm(emptyForm);
      setFile(null);
      toast.success("Tedarikçi teklifi kaynak kanıtıyla kaydedildi.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tedarikçi teklifi kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const addEntry = async () => {
    if (!activeId || !entry.description || !entry.unitPrice) return toast.error("Aktif teklif, açıklama ve fiyat zorunludur.");
    setSaving(true);
    try {
      const result = await readJson<{ evaluations: Array<{ outlierStatus: string }> }>(`/api/market-intelligence/supplier-quotes/${activeId}/entries`, { method: "POST", body: JSON.stringify({ entries: [{ ...entry, quantity: 1, unitPrice: Number(entry.unitPrice) }] }) });
      toast.success(result.evaluations[0]?.outlierStatus === "outlier" ? "Satır kaydedildi; outlier reviewer kararı bekliyor." : "Satır kaydedildi; reviewer kararı bekliyor.");
      setEntry(emptyEntry);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tedarikçi satırı eklenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const importSmartCheckRows = async () => {
    if (!activeId) return;
    setSaving(true);
    try {
      const result = await readJson<{ insertedCount: number; selectedCount: number }>(`/api/market-intelligence/supplier-quotes/${activeId}/import-smartcheck-rows`, { method: "POST", body: JSON.stringify({}) });
      toast.success(`${result.insertedCount}/${result.selectedCount} onaylı SmartCheck satırı reviewer kuyruğuna aktarıldı.`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "SmartCheck satırları aktarılamadı.");
    } finally {
      setSaving(false);
    }
  };

  const reviewEntry = async (entryId: string, status: "approved" | "rejected") => {
    setSaving(true);
    try {
      await readJson(`/api/market-intelligence/supplier-quote-entries/${entryId}/review`, { method: "PATCH", body: JSON.stringify({ status, notes: "Market Intelligence reviewer kararı." }) });
      toast.success(status === "approved" ? "Satır onaylandı ve price snapshot oluşturuldu." : "Satır reddedildi.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reviewer kararı kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Piyasa Verisi" description="Tedarikçi tekliflerini kaynak hash'i, bölge, teslim koşulu ve insan onayıyla fiyat hafızasına bağlayın." icon={BarChart3} actions={<Button variant="ghost" onClick={() => void refresh()} disabled={loading} className="gap-2 text-zinc-400 hover:text-white"><RefreshCw size={14} className={cn(loading && "animate-spin")} /> Yenile</Button>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="border-zinc-800 bg-zinc-900/20 shadow-none">
          <CardHeader><CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white"><FileUp size={15} className="text-orange-500" /> Tedarikçi teklifi ekle</CardTitle><CardDescription className="text-[10px] leading-relaxed text-zinc-500">Önce XLSX/CSV kaynak dosyası hash’lenir. Satırlar reviewer onayı olmadan fiyat hafızasına girmez.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Input aria-label="Tedarikçi adı" placeholder="Tedarikçi adı" value={form.supplierName} onChange={(event) => setForm((value) => ({ ...value, supplierName: event.target.value }))} className="border-zinc-800 bg-zinc-950" />
            <Input aria-label="Kaynak belge kimliği" placeholder="Kaynak belge kimliği (opsiyonel)" value={form.sourceDocumentIdentifier} onChange={(event) => setForm((value) => ({ ...value, sourceDocumentIdentifier: event.target.value }))} className="border-zinc-800 bg-zinc-950" />
            <div className="grid grid-cols-2 gap-2"><Input aria-label="Teklif numarası" placeholder="Teklif no" value={form.quoteNumber} onChange={(event) => setForm((value) => ({ ...value, quoteNumber: event.target.value }))} className="border-zinc-800 bg-zinc-950" /><Input aria-label="Bölge" placeholder="Bölge" value={form.region} onChange={(event) => setForm((value) => ({ ...value, region: event.target.value }))} className="border-zinc-800 bg-zinc-950" /></div>
            <div className="grid grid-cols-2 gap-2"><Input aria-label="Teslim koşulu" placeholder="Teslim koşulu" value={form.deliveryTerms} onChange={(event) => setForm((value) => ({ ...value, deliveryTerms: event.target.value }))} className="border-zinc-800 bg-zinc-950" /><Input aria-label="Geçerlilik tarihi" type="date" value={form.validUntil} onChange={(event) => setForm((value) => ({ ...value, validUntil: event.target.value }))} className="border-zinc-800 bg-zinc-950" /></div>
            <Input aria-label="Tedarikçi kaynak dosyası" type="file" accept=".xlsx,.csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="border-zinc-800 bg-zinc-950 text-xs" />
            {file && <p className="text-[9px] text-zinc-600">Seçildi: {file.name} · {(file.size / 1024).toFixed(1)} KB</p>}
            <Button onClick={() => void createSubmission()} disabled={saving || !file || !form.supplierName} className="w-full bg-orange-600 text-white hover:bg-orange-500">{saving ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />} Kaynağı kaydet</Button>
            <div className="rounded-xl border border-orange-500/10 bg-orange-500/[0.03] p-3 text-[9px] leading-relaxed text-zinc-500"><ShieldAlert size={12} className="mr-1 inline text-orange-500" /> Gerçek piyasa fiyatı otomatik doğru kabul edilmez. Lisans, ticari koşul ve reviewer kararı ayrı kanıtlardır.</div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-900/20 shadow-none"><CardHeader className="pb-3"><CardTitle className="text-xs font-black uppercase tracking-widest text-white">Firma fiyat hafızası</CardTitle><CardDescription className="text-[10px] text-zinc-500">Onaylı supplier_quote ve company_actual snapshot’ları.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-4 gap-2 text-center">{[["Kayıt", memory?.count ?? 0], ["Medyan", memory?.median == null ? "—" : `${memory.median.toLocaleString("tr-TR")} ₺`], ["Min", memory?.min == null ? "—" : `${memory.min.toLocaleString("tr-TR")} ₺`], ["Max", memory?.max == null ? "—" : `${memory.max.toLocaleString("tr-TR")} ₺`]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-zinc-800 bg-zinc-950 p-2"><p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{label}</p><p className="mt-1 text-xs font-black text-zinc-200">{value}</p></div>)}</div></CardContent></Card>
          {activeId && <Card className="border-orange-500/20 bg-orange-500/[0.03] shadow-none"><CardHeader className="pb-3"><CardTitle className="text-xs font-black uppercase tracking-widest text-white">Kaynak satırları</CardTitle><CardDescription className="text-[10px] text-zinc-500">Onaylı SmartCheck satırlarını aynı kaynak hücresi ve processing run ile aktarın. Manuel giriş yalnız beta fallback’tir.</CardDescription></CardHeader><CardContent className="space-y-2">{activeSubmission?.documentId && <Button onClick={() => void importSmartCheckRows()} disabled={saving} className="w-full bg-orange-600 text-white hover:bg-orange-500">{saving ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />} Onaylı SmartCheck satırlarını aktar</Button>}<div className="border-t border-orange-500/10 pt-3"><p className="mb-2 text-[9px] uppercase tracking-widest text-zinc-600">Manuel beta satırı</p><div className="grid grid-cols-2 gap-2"><Input aria-label="Poz kodu" placeholder="Poz kodu" value={entry.positionCode} onChange={(event) => setEntry((value) => ({ ...value, positionCode: event.target.value }))} className="border-zinc-800 bg-zinc-950" /><Input aria-label="Bölge" placeholder="Bölge" value={entry.region} onChange={(event) => setEntry((value) => ({ ...value, region: event.target.value }))} className="border-zinc-800 bg-zinc-950" /></div><Input aria-label="Satır açıklaması" placeholder="Açıklama" value={entry.description} onChange={(event) => setEntry((value) => ({ ...value, description: event.target.value }))} className="mt-2 border-zinc-800 bg-zinc-950" /><div className="mt-2 grid grid-cols-2 gap-2"><Input aria-label="Birim" placeholder="Birim" value={entry.unit} onChange={(event) => setEntry((value) => ({ ...value, unit: event.target.value }))} className="border-zinc-800 bg-zinc-950" /><Input aria-label="Birim fiyat" placeholder="Birim fiyat" type="number" min="0" value={entry.unitPrice} onChange={(event) => setEntry((value) => ({ ...value, unitPrice: event.target.value }))} className="border-zinc-800 bg-zinc-950" /></div><Button onClick={() => void addEntry()} disabled={saving} className="mt-2 w-full bg-zinc-100 text-zinc-900 hover:bg-white">Satırı reviewer kuyruğuna ekle</Button></div></CardContent></Card>}
        </div>
      </div>
      <Card className="mt-6 border-zinc-800 bg-zinc-900/20 shadow-none"><CardHeader className="pb-3"><CardTitle className="text-xs font-black uppercase tracking-widest text-white">Tedarikçi teklif kuyruğu</CardTitle><CardDescription className="text-[10px] text-zinc-500">Outlier, baseline count ve reviewer kararını aynı kanıt zincirinde görün.</CardDescription></CardHeader><CardContent>{loading ? <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 size={14} className="animate-spin" /> Yükleniyor</div> : submissions.length === 0 ? <p className="rounded-xl border border-dashed border-zinc-800 p-5 text-xs text-zinc-500">Henüz tedarikçi teklifi yok.</p> : <div className="space-y-3">{submissions.map((submission) => <div key={submission.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-black text-zinc-200">{submission.supplierName}</p><p className="mt-1 text-[9px] text-zinc-600">{submission.sourceDocumentIdentifier} {submission.documentId ? "· SmartCheck kaynağı" : "· Manuel kaynak"} {submission.region ? `· ${submission.region}` : ""} {submission.deliveryTerms ? `· ${submission.deliveryTerms}` : ""}</p></div><div className="flex items-center gap-2"><Badge variant="outline" className={submission.status === "approved" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-amber-500/20 bg-amber-500/10 text-amber-400"}>{submission.status}</Badge><Button size="sm" variant="outline" onClick={() => setActiveId(submission.id)}>{submission.documentId ? "Kaynak satırlarını aktar" : "Satır ekle"}</Button></div></div>{submission.entries.length > 0 && <div className="mt-3 space-y-2">{submission.entries.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 p-3"><div className="min-w-0"><p className="truncate text-xs text-zinc-200">{row.positionCode ? `${row.positionCode} · ` : ""}{row.description} · {row.unitPrice} {row.currency}/{row.unit}</p><p className="mt-1 text-[9px] text-zinc-600">{row.sourceQuantityRowId ? "SmartCheck provenance" : "Manual provenance"} · {row.sourceCellRange ? row.sourceCellRange : "cell yok"} · baseline: {row.baselineCount} · confidence: {row.confidence} · snapshot: {row.priceSnapshotId ? "bağlı" : "bekliyor"}</p></div><div className="flex items-center gap-2"><Badge variant="outline" className={row.outlierStatus === "outlier" ? "border-red-500/20 bg-red-500/10 text-red-400" : row.outlierStatus === "normal" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 text-zinc-500"}>{row.outlierStatus}</Badge>{row.reviewStatus === "pending" && <><Button aria-label="Tedarikçi satırını onayla" size="icon-xs" onClick={() => void reviewEntry(row.id, "approved")} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-500"><Check size={12} /></Button><Button aria-label="Tedarikçi satırını reddet" size="icon-xs" variant="destructive" onClick={() => void reviewEntry(row.id, "rejected")} disabled={saving}><X size={12} /></Button></>}</div></div>)}</div>}</div>)}</div>}</CardContent></Card>
    </PageContainer>
  );
}
