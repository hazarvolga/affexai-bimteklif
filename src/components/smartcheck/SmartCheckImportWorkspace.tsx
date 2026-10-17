import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Download, Eye, FileCode2, FileSpreadsheet, Layers3, Loader2, RefreshCw, ShieldAlert, Table2, Upload } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { getMappingProfile, MEP_MAPPING_PROFILES } from "@/smartcheck/import/mapping-profiles";
import { EpysPreflightPanel } from "./EpysPreflightPanel";
import { PdfPreflightPanel } from "./PdfPreflightPanel";
import { CalmIfcWorkspace } from "./CalmIfcWorkspace";
import { PaftaDrawing } from "@/components/ui/PaftaDrawing";
import { buildCalmIfcDatasetFromElements, parseSmartCheckRowToPseudoElement } from "@/ifc/calm-icmal";
import type { ParsedIfcElement } from "@/ifc/types";
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
type PriceCatalogImportRow = { positionCode?: string; description: string; unit: string; amount: number; currency?: string; validUntil?: string; externalReference?: string };
type PriceSnapshotSuggestion = { snapshot: PriceSnapshotOption; source: { name: string; sourceType: string }; score: number; matchType: string; warnings: string[]; explanation: string };
type PriceSuggestionResult = { rowId: string; decision: "safe_candidate" | "review_required" | "no_match"; bestSuggestion: PriceSnapshotSuggestion | null; suggestions: PriceSnapshotSuggestion[] };
type ReviewDraft = { row: Row; status: "approved" | "rejected" | "accepted_exception"; notes: string; quantity: string };

const mappingFields: Array<keyof ColumnMapping> = ["positionCode", "description", "unit", "quantity", "price", "wastePercent"];
const mappingLabels: Record<string, string> = { positionCode: "Poz No", description: "Açıklama", unit: "Birim", quantity: "Miktar", price: "Birim Fiyat", wastePercent: "Zayiat" };
const currencies = ["TRY", "USD", "EUR"] as const;

async function checksum(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isIfcSmartCheckFile(file: File | null): boolean {
  return Boolean(file?.name.toLocaleLowerCase("tr-TR").endsWith(".ifc"));
}

function isPdfSmartCheckFile(file: File | null): boolean {
  return Boolean(file?.name.toLocaleLowerCase("tr-TR").endsWith(".pdf"));
}

function smartCheckMimeType(file: File): string {
  if (isIfcSmartCheckFile(file)) return file.type || "model/ifc";
  if (isPdfSmartCheckFile(file)) return "application/pdf";
  if (file.name.toLocaleLowerCase("tr-TR").endsWith(".csv")) return file.type || "text/csv";
  return file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

function statusLabel(status: string) {
  return ({ pending_review: "İnceleme bekliyor", approved: "Onaylandı", accepted_exception: "İstisna onaylı", rejected: "Reddedildi" } as Record<string, string>)[status] ?? status;
}

function priceSuggestionWarningLabel(warning: string) {
  return ({ LOW_CONFIDENCE: "Düşük güven", STALE_PRICE: "Süresi geçmiş", UNIT_MISMATCH: "Birim uyarısı" } as Record<string, string>)[warning] ?? warning;
}

function workflowStatusClass(status: "done" | "active" | "waiting") {
  if (status === "done") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (status === "active") return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  return "border-border bg-background text-muted-foreground";
}

async function readJsonBody<T extends Record<string, unknown> = Record<string, unknown>>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: "Sunucu JSON olmayan bir cevap döndürdü." } as unknown as T;
  }
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];
    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === delimiter) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  values.push(current.trim());
  return values;
}

function normalizeHeader(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[ıİ]/g, "i")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[şŞ]/g, "s")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseCatalogAmount(value: string): number {
  const raw = value.trim().replace(/\s/g, "");
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  return Number(normalized);
}

function parsePriceCatalogCsv(text: string): PriceCatalogImportRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV en az başlık ve bir fiyat satırı içermeli.");
  const headerLine = lines[0];
  const delimiter = headerLine.includes(";") ? ";" : headerLine.includes("\t") ? "\t" : ",";
  const headers = splitCsvLine(headerLine, delimiter).map(normalizeHeader);
  const headerIndex = (candidates: string[]) => candidates.map((candidate) => headers.indexOf(candidate)).find((index) => index >= 0) ?? -1;
  const indexes = {
    positionCode: headerIndex(["poz", "pozno", "positioncode", "position", "code"]),
    description: headerIndex(["aciklama", "description", "malzeme", "item", "kalem"]),
    unit: headerIndex(["birim", "unit"]),
    amount: headerIndex(["birimfiyat", "fiyat", "amount", "unitprice", "price"]),
    currency: headerIndex(["parabirimi", "currency", "doviz"]),
    validUntil: headerIndex(["gecerlilik", "gecerliliktarihi", "validuntil", "validto"]),
    externalReference: headerIndex(["referans", "externalreference", "ref"]),
  };
  if (indexes.description < 0 || indexes.unit < 0 || indexes.amount < 0) throw new Error("CSV başlıklarında açıklama, birim ve fiyat kolonları zorunlu.");
  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line, delimiter);
    const amount = parseCatalogAmount(cells[indexes.amount] ?? "");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error(`${index + 2}. CSV satırında fiyat geçersiz.`);
    const description = (cells[indexes.description] ?? "").trim();
    const unit = (cells[indexes.unit] ?? "").trim();
    if (!description || !unit) throw new Error(`${index + 2}. CSV satırında açıklama ve birim zorunlu.`);
    return {
      positionCode: indexes.positionCode >= 0 ? cells[indexes.positionCode]?.trim() || undefined : undefined,
      description,
      unit,
      amount,
      currency: indexes.currency >= 0 ? cells[indexes.currency]?.trim().toUpperCase() || "TRY" : "TRY",
      validUntil: indexes.validUntil >= 0 ? cells[indexes.validUntil]?.trim() || undefined : undefined,
      externalReference: indexes.externalReference >= 0 ? cells[indexes.externalReference]?.trim() || undefined : undefined,
    };
  });
}

