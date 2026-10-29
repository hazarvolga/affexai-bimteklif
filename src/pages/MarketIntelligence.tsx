import { TenantSourcePermissionList } from "@/components/pricing/TenantSourcePermissionList";
import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, Check, FileUp, Loader2, RefreshCw, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { fetchWithAuth } from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { labelOf, OUTLIER_STATUS_LABEL, SUBMISSION_STATUS_LABEL } from '@/i18n/ui-terms';

type SupplierEntry = { id: string; description: string; positionCode: string | null; unit: string; unitPrice: string; currency: string; outlierStatus: string; baselineCount: number; confidence: string; reviewStatus: string; priceSnapshotId: string | null; sourceProcessingRunId: string | null; sourceQuantityRowId: string | null; sourceCellRange: string | null };
type SupplierSubmission = { id: string; supplierName: string; documentId: string | null; sourceDocumentIdentifier: string; quoteNumber: string | null; region: string | null; deliveryTerms: string | null; status: string; confidence: string; entries: SupplierEntry[] };

const nullableText = z.string().nullable();
const supplierEntrySchema = z.object({
  id: z.string(), description: z.string(), positionCode: nullableText, unit: z.string(), unitPrice: z.string(), currency: z.string(),
  outlierStatus: z.string(), baselineCount: z.number().int().nonnegative(), confidence: z.string(), reviewStatus: z.string(),
  priceSnapshotId: nullableText, sourceProcessingRunId: nullableText, sourceQuantityRowId: nullableText, sourceCellRange: nullableText,
});
const supplierSubmissionSchema = z.object({
  id: z.string(), supplierName: z.string(), documentId: nullableText, sourceDocumentIdentifier: z.string(), quoteNumber: nullableText,
  region: nullableText, deliveryTerms: nullableText, status: z.string(), confidence: z.string(), entries: z.array(supplierEntrySchema),
});

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
  const [listError, setListError] = useState(false);
  const [listLoaded, setListLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [memory, setMemory] = useState<{ count: number; median: number | null; min: number | null; max: number | null } | null>(null);
  const [memoryScope, setMemoryScope] = useState({ positionCode: "", unit: "", region: "" });
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const memoryRequest = useRef(0);
  const updateMemoryScope = (field: keyof typeof memoryScope, value: string) => {
    memoryRequest.current++;
    setMemoryScope(current => ({ ...current, [field]: value }));
    setMemory(null);
    setMemoryError(null);
    setMemoryLoading(false);
  };
  const loadMemory = async () => {
    const positionCode = memoryScope.positionCode.trim();
    const unit = memoryScope.unit.trim();
    if (!positionCode || !unit) return;
    const request = ++memoryRequest.current;
    setMemory(null);
    setMemoryError(null);
    setMemoryLoading(true);
    const params = new URLSearchParams({ currency: "TRY", positionCode, unit });
    if (memoryScope.region.trim()) params.set("region", memoryScope.region.trim());
    try {
      const result = await readJson<{ summary: { count: number; median: number | null; min: number | null; max: number | null } }>(`/api/market-intelligence/price-memory?${params}`);
      if (request === memoryRequest.current) setMemory(result.summary);
    } catch {
      if (request === memoryRequest.current) setMemoryError("Fiyat hafızası yüklenemedi. Yeniden deneyin.");
    } finally {
      if (request === memoryRequest.current) setMemoryLoading(false);
    }
  };
  const activeSubmission = submissions.find((submission) => submission.id === activeId) ?? null;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const quotes = await readJson<unknown>("/api/market-intelligence/supplier-quotes");
      const parsed = z.array(supplierSubmissionSchema).safeParse(quotes);
      if (!parsed.success) throw new Error("INVALID_SUPPLIER_QUOTE_LIST");
      // Zod validates every required nullable field at runtime; this project’s
      // TypeScript configuration infers those fields as optional.
      setSubmissions(parsed.data as SupplierSubmission[]);
      setListLoaded(true);
      setListError(false);
    } catch {
      setListError(true);
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
      toast.success(result.evaluations[0]?.outlierStatus === "outlier" ? "Satır kaydedildi; olağandışı fiyat, inceleyen kişinin kararını bekliyor." : "Satır kaydedildi; inceleyen kişinin kararını bekliyor.");
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
      toast.success(`${result.insertedCount}/${result.selectedCount} onaylı SmartCheck satırı inceleme kuyruğuna aktarıldı.`);
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
      toast.success(status === "approved" ? "Satır onaylandı ve kayıtlı fiyat sürümü oluşturuldu." : "Satır reddedildi.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İnceleme kararı kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <TenantSourcePermissionList />
      <PageHeader title="Piyasa Verisi" description="Tedarikçi tekliflerini kaynak dosyası, bölge, teslim koşulu ve inceleme kararıyla firma fiyat hafızasına ekleyin." icon={BarChart3} actions={<Button variant="ghost" onClick={() => void refresh()} disabled={loading} className="gap-2 text-muted-foreground hover:text-foreground"><RefreshCw size={14} className={cn(loading && "animate-spin")} /> Yenile</Button>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="border-border bg-card shadow-none">
          <CardHeader><CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground"><FileUp size={15} className="text-orange-500" /> Tedarikçi teklifi ekle</CardTitle><CardDescription className="text-[10px] leading-relaxed text-muted-foreground">Kaynak dosyanın kimliği kaydedilir. Satırlar inceleyen kişi onaylamadan fiyat hafızasına girmez.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Input aria-label="Tedarikçi adı" placeholder="Tedarikçi adı" value={form.supplierName} onChange={(event) => setForm((value) => ({ ...value, supplierName: event.target.value }))} className="border-border bg-background" />
            <Input aria-label="Kaynak belge kimliği" placeholder="Kaynak belge kimliği (opsiyonel)" value={form.sourceDocumentIdentifier} onChange={(event) => setForm((value) => ({ ...value, sourceDocumentIdentifier: event.target.value }))} className="border-border bg-background" />
            <div className="grid grid-cols-2 gap-2"><Input aria-label="Teklif numarası" placeholder="Teklif no" value={form.quoteNumber} onChange={(event) => setForm((value) => ({ ...value, quoteNumber: event.target.value }))} className="border-border bg-background" /><Input aria-label="Bölge" placeholder="Bölge" value={form.region} onChange={(event) => setForm((value) => ({ ...value, region: event.target.value }))} className="border-border bg-background" /></div>
            <div className="grid grid-cols-2 gap-2"><Input aria-label="Teslim koşulu" placeholder="Teslim koşulu" value={form.deliveryTerms} onChange={(event) => setForm((value) => ({ ...value, deliveryTerms: event.target.value }))} className="border-border bg-background" /><Input aria-label="Geçerlilik tarihi" type="date" value={form.validUntil} onChange={(event) => setForm((value) => ({ ...value, validUntil: event.target.value }))} className="border-border bg-background" /></div>
            <Input aria-label="Tedarikçi kaynak dosyası" type="file" accept=".xlsx,.csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="border-border bg-background text-xs" />
            {file && <p className="text-[11px] text-muted-foreground">Seçildi: {file.name} · {(file.size / 1024).toFixed(1)} KB</p>}
            <Button onClick={() => void createSubmission()} disabled={saving || !file || !form.supplierName} className="w-full bg-orange-600 text-white hover:bg-orange-500">{saving ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />} Kaynağı kaydet</Button>
            <div className="rounded-xl border border-orange-500/10 bg-orange-500/[0.03] p-3 text-[11px] leading-relaxed text-muted-foreground"><ShieldAlert size={12} className="mr-1 inline text-orange-500" /> Piyasa fiyatı otomatik olarak doğru kabul edilmez. Kullanım izni, ticari koşul ve inceleme kararı ayrı ayrı kaydedilir.</div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-none">
            <CardHeader className="pb-3"><CardTitle className="text-xs font-black uppercase tracking-widest text-foreground">Firma fiyat hafızası</CardTitle><CardDescription className="text-xs text-muted-foreground">Karşılaştırma için kayıttaki poz kodu ve birimi aynı yazımla girin; sonuçlar onaylı firma kayıtlarından gelir.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="text-xs">Poz kodu <Input value={memoryScope.positionCode} maxLength={120} onChange={e => updateMemoryScope("positionCode", e.target.value)} /></label>
                <label className="text-xs">Birim <Input value={memoryScope.unit} maxLength={40} onChange={e => updateMemoryScope("unit", e.target.value)} /></label>
                <label className="text-xs">Bölge (isteğe bağlı) <Input value={memoryScope.region} maxLength={120} onChange={e => updateMemoryScope("region", e.target.value)} /></label>
              </div>
              <Button onClick={() => void loadMemory()} disabled={memoryLoading || !memoryScope.positionCode.trim() || !memoryScope.unit.trim()}>{memoryLoading ? "Karşılaştırma yükleniyor…" : "Fiyatları karşılaştır"}</Button>
              <p className="text-xs text-muted-foreground">Son en fazla 500 onaylı TRY kaydı kullanılır. Bölge boşsa bölgeler birlikte değerlendirilir; bölge girildiğinde tam eşleşme aranır; KDV, nakliye, tarih ve diğer ticari koşullar farklı olabilir.</p>
              <div aria-live="polite">
                {memoryLoading ? <p role="status" className="text-xs">Karşılaştırma yükleniyor…</p> : memoryError ? <p role="alert" className="text-xs text-red-400">{memoryError}</p> : !memory ? <p className="text-xs text-muted-foreground">Poz kodu ve birim seçerek karşılaştırmayı başlatın.</p> : memory.count === 0 ? <p className="text-xs text-muted-foreground">Bu kapsamda onaylı fiyat kaydı bulunamadı.</p> : <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">{[["Kayıt", memory.count], ["Medyan", memory.median == null ? "—" : `${memory.median.toLocaleString("tr-TR")} ₺`], ["Min", memory.min == null ? "—" : `${memory.min.toLocaleString("tr-TR")} ₺`], ["Max", memory.max == null ? "—" : `${memory.max.toLocaleString("tr-TR")} ₺`]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-border bg-background p-2"><p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 text-xs font-black text-foreground">{value}</p></div>)}</div>}
              </div>
            </CardContent>
          </Card>
          {activeId && <Card className="border-orange-500/20 bg-orange-500/[0.03] shadow-none"><CardHeader className="pb-3"><CardTitle className="text-xs font-black uppercase tracking-widest text-foreground">Kaynak satırları</CardTitle><CardDescription className="text-xs text-muted-foreground">Onaylı SmartCheck satırlarını kaynak hücresiyle birlikte aktarın. Elle giriş yalnız yedek yöntemdir.</CardDescription></CardHeader><CardContent className="space-y-2">{activeSubmission?.documentId && <Button onClick={() => void importSmartCheckRows()} disabled={saving} className="w-full bg-orange-600 text-white hover:bg-orange-500">{saving ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />} Onaylı SmartCheck satırlarını aktar</Button>}<div className="border-t border-orange-500/10 pt-3"><p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Manuel beta satırı</p><div className="grid grid-cols-2 gap-2"><Input aria-label="Poz kodu" placeholder="Poz kodu" value={entry.positionCode} onChange={(event) => setEntry((value) => ({ ...value, positionCode: event.target.value }))} className="border-border bg-background" /><Input aria-label="Bölge" placeholder="Bölge" value={entry.region} onChange={(event) => setEntry((value) => ({ ...value, region: event.target.value }))} className="border-border bg-background" /></div><Input aria-label="Satır açıklaması" placeholder="Açıklama" value={entry.description} onChange={(event) => setEntry((value) => ({ ...value, description: event.target.value }))} className="mt-2 border-border bg-background" /><div className="mt-2 grid grid-cols-2 gap-2"><Input aria-label="Birim" placeholder="Birim" value={entry.unit} onChange={(event) => setEntry((value) => ({ ...value, unit: event.target.value }))} className="border-border bg-background" /><Input aria-label="Birim fiyat" placeholder="Birim fiyat" type="number" min="0" value={entry.unitPrice} onChange={(event) => setEntry((value) => ({ ...value, unitPrice: event.target.value }))} className="border-border bg-background" /></div><Button onClick={() => void addEntry()} disabled={saving} className="mt-2 w-full bg-card text-foreground hover:bg-white">Satırı inceleme kuyruğuna ekle</Button></div></CardContent></Card>}
        </div>
      </div>
      <Card className="mt-6 border-border bg-card shadow-none"><CardHeader className="pb-3"><CardTitle className="text-xs font-black uppercase tracking-widest text-foreground">Tedarikçi teklif kuyruğu</CardTitle><CardDescription className="text-xs text-muted-foreground">Olağandışı fiyatları, karşılaştırılan kayıt sayısını ve inceleme kararını birlikte görün.</CardDescription></CardHeader><CardContent>{loading ? <div role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Yükleniyor</div> : <>{listError && <div role="alert" className="mb-3 rounded-lg border border-red-500/30 p-3 text-xs text-red-400"><p>Tedarikçi teklifleri yüklenemedi.{listLoaded && submissions.length > 0 ? " Gösterilen kayıtlar güncel olmayabilir." : ""}</p><Button type="button" variant="outline" size="sm" onClick={() => void refresh()} className="mt-2">Tekrar dene</Button></div>}{!listError && submissions.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-xs text-muted-foreground">Henüz tedarikçi teklifi yok. İlk fiyat listenizi ekleyin; incelenen fiyatlar metraj kalemlerinizi fiyatlandırırken kullanılır.</p> : submissions.length > 0 ? <div className="space-y-3">{submissions.map((submission) => <div key={submission.id} className="rounded-xl border border-border bg-background p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-black text-foreground">{submission.supplierName}</p><p className="mt-1 text-[11px] text-muted-foreground">{submission.sourceDocumentIdentifier} {submission.documentId ? "· SmartCheck kaynağı" : "· Manuel kaynak"} {submission.region ? `· ${submission.region}` : ""} {submission.deliveryTerms ? `· ${submission.deliveryTerms}` : ""}</p></div><div className="flex items-center gap-2"><Badge variant="outline" className={submission.status === "approved" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-amber-500/20 bg-amber-500/10 text-amber-400"}>{labelOf(SUBMISSION_STATUS_LABEL, submission.status)}</Badge><Button size="sm" variant="outline" onClick={() => setActiveId(submission.id)}>{submission.documentId ? "Kaynak satırlarını aktar" : "Satır ekle"}</Button></div></div>{submission.entries.length > 0 && <div className="mt-3 space-y-2">{submission.entries.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"><div className="min-w-0"><p className="truncate text-xs text-foreground">{row.positionCode ? `${row.positionCode} · ` : ""}{row.description} · {row.unitPrice} {row.currency}/{row.unit}</p><p className="mt-1 text-[11px] text-muted-foreground">{row.sourceQuantityRowId ? "Kaynak: SmartCheck" : "Kaynak: elle girildi"} · {row.sourceCellRange ? `hücre ${row.sourceCellRange}` : "hücre bilgisi yok"} · karşılaştırılan kayıt: {row.baselineCount} · güven: {row.confidence} · fiyat kaydı: {row.priceSnapshotId ? "bağlı" : "bekliyor"}</p></div><div className="flex items-center gap-2"><Badge variant="outline" className={row.outlierStatus === "outlier" ? "border-red-500/20 bg-red-500/10 text-red-400" : row.outlierStatus === "normal" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground"}>{labelOf(OUTLIER_STATUS_LABEL, row.outlierStatus)}</Badge>{row.reviewStatus === "pending" && <><Button aria-label="Tedarikçi satırını onayla" size="icon-sm" onClick={() => void reviewEntry(row.id, "approved")} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-500"><Check size={14} /></Button><Button aria-label="Tedarikçi satırını reddet" size="icon-sm" variant="destructive" onClick={() => void reviewEntry(row.id, "rejected")} disabled={saving}><X size={14} /></Button></>}</div></div>)}</div>}</div>)}</div> : null}</>}</CardContent></Card>
    </PageContainer>
  );
}