export function SmartCheckImportWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [openedFileName, setOpenedFileName] = useState<string | null>(null);
  const [reportRefreshKey, setReportRefreshKey] = useState(0);
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
  const [newQuotationDraft, setNewQuotationDraft] = useState({ clientName: "", projectName: "" });
  const [mapping, setMapping] = useState<ColumnMapping>(MEP_MAPPING_PROFILES[0].mapping);
  const [priceSnapshots, setPriceSnapshots] = useState<PriceSnapshotOption[]>([]);
  const [snapshotByRow, setSnapshotByRow] = useState<Record<string, string>>({});
  const [manualSnapshotDraft, setManualSnapshotDraft] = useState({ rowId: "", amount: "", currency: "TRY", sourceName: "", validUntil: "" });
  const [catalogImportDraft, setCatalogImportDraft] = useState({ sourceName: "", region: "", validUntil: "", fileName: "" });
  const [catalogImportText, setCatalogImportText] = useState("");
  const [catalogImportRows, setCatalogImportRows] = useState<PriceCatalogImportRow[]>([]);
  const [catalogImportBusy, setCatalogImportBusy] = useState(false);
  const [suggestionBusy, setSuggestionBusy] = useState(false);
  const [bulkReviewBusy, setBulkReviewBusy] = useState(false);
  const [sampleBusyId, setSampleBusyId] = useState<string | null>(null);
  const [priceSuggestionsByRow, setPriceSuggestionsByRow] = useState<Record<string, PriceSuggestionResult>>({});
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null);
  const [pilotCaseId, setPilotCaseId] = useState<string | null>(null);
  const [pilotMeta, setPilotMeta] = useState({ pilotId: "", customerReference: "", projectReference: "", permissionReference: "", permissionGrantedAt: new Date().toISOString().slice(0, 10), retentionUntil: "", expectedRowCount: "0" });
  const polling = useRef<number | null>(null);
  const pollInFlight = useRef(false);
  const isIfcFile = isIfcSmartCheckFile(file) || Boolean(openedFileName?.toLocaleLowerCase("tr-TR").endsWith(".ifc"));
  const isPdfFile = isPdfSmartCheckFile(file) || Boolean(openedFileName?.toLocaleLowerCase("tr-TR").endsWith(".pdf"));
  const reviewedRows = rows.filter((row) => row.reviewStatus === "approved" || row.reviewStatus === "accepted_exception");
  const pendingReviewCount = rows.filter((row) => row.reviewStatus === "pending_review").length;
  const bulkApprovableRows = rows.filter((row) => row.reviewStatus === "pending_review" && row.findingsJson.length === 0);
  const openFindingCount = rows.reduce((count, row) => count + row.findingsJson.length, 0);
  const suggestionResults = Object.values(priceSuggestionsByRow) as PriceSuggestionResult[];
  const matchedSuggestionCount = suggestionResults.filter((suggestion) => suggestion.bestSuggestion).length;
  const safeSuggestionCount = suggestionResults.filter((suggestion) => suggestion.decision === "safe_candidate").length;
  const selectedPriceEvidenceCount = reviewedRows.filter((row) => snapshotByRow[row.id]).length;
  const nextAction = isPdfFile && documentId && !busy
    ? "PDF/A-2B (ISO 19005-2), ISO 216 standart kağıt ölçüsü ve e-imza (/Sig) ön kontrol raporu aşağıda hazır."
    : rows.length === 0
      ? "Dosyayı yükleyin, örnek projelerden birini tek tıkla açın veya kuyruktan tamamlanan bir işi seçin."
      : reviewedRows.length === 0
        ? "Önce satırları inceleyin: bulgusuz satırları onaylayın, bulgulu IFC satırlarında düzeltme veya gerekçeli istisna girin."
        : selectedPriceEvidenceCount === 0
          ? "Fiyatı sistem uydurmaz: katalog/snapshot ekleyin, önerileri getirin ve uygun kanıtı satıra bağlayın."
          : "Fiyat kanıtı bağlı satırlar teklife aktarılabilir; yeni taslak oluşturabilir veya mevcut taslağı seçebilirsiniz.";
  const workflowSteps: Array<{ label: string; value: string; hint: string; status: "done" | "active" | "waiting" }> = [
    { label: "1 · Kanıt satırları", value: isPdfFile && documentId ? "PDF/A Raporu" : rows.length ? `${rows.length} satır` : "Bekliyor", hint: isPdfFile && documentId ? "ISO 19005-2 + ISO 216" : rows.length ? `${openFindingCount} açık bulgu` : "Upload / örnek proje", status: (isPdfFile && documentId) || rows.length ? "done" : documentId || busy ? "active" : "waiting" },
    { label: "2 · İnsan review", value: `${reviewedRows.length}/${rows.length || 0}`, hint: pendingReviewCount ? `${pendingReviewCount} bekliyor` : "Aktarım kilidi açık", status: reviewedRows.length ? "done" : rows.length ? "active" : "waiting" },
    { label: "3 · Fiyat kanıtı", value: `${selectedPriceEvidenceCount}/${reviewedRows.length || 0}`, hint: suggestionResults.length ? `${matchedSuggestionCount} öneri · ${safeSuggestionCount} güvenli` : `${priceSnapshots.length} snapshot`, status: selectedPriceEvidenceCount ? "done" : reviewedRows.length ? "active" : "waiting" },
    { label: "4 · Teklif taslağı", value: transferredQuotationId ? "Oluştu" : reviewedRows.length ? "Hazır" : "Bekliyor", hint: transferredQuotationId ? "Taslak açılabilir" : "İnsan onayı sonrası", status: transferredQuotationId ? "done" : reviewedRows.length ? "active" : "waiting" },
  ];

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

  const openQueueDocument = async (id: string, fileName: string | null, status: string) => {
    setDocumentId(id);
    setOpenedFileName(fileName);
    setPreview(null);
    setRows([]);
    setSnapshotByRow({});
    setPriceSuggestionsByRow({});
    setTransferredQuotationId(null);
    setStage(status === "succeeded" ? "Sonuçlar açılıyor" : "İşleme durumu açılıyor");
    await loadRows(id);
    const isPdf = Boolean(fileName?.toLocaleLowerCase("tr-TR").endsWith(".pdf"));
    setStage(
      status === "succeeded"
        ? (isPdf ? "PDF/A-2B ve ISO 216 ön kontrol raporu hazır" : "IFC property evidence insan incelemesi bekliyor")
        : "Satırlar yüklendi",
    );
    if (fileName?.toLocaleLowerCase("tr-TR").endsWith(".ifc") || isPdf) setFile(null);
    setReportRefreshKey((current) => current + 1);
  };

  const loadSampleProject = async (sampleId: "mm-mimari-tablo-9-1" | "st-statik-tablo-9-2" | "pdfa-pafta-iso216") => {
    setSampleBusyId(sampleId);
    try {
      const response = await fetchWithAuth(`/api/smartcheck/sample-projects/${sampleId}`, { method: "POST" });
      const body = await readJsonBody<{ error?: string; documentId?: string; fileName?: string; displayName?: string }>(response);
      if (!response.ok || !body.documentId) {
        return toast.error(body.error ?? "Örnek proje yüklenemedi.");
      }
      await Promise.all([
        openQueueDocument(body.documentId, body.fileName ?? null, "succeeded"),
        loadQueue(),
        loadPriceSnapshots(),
      ]);
      toast.success(`${body.displayName ?? "Örnek proje"} kotadan düşmeden açıldı.`);
    } catch {
      toast.error("Örnek proje yüklenirken hata oluştu.");
    } finally {
      setSampleBusyId(null);
    }
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
          if (data.run.status === "succeeded") { await loadRows(id); setReportRefreshKey(current => current + 1); }
          else toast.error(data.run.errorMessage ?? "İşleme başarısız.");
        }
      } finally {
        pollInFlight.current = false;
      }
    }, 2000);
  };

  const queueProcessing = async (id: string) => {
    const processResponse = await fetchWithAuth(`/api/smartcheck/documents/${id}/process`, { method: "POST" });
    if (!processResponse.ok) throw new Error((await processResponse.json()).error ?? "İşleme başlatılamadı.");
    setStage("Kuyruğa alındı");
    await loadQueue();
    poll(id);
  };

  const upload = async () => {
    if (!file) return;
    const ifcUpload = isIfcSmartCheckFile(file);
    const pdfUpload = isPdfSmartCheckFile(file);
    setBusy(true);
    setRows([]);
    setSnapshotByRow({});
    setPreview(null);
    setTransferredQuotationId(null);
    try {
      setStage("Güvenli yükleme hazırlanıyor");
      const createResponse = await fetchWithAuth("/api/smartcheck/documents/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, mimeType: smartCheckMimeType(file), fileSizeBytes: file.size }) });
      const target = await createResponse.json();
      if (!createResponse.ok) throw new Error(target.error ?? "Yükleme kaydı oluşturulamadı.");
      const uploadResponse = target.uploadUrl.startsWith("/api/")
        ? await fetchWithAuth(target.uploadUrl, { method: "PUT", headers: target.headers, body: file })
        : await fetch(target.uploadUrl, { method: "PUT", headers: target.headers, body: file });
      if (!uploadResponse.ok) throw new Error("Dosya yüklenemedi.");
      setDocumentId(target.documentId);
      setOpenedFileName(file.name);
      setPilotCaseId(null);
      setStage("Dosya bütünlüğü doğrulanıyor");
      const completeResponse = await fetchWithAuth(`/api/smartcheck/documents/${target.documentId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checksumSha256: await checksum(file) }) });
      if (!completeResponse.ok) throw new Error((await completeResponse.json()).error ?? "Dosya doğrulanamadı.");
      if (ifcUpload || pdfUpload) {
        setStage(pdfUpload ? "PDF/A ön kontrolü kuyruğa alınıyor" : "IFC kanıt satırları kuyruğa alınıyor");
        await queueProcessing(target.documentId);
        return;
      }
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
      await queueProcessing(documentId);
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

  const openReviewDraft = (row: Row, status: ReviewDraft["status"]) => {
    setReviewDraft({
      row,
      status,
      notes: status === "rejected" ? "Kaynak satır düzeltilmek üzere reddedildi." : "",
      quantity: row.rawQuantity ?? row.normalizedQuantity ?? "",
    });
  };

  const submitReviewDraft = async () => {
    if (!reviewDraft) return;
    const notes = reviewDraft.notes.trim();
    if ((reviewDraft.status === "accepted_exception" || reviewDraft.status === "rejected") && !notes) return toast.error("İstisna veya red kararı için gerekçe zorunludur.");
    const correction = reviewDraft.status === "approved" && reviewDraft.quantity.trim() ? { quantity: reviewDraft.quantity.trim() } : undefined;
    const response = await fetchWithAuth(`/api/smartcheck/rows/${reviewDraft.row.id}/review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: reviewDraft.status, notes: notes || undefined, correction }) });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error ?? "Review kararı kaydedilemedi.");
    setReviewDraft(null);
    if (documentId) await loadRows(documentId);
  };

  const bulkApproveClearRows = async () => {
    if (!documentId || !bulkApprovableRows.length) return;
    setBulkReviewBusy(true);
    try {
      const response = await fetchWithAuth(`/api/smartcheck/documents/${documentId}/bulk-review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          rowIds: bulkApprovableRows.map((row) => row.id),
          notes: "Bulgusuz satırlar toplu onaylandı.",
        }),
      });
      const body = await readJsonBody<{ error?: string; approvedCount?: number }>(response);
      if (!response.ok) return toast.error(body.error ?? "Toplu review kaydedilemedi.");
      await loadRows(documentId);
      toast.success(`${body.approvedCount ?? bulkApprovableRows.length} bulgusuz satır onaylandı.`);
    } catch {
      toast.error("Toplu review kaydedilemedi.");
    } finally {
      setBulkReviewBusy(false);
    }
  };

  const transferOverrides = (reviewed: Row[]) => Object.fromEntries(reviewed.map((row) => [row.id, {
    ...(commercial.costUnitPrice ? { costUnitPrice: Number(commercial.costUnitPrice) } : {}),
    ...(snapshotByRow[row.id] ? { priceSnapshotId: snapshotByRow[row.id] } : {}),
    wastePercent: Number(commercial.wastePercent), vatPercent: Number(commercial.vatPercent),
  }]));

  const createManualPriceSnapshot = async () => {
    const row = reviewedRows.find((candidate) => candidate.id === manualSnapshotDraft.rowId) ?? reviewedRows[0];
    if (!documentId || !row) return;
    const amount = Number(manualSnapshotDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Geçerli bir manuel birim fiyat girin.");
    const sourceName = manualSnapshotDraft.sourceName.trim() || "SmartCheck manuel fiyat girişi";
    const capturedAt = new Date().toISOString();
    const sourceResponse = await fetchWithAuth("/api/pricing/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "manual_override",
        name: sourceName,
        authority: "Kullanıcı manuel fiyat girişi",
        sourceDocumentIdentifier: `smartcheck:${documentId}:${row.id}:${Date.now()}`,
        sourceDocumentPayload: {
          kind: "smartcheck_manual_price",
          documentId,
          rowId: row.id,
          positionCode: row.normalizedPositionCode ?? row.rawPositionCode,
          description: row.normalizedDescription ?? row.rawDescription,
          unit: row.normalizedUnit ?? row.rawUnit,
          amount,
          currency: manualSnapshotDraft.currency,
          capturedAt,
        },
        licenseStatus: "not_applicable",
        metadataJson: { smartcheckDocumentId: documentId, smartcheckRowId: row.id },
      }),
    });
    const source = await readJsonBody<{ id?: string; sourceDocumentHash?: string; error?: string }>(sourceResponse);
    if (!sourceResponse.ok || !source.id || !source.sourceDocumentHash) return toast.error(source.error ?? "Fiyat kaynağı oluşturulamadı.");
    const snapshotResponse = await fetchWithAuth(`/api/pricing/sources/${source.id}/snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionCode: row.normalizedPositionCode ?? row.rawPositionCode,
        description: row.normalizedDescription ?? row.rawDescription ?? "SmartCheck metraj kalemi",
        unit: row.normalizedUnit ?? row.rawUnit ?? "adet",
        amount,
        currency: manualSnapshotDraft.currency,
        sourceDocumentHash: source.sourceDocumentHash,
        confidence: 0.55,
        reviewStatus: "advisory",
        capturedAt,
        validUntil: manualSnapshotDraft.validUntil ? new Date(manualSnapshotDraft.validUntil).toISOString() : null,
        metadataJson: { smartcheckDocumentId: documentId, smartcheckRowId: row.id, source: "smartcheck_manual_price" },
      }),
    });
    const snapshot = await readJsonBody<PriceSnapshotOption & { error?: string }>(snapshotResponse);
    if (!snapshotResponse.ok || !snapshot.id) return toast.error(snapshot.error ?? "Fiyat snapshot oluşturulamadı.");
    setPriceSnapshots((current) => [snapshot, ...current.filter((candidate) => candidate.id !== snapshot.id)]);
    setSnapshotByRow((current) => ({ ...current, [row.id]: snapshot.id }));
    setManualSnapshotDraft((current) => ({ ...current, rowId: row.id, amount: "", sourceName }));
    toast.success("Manuel fiyat snapshot oluşturuldu ve satıra bağlandı.");
  };

  const readPriceCatalogCsv = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    try {
      const parsedRows = parsePriceCatalogCsv(await selectedFile.text());
      setCatalogImportRows(parsedRows);
      setCatalogImportDraft((current) => ({
        ...current,
        fileName: selectedFile.name,
        sourceName: current.sourceName || selectedFile.name.replace(/\.[^.]+$/, ""),
      }));
      toast.success(`${parsedRows.length} CSV fiyat satırı hazır.`);
    } catch (error) {
      setCatalogImportRows([]);
      toast.error(error instanceof Error ? error.message : "CSV fiyat kataloğu okunamadı.");
    }
  };

  const readPriceCatalogText = () => {
    try {
      const parsedRows = parsePriceCatalogCsv(catalogImportText);
      setCatalogImportRows(parsedRows);
      setCatalogImportDraft((current) => ({ ...current, sourceName: current.sourceName || "Yapıştırılan CSV fiyat listesi", fileName: current.fileName || "pasted-price-catalog.csv" }));
      toast.success(`${parsedRows.length} CSV fiyat satırı hazır.`);
    } catch (error) {
      setCatalogImportRows([]);
      toast.error(error instanceof Error ? error.message : "CSV fiyat kataloğu okunamadı.");
    }
  };

  const importPriceCatalog = async () => {
    if (!catalogImportRows.length) return toast.error("Önce CSV fiyat kataloğu seçin.");
    setCatalogImportBusy(true);
    const sourceName = catalogImportDraft.sourceName.trim() || catalogImportDraft.fileName || "SmartCheck CSV fiyat kataloğu";
    try {
      const response = await fetchWithAuth("/api/pricing/catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceName,
          sourceType: "supplier_quote",
          sourceDocumentIdentifier: catalogImportDraft.fileName || undefined,
          sourceDocumentPayload: {
            kind: "smartcheck_price_catalog_csv",
            fileName: catalogImportDraft.fileName || null,
            rows: catalogImportRows,
          },
          licenseStatus: "not_applicable",
          region: catalogImportDraft.region.trim() || undefined,
          validUntil: catalogImportDraft.validUntil ? new Date(catalogImportDraft.validUntil).toISOString() : undefined,
          rows: catalogImportRows.map((row) => ({ ...row, validUntil: row.validUntil || (catalogImportDraft.validUntil ? new Date(catalogImportDraft.validUntil).toISOString() : undefined) })),
          metadataJson: { source: "smartcheck_price_catalog_csv", documentId, fileName: catalogImportDraft.fileName || null },
        }),
      });
      const body = await readJsonBody<{ error?: string; insertedCount?: number; reusedCount?: number; snapshots?: PriceSnapshotOption[] }>(response);
      if (!response.ok || !body.snapshots) return toast.error(body.error ?? "CSV fiyat kataloğu içe aktarılamadı.");
      setPriceSnapshots((current) => [
        ...body.snapshots!,
        ...current.filter((candidate) => !body.snapshots!.some((snapshot) => snapshot.id === candidate.id)),
      ]);
      setPriceSuggestionsByRow({});
      toast.success(`${(body.insertedCount ?? 0) + (body.reusedCount ?? 0)} fiyat snapshot kataloğa eklendi.`);
    } catch {
      toast.error("CSV fiyat kataloğu içe aktarılamadı.");
    } finally {
      setCatalogImportBusy(false);
    }
  };

  const loadPriceSuggestions = async () => {
    if (!reviewedRows.length) return toast.error("Öneri için önce en az bir satırı onaylayın veya istisna ile kabul edin.");
    setSuggestionBusy(true);
    try {
      const response = await fetchWithAuth("/api/pricing/snapshot-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: reviewedRows.map((row) => ({
            rowId: row.id,
            positionCode: row.normalizedPositionCode ?? row.rawPositionCode,
            description: row.normalizedDescription ?? row.rawDescription,
            unit: row.normalizedUnit ?? row.rawUnit,
            region: catalogImportDraft.region || undefined,
          })),
        }),
      });
      const body = await readJsonBody<{ error?: string; suggestions?: PriceSuggestionResult[] }>(response);
      if (!response.ok || !body.suggestions) return toast.error(body.error ?? "Fiyat önerileri alınamadı.");
      setPriceSuggestionsByRow(Object.fromEntries(body.suggestions.map((suggestion) => [suggestion.rowId, suggestion])));
      const matchedCount = body.suggestions.filter((suggestion) => suggestion.bestSuggestion).length;
      toast.success(`${matchedCount}/${body.suggestions.length} satır için fiyat önerisi bulundu.`);
    } catch {
      toast.error("Fiyat önerileri alınamadı.");
    } finally {
      setSuggestionBusy(false);
    }
  };

  const applySafePriceSuggestions = () => {
    const safeSuggestions = reviewedRows
      .map((row) => priceSuggestionsByRow[row.id])
      .filter((suggestion): suggestion is PriceSuggestionResult => Boolean(suggestion?.bestSuggestion && suggestion.decision === "safe_candidate" && suggestion.bestSuggestion.warnings.length === 0));
    if (!safeSuggestions.length) return toast.error("Uyarısız ve yüksek güvenli fiyat önerisi bulunamadı.");
    setSnapshotByRow((current) => ({
      ...current,
      ...Object.fromEntries(safeSuggestions.map((suggestion) => [suggestion.rowId, suggestion.bestSuggestion!.snapshot.id])),
    }));
    toast.success(`${safeSuggestions.length} güvenli fiyat önerisi satırlara bağlandı.`);
  };

  const transfer = async () => {
    if (!documentId || !quotationId) return;
    const reviewed = rows.filter((row) => row.reviewStatus === "approved" || row.reviewStatus === "accepted_exception");
    const response = await fetchWithAuth(`/api/smartcheck/documents/${documentId}/transfer-to-quotation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quotationId, rowIds: reviewed.map((row) => row.id), overrides: transferOverrides(reviewed) }) });
    const body = await readJsonBody<{ error?: string; quotationId?: string; transferredCount?: number }>(response);
    if (!response.ok) return toast.error(body.error ?? "Aktarım başarısız.");
    if (!body.quotationId) return toast.error("Aktarım tamamlandı ancak teklif kimliği alınamadı.");
    setTransferredQuotationId(body.quotationId);
    toast.success(`${body.transferredCount} onaylı satır teklife aktarıldı.`);
  };

  const createQuotationAndTransfer = async () => {
    if (!documentId || !newQuotationDraft.clientName.trim()) return;
    const reviewed = rows.filter((row) => row.reviewStatus === "approved" || row.reviewStatus === "accepted_exception");
    const response = await fetchWithAuth(`/api/smartcheck/documents/${documentId}/transfer-to-new-quotation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: newQuotationDraft.clientName.trim(),
        projectName: newQuotationDraft.projectName.trim() || undefined,
        rowIds: reviewed.map((row) => row.id),
        overrides: transferOverrides(reviewed),
      }),
    });
    const body = await readJsonBody<{ error?: string; quotationId?: string; transferredCount?: number }>(response);
    if (!response.ok) return toast.error(body.error ?? "Yeni taslak teklif oluşturulamadı.");
    if (!body.quotationId) return toast.error("Taslak oluşturuldu ancak teklif kimliği alınamadı.");
    setTransferredQuotationId(body.quotationId);
    setQuotationId(body.quotationId);
    const quotesResponse = await fetchWithAuth("/api/quotations");
    if (quotesResponse.ok) setQuotes(await quotesResponse.json());
    toast.success(`${body.transferredCount} onaylı satırla yeni taslak teklif oluşturuldu.`);
  };

  const activeSheet = preview?.sheets.find((sheet) => sheet.name === selectedSheet) ?? preview?.sheets[0];
  const snapshotOptionsForRow = (row: Row) => priceSnapshots.filter((snapshot) => !snapshot.positionCode || snapshot.positionCode === row.normalizedPositionCode || snapshot.positionCode === row.rawPositionCode);
  const catalogImportCard = (
    <div className="mt-4 rounded-2xl border border-border bg-background p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div><p className="text-xs font-bold text-sky-100">CSV fiyat listesi içe aktarma</p><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Başlık örneği: Poz No;Açıklama;Birim;Birim Fiyat;Para Birimi. İçe aktarılan fiyatlar öneri niteliğindedir; onay veya satıra bağlama kararı mühendiste kalır.</p></div>
        {catalogImportRows.length > 0 && <Badge className="w-fit border-emerald-500/20 bg-emerald-500/10 text-emerald-400">{catalogImportRows.length} satır hazır</Badge>}
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
        <Input aria-label="CSV fiyat katalog kaynak adı" placeholder="Kaynak adı / tedarikçi" value={catalogImportDraft.sourceName} onChange={(event) => setCatalogImportDraft((value) => ({ ...value, sourceName: event.target.value }))} className="border-border bg-background" />
        <Input aria-label="CSV fiyat katalog bölgesi" placeholder="Bölge (opsiyonel)" value={catalogImportDraft.region} onChange={(event) => setCatalogImportDraft((value) => ({ ...value, region: event.target.value }))} className="border-border bg-background" />
        <Input aria-label="CSV fiyat katalog geçerlilik tarihi" type="date" value={catalogImportDraft.validUntil} onChange={(event) => setCatalogImportDraft((value) => ({ ...value, validUntil: event.target.value }))} className="border-border bg-background" />
        <Button disabled={!catalogImportRows.length || catalogImportBusy} onClick={importPriceCatalog} className="bg-sky-600 text-white hover:bg-sky-700">{catalogImportBusy ? <Loader2 className="animate-spin" size={15} /> : "CSV kataloğu aktar"}</Button>
      </div>
      <label className="mt-3 flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-border p-4 text-[11px] text-muted-foreground hover:border-sky-500/50">
        <span className="font-bold text-foreground dark:text-muted-foreground">{catalogImportDraft.fileName || "CSV fiyat katalog dosyası seçin"}</span>
        <span>Desteklenen format CSV; poz, açıklama, birim ve birim fiyat kolonlarını içerir.</span>
        <input aria-label="CSV fiyat katalog dosyası" className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => void readPriceCatalogCsv(event.target.files?.[0] ?? null)} />
      </label>
      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
        <textarea aria-label="CSV fiyat katalog metni" placeholder="Excel/CSV satırlarını buraya yapıştırın" value={catalogImportText} onChange={(event) => setCatalogImportText(event.target.value)} className="min-h-24 rounded-xl border border-border bg-background p-3 text-[11px] text-foreground outline-none focus:border-sky-500/60" />
        <Button disabled={!catalogImportText.trim()} onClick={readPriceCatalogText} variant="outline" className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10">CSV metnini oku</Button>
      </div>
      {catalogImportRows[0] && <div className="mt-3 rounded-xl border border-zinc-900 bg-background p-3 text-[10px] text-muted-foreground">
        İlk satır: <span className="text-foreground dark:text-muted-foreground">{catalogImportRows[0].positionCode || "Poz yok"} · {catalogImportRows[0].description} · {catalogImportRows[0].unit} · {catalogImportRows[0].amount.toLocaleString("tr-TR")} {catalogImportRows[0].currency ?? "TRY"}</span>
      </div>}
    </div>
  );

  const [showTechnicalInspect, setShowTechnicalInspect] = useState(false);

  const calmDataset = useMemo(() => {
    if (rows.length === 0 || busy || isPdfFile) return null;
    const activeName = file?.name || openedFileName || "Yüklenen Proje";
    const pseudoElements: ParsedIfcElement[] = rows.map((row, idx) =>
      parseSmartCheckRowToPseudoElement(row, idx),
    );
    return buildCalmIfcDatasetFromElements(pseudoElements, null, activeName);
  }, [busy, file?.name, isPdfFile, openedFileName, rows]);

  const resetToUploadScreen = () => {
    setFile(null);
    setOpenedFileName(null);
    setDocumentId(null);
    setPilotCaseId(null);
    setPreview(null);
    setRows([]);
    setShowTechnicalInspect(false);
    setStage("Dosya bekleniyor");
  };

  return (
    <section className="mb-8 space-y-5">
      {/* STATE 1: CALM IFC / BOQ WORKSPACE (SHOWN ONLY AFTER FILE IS PROCESSED) */}
      {calmDataset && (
        <div>
          <CalmIfcWorkspace
            dataset={calmDataset}
            showTechnicalToggle={true}
            technicalViewOpen={showTechnicalInspect}
            onToggleTechnicalView={() => setShowTechnicalInspect((prev) => !prev)}
            onResetOrNewFile={resetToUploadScreen}
          />
        </div>
      )}

      {/* STATE 2: FILE IS CURRENTLY UPLOADING OR PROCESSING IN BACKGROUND */}
      {busy && !preview && (
        <div className="border border-border bg-card p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <h3 className="mt-4 font-display-serif text-3xl text-foreground">
            {file?.name || openedFileName || "Dosya"} Analiz Ediliyor…
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground">
            {isPdfFile
              ? "PDF/A-2B (ISO 19005-2), ISO 216 standart kağıt ölçüsü ve e-imza (/Sig) kontrolleri yürütülüyor."
              : "IFC katmanları, kapı/pencere boşluk düşümleri (minha) ve bağımsız bölüm (daire) net/brüt alanları çıkarılıyor. İşlem tamamlandığında İcmal Paftası otomatik açılacaktır."}
          </p>
          <div className="mt-4 stamp-badge bg-background text-primary border-primary/40">
            {stage}
          </div>
        </div>
      )}

      {/* STATE 3: CLEAN PAFTA UPLOAD WORKSPACE (SHOWN WHEN NO FILE IS LOADED YET) */}
      {!calmDataset && !busy && !preview && !(documentId && isPdfFile) && (
        <div className="border border-border bg-background text-foreground">
          <div className="border-b border-border bg-card px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="eyebrow">
              <span className="status-dot" />
              <span>PAFTA 00 / DİJİTAL PROJE VE METRAJ GİRİŞİ</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              IFC4 · IFC2X3 · XLSX · CSV · PDF/A-2B
            </span>
          </div>

          <div className="p-6 sm:p-8 grid gap-8 lg:grid-cols-12 items-start">
            {/* Sol: Dosya Seçimi ve Örnek Paftalar */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <h2 className="font-display-serif text-3xl sm:text-4xl text-foreground">
                  Proje Dosyanızı Yükleyin ve <em>Resmi İcmal Paftası</em> Üretin
                </h2>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground max-w-xl">
                  IFC modelinizi yüklediğinizde çok katmanlı imalatlar (Şap, Parke, Seramik, Fayans, Sıva, Boya, Süpürgelik), kapı/pencere boşluk düşümleri (minha) ve bağımsız bölüm (daire) m² cetveli otomatik çıkarılır.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-foreground/40 bg-card/60 p-8 text-center transition-colors hover:border-primary hover:bg-primary/5">
                  <div className="flex h-11 w-11 items-center justify-center border border-border bg-background text-primary">
                    {isIfcFile ? <FileCode2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-foreground">
                      {file?.name ?? openedFileName ?? "Bilgisayarınızdan .ifc, .xlsx, .csv veya .pdf dosyası seçin"}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      ALLPLAN · REVIT · ARCHICAD (IFC4 / IFC4X3) VE EXCEL METRAJ CETVELLERİ
                    </span>
                  </div>
                  <input
                    className="sr-only"
                    type="file"
                    accept=".xlsx,.csv,.ifc,.pdf,text/csv,model/ifc,application/ifc,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] ?? null);
                      setOpenedFileName(null);
                      setDocumentId(null);
                      setPilotCaseId(null);
                      setPreview(null);
                      setRows([]);
                      setStage("Dosya seçildi — Yüklemeye hazır");
                    }}
                  />
                </label>

                <button
                  type="button"
                  disabled={!file || busy}
                  onClick={upload}
                  className="pafta-button w-full !justify-center"
                >
                  <Upload size={15} />
                  <span>
                    {isIfcFile
                      ? "IFC Modelini Yükle ve İcmal Paftası Çıkar"
                      : isPdfFile
                        ? "PDF/A Ön Kontrolü Başlat"
                        : "Dosyayı Yükle ve Analiz Et"}
                  </span>
                </button>
              </div>

              {/* Örnek Projeler ve e-PYS Kitleri */}
              <div className="border-t border-border pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="section-index">01 / ÖRNEK PAFTALAR (KOTADAN DÜŞMEZ)</span>
                  <span className="stamp-badge bg-card text-foreground">HAZIR VERİ</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={Boolean(sampleBusyId) || busy}
                    onClick={() => void loadSampleProject("mm-mimari-tablo-9-1")}
                    className="pafta-button-secondary !min-h-9 !py-1.5 !px-3"
                  >
                    {sampleBusyId === "mm-mimari-tablo-9-1" ? <Loader2 size={12} className="animate-spin" /> : <FileCode2 size={12} className="text-primary" />}
                    <span>Mimari (Tablo 9.1)</span>
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(sampleBusyId) || busy}
                    onClick={() => void loadSampleProject("st-statik-tablo-9-2")}
                    className="pafta-button-secondary !min-h-9 !py-1.5 !px-3"
                  >
                    {sampleBusyId === "st-statik-tablo-9-2" ? <Loader2 size={12} className="animate-spin" /> : <Layers3 size={12} className="text-primary" />}
                    <span>Statik (Tablo 9.2)</span>
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(sampleBusyId) || busy}
                    onClick={() => void loadSampleProject("pdfa-pafta-iso216")}
                    className="pafta-button-secondary !min-h-9 !py-1.5 !px-3"
                  >
                    {sampleBusyId === "pdfa-pafta-iso216" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} className="text-primary" />}
                    <span>PDF/A-2B Pafta</span>
                  </button>
                </div>
                <div className="pt-2 flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <a href="/api/smartcheck/epys-ids" download="tr-epys-rg33331-ek6-ek7.ids" className="inline-flex items-center gap-1.5 text-foreground hover:text-primary underline underline-offset-4">
                    <Download size={12} /> e-PYS IDS (.ids)
                  </a>
                  <a href="/api/smartcheck/epys-allplan-kit" download="allplan-2026-epys-kit-v1.json" className="inline-flex items-center gap-1.5 text-foreground hover:text-primary underline underline-offset-4">
                    <Download size={12} /> ALLPLAN 2026 Kiti (.json)
                  </a>
                </div>
              </div>
            </div>

            {/* Sağ: İzometrik Teknik Pafta Çizimi & Son İşlenen Dosyalar */}
            <div className="lg:col-span-5 space-y-5">
              <PaftaDrawing
                compact
                captionLeft="01 / MODEL → METRAJ"
                captionCenter="BRÜT − MİNHA = NET"
                captionRight="IFC4 + ÇŞB POZ"
              />

              {queue.length > 0 && (
                <div className="border border-border bg-card p-4">
                  <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                    <span className="section-index">02 / SON İŞLENEN DOSYALARINIZ</span>
                    <button
                      type="button"
                      onClick={loadQueue}
                      className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary"
                    >
                      <RefreshCw size={11} /> Yenile
                    </button>
                  </div>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {queue.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 border border-border bg-background px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{item.fileName ?? "Dosya"}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {item.status === "succeeded"
                              ? "Analiz tamamlandı"
                              : item.status === "failed"
                                ? "İşleme hatası"
                                : `${item.progressMessage ?? item.currentStage} · %${item.progressPercent}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {item.status === "succeeded" && (
                            <button
                              type="button"
                              onClick={() => openQueueDocument(item.documentId, item.fileName, item.status)}
                              className="pafta-button !min-h-7 !py-1 !px-2.5 !text-[10px]"
                            >
                              İcmali Aç
                            </button>
                          )}
                          {item.status === "failed" && (
                            <button
                              type="button"
                              onClick={() => retry(item.documentId)}
                              className="pafta-button-secondary !min-h-7 !py-1 !px-2.5 !text-[10px]"
                            >
                              Yeniden Dene
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STATE 4: PDF/A PREFLIGHT REPORT OR EXCEL PREVIEW OR EXPLICIT TECHNICAL INSPECTION */}
      {(preview || (documentId && isPdfFile && !busy) || (calmDataset && showTechnicalInspect)) && (
        <div className="rounded-3xl border border-border bg-background p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <p className="text-xs font-bold text-foreground">
                {isPdfFile ? "PDF/A-2B ve ISO 216 Ön Kontrol Raporu" : "Mühendislik Denetim, e-PYS EK-9 & Ham IFC Satır Görünümü"}
              </p>
              <p className="text-[11px] text-muted-foreground">{nextAction}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(isPdfFile || preview) && (
                <Button size="sm" variant="outline" onClick={resetToUploadScreen} className="border-border text-foreground">
                  Yeni Dosya Yükle
                </Button>
              )}
              {rows.length > 0 && (
                <Button size="sm" variant="outline" disabled={!bulkApprovableRows.length || bulkReviewBusy} onClick={bulkApproveClearRows} className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">
                  {bulkReviewBusy ? <Loader2 className="animate-spin" size={13} /> : <CheckCircle2 size={13} />}
                  Bulgusuzları toplu onayla ({bulkApprovableRows.length})
                </Button>
              )}
            </div>
          </div>

          {!isIfcFile && preview && (
            <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
              <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground"><Table2 size={14} className="text-orange-400" /> Kaynak yapısı</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Sheet<select aria-label="Sheet" value={selectedSheet} onChange={(event) => { setSelectedSheet(event.target.value); setMapping((current) => ({ ...current, sheet: event.target.value })); }} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground">{preview.sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name} · {sheet.rowCount} satır</option>)}</select></label>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Başlık satırı<input aria-label="Başlık satırı" type="number" min="1" max="100" value={headerRow} onChange={(event) => setHeaderRow(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground" /></label>
                </div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">MEP eşleme profili<select aria-label="MEP eşleme profili" value={selectedProfileId} onChange={(event) => { const profile = getMappingProfile(event.target.value); if (!profile) return; setSelectedProfileId(profile.id); setMapping((current) => ({ ...profile.mapping, profileId: profile.id, sheet: selectedSheet, headerRow: Number(headerRow) })); }} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground">{MEP_MAPPING_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
                <div className="grid grid-cols-2 gap-2">{mappingFields.map((key) => <Input key={key} aria-label={key} placeholder={mappingLabels[key]} value={String(mapping[key] ?? "")} onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value }))} className="h-9 border-border bg-background text-xs" />)}</div>
                <Button disabled={busy || previewBusy || !selectedSheet} onClick={startProcessing} className="w-full gap-2 bg-sky-600 text-white hover:bg-sky-700">{busy ? <Loader2 className="animate-spin" size={15} /> : <Layers3 size={15} />} Eşlemeyi onayla ve işle</Button>
              </div>
              {activeSheet && (
                <div className="overflow-auto rounded-xl border border-zinc-900 p-3">
                  <table className="w-full min-w-[640px] text-left text-[11px]"><tbody>{activeSheet.sampleRows.map((row, rowIndex) => <tr key={`${rowIndex}-${row.join("|")}`} className={rowIndex === Number(headerRow) - 1 ? "bg-orange-500/10 text-orange-200" : "border-t border-zinc-900 text-muted-foreground"}>{row.map((value, columnIndex) => <td key={`${rowIndex}-${columnIndex}`} className="max-w-48 truncate p-2" title={value}>{value || "—"}</td>)}</tr>)}</tbody></table>
                </div>
              )}
            </div>
          )}

          {documentId && isIfcFile && !busy && <EpysPreflightPanel documentId={documentId} refreshKey={rows.length + reportRefreshKey} />}
          {documentId && isPdfFile && !busy && <PdfPreflightPanel documentId={documentId} refreshKey={reportRefreshKey} />}

          {rows.length > 0 && (
            <div className="max-h-[480px] overflow-auto rounded-2xl border border-border">
              <table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-card text-muted-foreground sticky top-0"><tr><th className="p-3">Kaynak</th><th className="p-3">Poz / Açıklama</th><th className="p-3">Miktar</th><th className="p-3">Bulgular</th><th className="p-3">Karar</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-zinc-900 align-top"><td className="p-3 font-mono text-orange-400">{row.sheetName}!{row.sourceCellRange}<div className="mt-1 text-[10px] text-muted-foreground">satır {row.sourceRowNumber}</div></td><td className="p-3 text-foreground dark:text-muted-foreground"><b>{row.rawPositionCode || "Poz yok"}</b><div className="text-muted-foreground">{row.rawDescription}</div></td><td className="p-3 text-foreground dark:text-muted-foreground">{row.normalizedQuantity ?? row.rawQuantity} {row.normalizedUnit ?? row.rawUnit}</td><td className="p-3">{row.findingsJson.length ? row.findingsJson.map((finding) => <div key={finding.code} title={`${finding.ruleVersion}: ${finding.suggestion}`} className="mb-1 text-amber-400">{finding.message}</div>) : <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 size={13} /> Bulgu yok</span>}</td><td className="p-3"><div className="mb-2 text-[10px] text-muted-foreground">{statusLabel(row.reviewStatus)}</div><div className="flex flex-wrap gap-2"><Button size="sm" disabled={row.findingsJson.length > 0 || row.reviewStatus === "approved"} onClick={() => openReviewDraft(row, "approved")}>Onayla</Button>{row.findingsJson.length > 0 && <Button size="sm" variant="outline" onClick={() => openReviewDraft(row, "approved")}>Miktarı düzelt</Button>}<Button size="sm" variant="outline" onClick={() => openReviewDraft(row, "accepted_exception")}>İstisna</Button><Button size="sm" variant="outline" onClick={() => openReviewDraft(row, "rejected")}>Reddet</Button><Button size="sm" variant="ghost" onClick={() => setExpandedRowId((current) => current === row.id ? null : row.id)}><ChevronDown size={13} className={expandedRowId === row.id ? "rotate-180" : ""} />Kanıt</Button></div></td></tr>).flatMap((rowElement, index) => { const row = rows[index]; return expandedRowId === row.id ? [rowElement, <tr key={`${row.id}-evidence`} className="border-t border-sky-500/10 bg-sky-500/[0.03]"><td colSpan={5} className="p-4"><div className="grid gap-4 md:grid-cols-3"><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-sky-400">Kaynak değer</p><dl className="space-y-1 text-[11px] text-muted-foreground"><div className="flex justify-between gap-3"><dt>Poz</dt><dd>{row.rawPositionCode || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Açıklama</dt><dd>{row.rawDescription || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Birim</dt><dd>{row.rawUnit || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Miktar</dt><dd>{row.rawQuantity || "—"}</dd></div></dl></div><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">Normalize değer</p><dl className="space-y-1 text-[11px] text-muted-foreground"><div className="flex justify-between gap-3"><dt>Poz</dt><dd>{row.normalizedPositionCode || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Açıklama</dt><dd>{row.normalizedDescription || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Birim</dt><dd>{row.normalizedUnit || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Miktar</dt><dd>{row.normalizedQuantity || "—"}</dd></div></dl></div><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-orange-400">Kural ve inceleme</p><dl className="space-y-1 text-[11px] text-muted-foreground"><div className="flex justify-between gap-3"><dt>Durum</dt><dd>{statusLabel(row.reviewStatus)}</dd></div><div className="flex justify-between gap-3"><dt>Not</dt><dd>{row.reviewerNotes || "—"}</dd></div></dl></div></div></td></tr>] : [rowElement]; })}</tbody></table>
            </div>
          )}

          {reviewDraft && <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div><p className="text-xs font-bold text-amber-200">İnceleme kararı · {statusLabel(reviewDraft.status)}</p><p className="mt-1 text-[10px] text-muted-foreground">{reviewDraft.row.sheetName}!{reviewDraft.row.sourceCellRange} · {reviewDraft.row.normalizedDescription ?? reviewDraft.row.rawDescription ?? "Metraj kalemi"}</p></div>
              <Button size="sm" variant="ghost" onClick={() => setReviewDraft(null)}>Vazgeç</Button>
            </div>
            {reviewDraft.status === "approved" && <Input aria-label="Review miktar düzeltmesi" placeholder="Düzeltilmiş miktar" value={reviewDraft.quantity} onChange={(event) => setReviewDraft((value) => value ? { ...value, quantity: event.target.value } : value)} className="mb-3 border-border bg-background" />}
            <textarea aria-label="Review gerekçesi" placeholder={reviewDraft.status === "accepted_exception" ? "İstisna gerekçesi zorunlu" : reviewDraft.status === "rejected" ? "Red gerekçesi zorunlu" : "İnceleme notu (opsiyonel)"} value={reviewDraft.notes} onChange={(event) => setReviewDraft((value) => value ? { ...value, notes: event.target.value } : value)} className="min-h-24 w-full rounded-md border border-border bg-background p-3 text-xs text-foreground outline-none focus:border-amber-500/60" />
            <div className="mt-3 flex justify-end gap-2"><Button variant="outline" onClick={() => setReviewDraft(null)}>İptal</Button><Button onClick={submitReviewDraft} className="bg-amber-600 text-white hover:bg-amber-700">Kararı kaydet</Button></div>
          </div>}

          {reviewedRows.length > 0 && <div className="mt-4 space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div><p className="text-xs font-bold text-emerald-300">{reviewedRows.length} satır aktarım için hazır</p><p className="mt-1 text-[10px] text-muted-foreground">İnsan onaylı veya gerekçeli istisna satırları, kaynak/evidence bağları korunarak teklife aktarılır.</p></div>
              {transferredQuotationId && <Link className="text-xs font-bold text-emerald-400 underline" to={`/app/quotes/${transferredQuotationId}`}>Teklif taslağını aç</Link>}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <Input aria-label="Yeni teklif müşteri referansı" placeholder="Yeni teklif müşteri/ref adı" value={newQuotationDraft.clientName} onChange={(event) => setNewQuotationDraft((value) => ({ ...value, clientName: event.target.value }))} className="border-border bg-background" />
              <Input aria-label="Yeni teklif proje adı" placeholder={`Proje adı · ${file?.name ?? "SmartCheck aktarımı"}`} value={newQuotationDraft.projectName} onChange={(event) => setNewQuotationDraft((value) => ({ ...value, projectName: event.target.value }))} className="border-border bg-background" />
              <Button disabled={!newQuotationDraft.clientName.trim()} onClick={createQuotationAndTransfer} className="bg-emerald-600 text-white hover:bg-emerald-700">Yeni taslak oluştur ve aktar</Button>
            </div>
          </div>}
        </div>
      )}
    </section>
  );
}
