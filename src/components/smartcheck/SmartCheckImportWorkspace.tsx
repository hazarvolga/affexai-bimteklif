import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Eye, FileCode2, FileSpreadsheet, Layers3, Loader2, RefreshCw, ShieldAlert, Table2, Upload } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { getMappingProfile, MEP_MAPPING_PROFILES } from "@/smartcheck/import/mapping-profiles";
import { EpysPreflightPanel } from "./EpysPreflightPanel";
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

function smartCheckMimeType(file: File): string {
  if (isIfcSmartCheckFile(file)) return file.type || "model/ifc";
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
  return "border-zinc-800 bg-zinc-950 text-zinc-500";
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
  const [priceSuggestionsByRow, setPriceSuggestionsByRow] = useState<Record<string, PriceSuggestionResult>>({});
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null);
  const [pilotCaseId, setPilotCaseId] = useState<string | null>(null);
  const [pilotMeta, setPilotMeta] = useState({ pilotId: "", customerReference: "", projectReference: "", permissionReference: "", permissionGrantedAt: new Date().toISOString().slice(0, 10), retentionUntil: "", expectedRowCount: "0" });
  const polling = useRef<number | null>(null);
  const pollInFlight = useRef(false);
  const isIfcFile = isIfcSmartCheckFile(file);
  const reviewedRows = rows.filter((row) => row.reviewStatus === "approved" || row.reviewStatus === "accepted_exception");
  const pendingReviewCount = rows.filter((row) => row.reviewStatus === "pending_review").length;
  const bulkApprovableRows = rows.filter((row) => row.reviewStatus === "pending_review" && row.findingsJson.length === 0);
  const openFindingCount = rows.reduce((count, row) => count + row.findingsJson.length, 0);
  const suggestionResults = Object.values(priceSuggestionsByRow) as PriceSuggestionResult[];
  const matchedSuggestionCount = suggestionResults.filter((suggestion) => suggestion.bestSuggestion).length;
  const safeSuggestionCount = suggestionResults.filter((suggestion) => suggestion.decision === "safe_candidate").length;
  const selectedPriceEvidenceCount = reviewedRows.filter((row) => snapshotByRow[row.id]).length;
  const nextAction = rows.length === 0
    ? "Dosyayı yükleyin veya kuyruktan tamamlanan bir işi açın."
    : reviewedRows.length === 0
      ? "Önce satırları inceleyin: bulgusuz satırları onaylayın, bulgulu IFC satırlarında düzeltme veya gerekçeli istisna girin."
      : selectedPriceEvidenceCount === 0
        ? "Fiyatı sistem uydurmaz: katalog/snapshot ekleyin, önerileri getirin ve uygun kanıtı satıra bağlayın."
        : "Fiyat kanıtı bağlı satırlar teklife aktarılabilir; yeni taslak oluşturabilir veya mevcut taslağı seçebilirsiniz.";
  const workflowSteps: Array<{ label: string; value: string; hint: string; status: "done" | "active" | "waiting" }> = [
    { label: "1 · Kanıt satırları", value: rows.length ? `${rows.length} satır` : "Bekliyor", hint: rows.length ? `${openFindingCount} açık bulgu` : "Upload / kuyruk", status: rows.length ? "done" : documentId || busy ? "active" : "waiting" },
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
    setPreview(null);
    setRows([]);
    setTransferredQuotationId(null);
    setStage(status === "succeeded" ? "Sonuçlar açılıyor" : "İşleme durumu açılıyor");
    await loadRows(id);
    setStage(status === "succeeded" ? "IFC property evidence insan incelemesi bekliyor" : "Satırlar yüklendi");
    if (fileName?.toLocaleLowerCase("tr-TR").endsWith(".ifc")) setFile(null);
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
      setPilotCaseId(null);
      setStage("Dosya bütünlüğü doğrulanıyor");
      const completeResponse = await fetchWithAuth(`/api/smartcheck/documents/${target.documentId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checksumSha256: await checksum(file) }) });
      if (!completeResponse.ok) throw new Error((await completeResponse.json()).error ?? "Dosya doğrulanamadı.");
      if (ifcUpload) {
        setStage("IFC kanıt satırları kuyruğa alınıyor");
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
    <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div><p className="text-xs font-bold text-sky-100">CSV fiyat listesi importu</p><p className="mt-1 text-[10px] leading-relaxed text-zinc-500">Başlık örneği: Poz No;Açıklama;Birim;Birim Fiyat;Para Birimi. Import edilen fiyatlar advisory gelir; onay veya satıra bağlama kararı insanda kalır.</p></div>
        {catalogImportRows.length > 0 && <Badge className="w-fit border-emerald-500/20 bg-emerald-500/10 text-emerald-400">{catalogImportRows.length} satır hazır</Badge>}
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
        <Input aria-label="CSV fiyat katalog kaynak adı" placeholder="Kaynak adı / tedarikçi" value={catalogImportDraft.sourceName} onChange={(event) => setCatalogImportDraft((value) => ({ ...value, sourceName: event.target.value }))} className="border-zinc-800 bg-zinc-950" />
        <Input aria-label="CSV fiyat katalog bölgesi" placeholder="Bölge (opsiyonel)" value={catalogImportDraft.region} onChange={(event) => setCatalogImportDraft((value) => ({ ...value, region: event.target.value }))} className="border-zinc-800 bg-zinc-950" />
        <Input aria-label="CSV fiyat katalog geçerlilik tarihi" type="date" value={catalogImportDraft.validUntil} onChange={(event) => setCatalogImportDraft((value) => ({ ...value, validUntil: event.target.value }))} className="border-zinc-800 bg-zinc-950" />
        <Button disabled={!catalogImportRows.length || catalogImportBusy} onClick={importPriceCatalog} className="bg-sky-600 text-white hover:bg-sky-700">{catalogImportBusy ? <Loader2 className="animate-spin" size={15} /> : "CSV kataloğu aktar"}</Button>
      </div>
      <label className="mt-3 flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-zinc-700 p-4 text-[11px] text-zinc-400 hover:border-sky-500/50">
        <span className="font-bold text-zinc-300">{catalogImportDraft.fileName || "CSV fiyat katalog dosyası seçin"}</span>
        <span>Desteklenen MVP formatı CSV; Excel/XLSX importu bir sonraki genişletme adımı olarak kalıyor.</span>
        <input aria-label="CSV fiyat katalog dosyası" className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => void readPriceCatalogCsv(event.target.files?.[0] ?? null)} />
      </label>
      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
        <textarea aria-label="CSV fiyat katalog metni" placeholder="Excel/CSV satırlarını buraya yapıştırın" value={catalogImportText} onChange={(event) => setCatalogImportText(event.target.value)} className="min-h-24 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-200 outline-none focus:border-sky-500/60" />
        <Button disabled={!catalogImportText.trim()} onClick={readPriceCatalogText} variant="outline" className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10">CSV metnini oku</Button>
      </div>
      {catalogImportRows[0] && <div className="mt-3 rounded-xl border border-zinc-900 bg-zinc-950 p-3 text-[10px] text-zinc-500">
        İlk satır: <span className="text-zinc-300">{catalogImportRows[0].positionCode || "Poz yok"} · {catalogImportRows[0].description} · {catalogImportRows[0].unit} · {catalogImportRows[0].amount.toLocaleString("tr-TR")} {catalogImportRows[0].currency ?? "TRY"}</span>
      </div>}
    </div>
  );

  return (
    <section className="mb-8 rounded-3xl border border-orange-500/20 bg-zinc-950 p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">Evidence-first pilot</p><h2 className="mt-2 text-xl font-black text-white">Excel/CSV/IFC SmartCheck çalışma alanı</h2><p className="mt-1 text-xs text-zinc-500">Excel/CSV: önizle → eşle → işle. IFC: yükle → property/QTO kanıt satırlarını işle → bulguları incele → aktar.</p></div>
        <Badge className="w-fit border-emerald-500/20 bg-emerald-500/10 text-emerald-400">{stage}</Badge>
      </div>

      <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black text-zinc-100">Operasyon özeti</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{nextAction}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={!bulkApprovableRows.length || bulkReviewBusy} onClick={bulkApproveClearRows} className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">
              {bulkReviewBusy ? <Loader2 className="animate-spin" size={13} /> : <CheckCircle2 size={13} />}
              Bulgusuzları toplu onayla ({bulkApprovableRows.length})
            </Button>
            <Badge className={workflowStatusClass(selectedPriceEvidenceCount ? "done" : reviewedRows.length ? "active" : "waiting")}>
              {selectedPriceEvidenceCount ? `${selectedPriceEvidenceCount} fiyat kanıtı bağlı` : reviewedRows.length ? "Fiyat kararı bekliyor" : "Review bekliyor"}
            </Badge>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          {workflowSteps.map((step) => (
            <div key={step.label} className={`rounded-xl border p-3 ${workflowStatusClass(step.status)}`}>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{step.label}</p>
              <p className="mt-2 text-lg font-black">{step.value}</p>
              <p className="mt-1 text-[10px] opacity-70">{step.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-700 p-6 text-center hover:border-orange-500/50">
            {isIfcFile ? <FileCode2 className="text-orange-500" /> : <FileSpreadsheet className="text-orange-500" />}<span className="text-xs font-bold text-zinc-300">{file?.name ?? "XLSX, CSV veya IFC seçin (IFC en fazla 100 MB)"}</span>
            <input className="sr-only" type="file" accept=".xlsx,.csv,.ifc,text/csv,model/ifc,application/ifc,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setDocumentId(null); setPilotCaseId(null); setPreview(null); setRows([]); setStage("Dosya bekleniyor"); }} />
          </label>
          <Button disabled={!file || busy} onClick={upload} className="w-full gap-2 bg-orange-600 text-white hover:bg-orange-700">{busy && !preview ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />} {isIfcFile ? "IFC yükle ve işle" : "Yükle ve önizle"}</Button>

          {isIfcFile && (
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-[11px] leading-relaxed text-sky-100/80">
              <p className="font-black uppercase tracking-widest text-sky-300">IFC DB-backed akış</p>
              <p className="mt-1">Önizleme ve kolon eşleme atlanır. Backend sadece IFC property/QTO kaynaklı metraj kanıtlarını review satırı olarak kabul eder; geometry estimate, rebar ve kalıp türevleri bloklanır.</p>
            </div>
          )}

          {!isIfcFile && preview && <div className="space-y-3 border-t border-zinc-800 pt-4">
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
          {rows.length === 0 && !preview && !documentId ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center text-xs text-zinc-500"><ShieldAlert />Önce kaynak dosya yükleyin; ardından normalize edilmiş satırlar ve kanıtlar burada görünecek.</div> : rows.length === 0 && !preview && documentId ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center text-xs text-zinc-500"><Loader2 className="animate-spin text-sky-400" size={18} />IFC kanıt satırları backend kuyruğunda işleniyor. Worker tamamlandığında property/QTO kaynaklı review satırları burada görünecek.</div> : rows.length === 0 && previewBusy ? <div className="flex min-h-32 items-center justify-center gap-2 p-8 text-xs text-zinc-500"><Loader2 className="animate-spin" size={16} />Önizleme hazırlanıyor…</div> : rows.length === 0 && preview ? <div className="flex items-center gap-2 p-4 text-xs text-zinc-500"><Eye size={14} className="text-sky-400" />Önizlemeyi kontrol edin; işlem başladığında normalize edilmiş sonuçlar burada görünecek.</div> : <table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-zinc-900 text-zinc-500"><tr><th className="p-3">Kaynak</th><th className="p-3">Poz / Açıklama</th><th className="p-3">Miktar</th><th className="p-3">Bulgular</th><th className="p-3">Karar</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-zinc-900 align-top"><td className="p-3 font-mono text-orange-400">{row.sheetName}!{row.sourceCellRange}<div className="mt-1 text-[10px] text-zinc-600">satır {row.sourceRowNumber}</div></td><td className="p-3 text-zinc-300"><b>{row.rawPositionCode || "Poz yok"}</b><div className="text-zinc-500">{row.rawDescription}</div><Badge className="mt-2 border-zinc-700 bg-zinc-900 text-[10px] text-zinc-400">{Math.round(Number(row.mappingConfidence) * 100)}% eşleme</Badge></td><td className="p-3 text-zinc-300">{row.normalizedQuantity ?? row.rawQuantity} {row.normalizedUnit ?? row.rawUnit}</td><td className="p-3">{row.findingsJson.length ? row.findingsJson.map((finding) => <div key={finding.code} title={`${finding.ruleVersion}: ${finding.suggestion}`} className="mb-1 text-amber-400">{finding.message}</div>) : <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 size={13} /> Bulgu yok</span>}</td><td className="p-3"><div className="mb-2 text-[10px] text-zinc-500">{statusLabel(row.reviewStatus)}</div><div className="flex flex-wrap gap-2"><Button size="sm" disabled={row.findingsJson.length > 0 || row.reviewStatus === "approved"} onClick={() => openReviewDraft(row, "approved")}>Onayla</Button>{row.findingsJson.length > 0 && <Button size="sm" variant="outline" onClick={() => openReviewDraft(row, "approved")}>Miktarı düzelt</Button>}<Button size="sm" variant="outline" onClick={() => openReviewDraft(row, "accepted_exception")}>İstisna</Button><Button size="sm" variant="outline" onClick={() => openReviewDraft(row, "rejected")}>Reddet</Button><Button size="sm" variant="ghost" onClick={() => setExpandedRowId((current) => current === row.id ? null : row.id)}><ChevronDown size={13} className={expandedRowId === row.id ? "rotate-180" : ""} />Kanıt</Button></div></td></tr>).flatMap((rowElement, index) => { const row = rows[index]; return expandedRowId === row.id ? [rowElement, <tr key={`${row.id}-evidence`} className="border-t border-sky-500/10 bg-sky-500/[0.03]"><td colSpan={5} className="p-4"><div className="grid gap-4 md:grid-cols-3"><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-sky-400">Kaynak değer</p><dl className="space-y-1 text-[11px] text-zinc-400"><div className="flex justify-between gap-3"><dt>Poz</dt><dd>{row.rawPositionCode || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Açıklama</dt><dd>{row.rawDescription || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Birim</dt><dd>{row.rawUnit || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Miktar</dt><dd>{row.rawQuantity || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Fiyat</dt><dd>{row.rawPrice || "—"}</dd></div></dl></div><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">Normalize değer</p><dl className="space-y-1 text-[11px] text-zinc-400"><div className="flex justify-between gap-3"><dt>Poz</dt><dd>{row.normalizedPositionCode || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Açıklama</dt><dd>{row.normalizedDescription || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Birim</dt><dd>{row.normalizedUnit || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Miktar</dt><dd>{row.normalizedQuantity || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Fiyat</dt><dd>{row.normalizedPrice || "—"}</dd></div></dl></div><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-orange-400">Kural ve inceleme</p><dl className="space-y-1 text-[11px] text-zinc-400"><div className="flex justify-between gap-3"><dt>Durum</dt><dd>{statusLabel(row.reviewStatus)}</dd></div><div className="flex justify-between gap-3"><dt>İnceleme</dt><dd>{row.reviewedAt ? new Date(row.reviewedAt).toLocaleString("tr-TR") : "Bekliyor"}</dd></div><div className="flex justify-between gap-3"><dt>Not</dt><dd>{row.reviewerNotes || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Formül</dt><dd>{Object.keys(row.formulaJson ?? {}).length ? Object.entries(row.formulaJson).map(([cell, formula]) => <span key={cell} className="block font-mono text-amber-300">{cell}: {formula}</span>) : "Yok"}</dd></div></dl>{row.findingsJson.map((finding) => <p key={finding.code} className="mt-2 text-[10px] text-amber-300">{finding.code} · {finding.ruleVersion}<br />{finding.suggestion}</p>)}</div></div></td></tr>] : [rowElement]; })}</tbody></table>}
          {documentId && isIfcFile && rows.length > 0 && <EpysPreflightPanel documentId={documentId} refreshKey={rows.length} />}
        </div>
      </div>

      {reviewDraft && <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div><p className="text-xs font-bold text-amber-200">Review kararı · {statusLabel(reviewDraft.status)}</p><p className="mt-1 text-[10px] text-zinc-500">{reviewDraft.row.sheetName}!{reviewDraft.row.sourceCellRange} · {reviewDraft.row.normalizedDescription ?? reviewDraft.row.rawDescription ?? "Metraj kalemi"}</p></div>
          <Button size="sm" variant="ghost" onClick={() => setReviewDraft(null)}>Vazgeç</Button>
        </div>
        {reviewDraft.status === "approved" && <Input aria-label="Review miktar düzeltmesi" placeholder="Düzeltilmiş miktar" value={reviewDraft.quantity} onChange={(event) => setReviewDraft((value) => value ? { ...value, quantity: event.target.value } : value)} className="mb-3 border-zinc-800 bg-zinc-950" />}
        <textarea aria-label="Review gerekçesi" placeholder={reviewDraft.status === "accepted_exception" ? "İstisna gerekçesi zorunlu" : reviewDraft.status === "rejected" ? "Red gerekçesi zorunlu" : "Review notu (opsiyonel)"} value={reviewDraft.notes} onChange={(event) => setReviewDraft((value) => value ? { ...value, notes: event.target.value } : value)} className="min-h-24 w-full rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200 outline-none focus:border-amber-500/60" />
        <div className="mt-3 flex justify-end gap-2"><Button variant="outline" onClick={() => setReviewDraft(null)}>İptal</Button><Button onClick={submitReviewDraft} className="bg-amber-600 text-white hover:bg-amber-700">Kararı kaydet</Button></div>
      </div>}

      {reviewedRows.length === 0 && catalogImportCard}

      {reviewedRows.length > 0 && <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div><p className="text-xs font-bold text-sky-200">Fiyat kanıtı / katalog tohumu</p><p className="mt-1 text-[10px] text-zinc-500">Fiyat bilinmiyorsa sistem uydurmaz. Bildiğiniz fiyatı manuel snapshot olarak kaydedip satıra bağlayabilirsiniz; aktarımda bu snapshot birim fiyat olarak uygulanır.</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit border-sky-500/30 bg-sky-500/10 text-sky-300">{priceSnapshots.length} snapshot</Badge>
            <Button size="sm" disabled={suggestionBusy || !reviewedRows.length} onClick={loadPriceSuggestions} variant="outline" className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10">{suggestionBusy ? <Loader2 className="animate-spin" size={13} /> : <Eye size={13} />} Fiyat önerilerini getir</Button>
            <Button size="sm" disabled={!Object.keys(priceSuggestionsByRow).length} onClick={applySafePriceSuggestions} className="bg-sky-600 text-white hover:bg-sky-700">Güvenli önerileri uygula</Button>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-5">
          <select aria-label="Manuel fiyat satırı" value={manualSnapshotDraft.rowId || reviewedRows[0]?.id || ""} onChange={(event) => setManualSnapshotDraft((value) => ({ ...value, rowId: event.target.value }))} className="h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-200 md:col-span-2">
            {reviewedRows.map((row) => <option key={row.id} value={row.id}>{row.normalizedPositionCode || row.rawPositionCode || "Poz yok"} · {(row.normalizedDescription || row.rawDescription || "Kalem").slice(0, 48)}</option>)}
          </select>
          <Input aria-label="Manuel birim fiyat" inputMode="decimal" placeholder="Birim fiyat" value={manualSnapshotDraft.amount} onChange={(event) => setManualSnapshotDraft((value) => ({ ...value, amount: event.target.value }))} className="border-zinc-800 bg-zinc-950" />
          <select aria-label="Manuel fiyat para birimi" value={manualSnapshotDraft.currency} onChange={(event) => setManualSnapshotDraft((value) => ({ ...value, currency: event.target.value }))} className="h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-200">{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select>
          <Button onClick={createManualPriceSnapshot} className="bg-sky-600 text-white hover:bg-sky-700">Fiyat kanıtı oluştur</Button>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <Input aria-label="Manuel fiyat kaynak adı" placeholder="Kaynak adı (örn. tedarikçi teklifi / son teklif hafızası)" value={manualSnapshotDraft.sourceName} onChange={(event) => setManualSnapshotDraft((value) => ({ ...value, sourceName: event.target.value }))} className="border-zinc-800 bg-zinc-950" />
          <Input aria-label="Manuel fiyat geçerlilik tarihi" type="date" value={manualSnapshotDraft.validUntil} onChange={(event) => setManualSnapshotDraft((value) => ({ ...value, validUntil: event.target.value }))} className="border-zinc-800 bg-zinc-950" />
        </div>
        {catalogImportCard}
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {reviewedRows.map((row) => {
            const result = priceSuggestionsByRow[row.id];
            const suggestion = result?.bestSuggestion;
            return (
              <div key={row.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-[10px] text-zinc-400">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{row.normalizedPositionCode || row.rawPositionCode || "Poz yok"} · {row.normalizedDescription || row.rawDescription || "Kalem"}</span>
                  <select aria-label={`Fiyat kanıtı ${row.id}`} value={snapshotByRow[row.id] ?? ""} onChange={(event) => setSnapshotByRow((current) => ({ ...current, [row.id]: event.target.value }))} className="h-8 max-w-64 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-[10px] text-zinc-300">
                    <option value="">Snapshot seç</option>
                    {snapshotOptionsForRow(row).map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{snapshot.positionCode ?? "Genel"} · {snapshot.description.slice(0, 24)} · {Number(snapshot.amount).toLocaleString("tr-TR")} {snapshot.currency}{snapshot.stale ? " · eski" : ""}</option>)}
                  </select>
                </div>
                {result && !suggestion && <p className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-500">Bu satır için güvenilir katalog eşleşmesi bulunamadı; manuel fiyat kanıtı oluşturun veya katalog satırını genişletin.</p>}
                {suggestion && (
                  <div className="mt-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sky-100">Öneri: {suggestion.snapshot.description} · {Number(suggestion.snapshot.amount).toLocaleString("tr-TR")} {suggestion.snapshot.currency} · %{Math.round(suggestion.score * 100)}</p>
                      <Button size="sm" variant="outline" onClick={() => setSnapshotByRow((current) => ({ ...current, [row.id]: suggestion.snapshot.id }))} className="h-7 border-sky-500/30 text-sky-300 hover:bg-sky-500/10">Öneriyi seç</Button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <Badge className={result.decision === "safe_candidate" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"}>{result.decision === "safe_candidate" ? "Güvenli aday" : "İnsan kontrolü"}</Badge>
                      <Badge className="border-zinc-700 bg-zinc-900 text-zinc-400">{suggestion.source.name}</Badge>
                      <Badge className="border-zinc-700 bg-zinc-900 text-zinc-400">{suggestion.matchType}</Badge>
                      {suggestion.warnings.map((warning) => <Badge key={warning} className="border-amber-500/20 bg-amber-500/10 text-amber-300">{priceSuggestionWarningLabel(warning)}</Badge>)}
                    </div>
                    <p className="mt-2 text-zinc-500">{suggestion.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>}

      {queue.length > 0 && <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold text-zinc-200">İşleme kuyruğu</p><p className="mt-1 text-[10px] text-zinc-500">Tenant içindeki son SmartCheck işlemleri; başarısız run yalnızca açık retry ile tekrar başlar.</p></div><Button size="sm" variant="ghost" onClick={loadQueue}><RefreshCw size={13} />Yenile</Button></div><div className="grid gap-2 md:grid-cols-2">{queue.slice(0, 6).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 p-3"><div className="min-w-0"><p className="truncate text-xs text-zinc-300">{item.fileName ?? "Dosya"}</p><p className="mt-1 text-[10px] text-zinc-500">{item.progressMessage ?? item.currentStage} · %{item.progressPercent}</p>{item.errorCode && <p className="mt-1 truncate text-[10px] text-rose-300" title={item.errorMessage ?? item.errorCode}>{item.errorCode}</p>}</div><div className="flex shrink-0 flex-wrap items-center justify-end gap-2"><Badge className={item.status === "failed" ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : item.status === "succeeded" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-sky-500/30 bg-sky-500/10 text-sky-300"}>{item.status}</Badge>{item.status === "succeeded" && <Button size="sm" variant="outline" onClick={() => openQueueDocument(item.documentId, item.fileName, item.status)}>Sonuçları aç</Button>}{item.status === "failed" && <Button size="sm" variant="outline" onClick={() => retry(item.documentId)}>Retry</Button>}</div></div>)}</div></div>}

      {reviewedRows.length > 0 && <div className="mt-4 space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div><p className="text-xs font-bold text-emerald-300">{reviewedRows.length} satır aktarım için hazır</p><p className="mt-1 text-[10px] text-zinc-500">İnsan onaylı veya gerekçeli istisna satırları, kaynak/evidence bağları korunarak teklife aktarılır.</p></div>
          {transferredQuotationId && <Link className="text-xs font-bold text-emerald-400 underline" to={`/app/quotes/${transferredQuotationId}`}>Teklif taslağını aç</Link>}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input aria-label="Yeni teklif müşteri referansı" placeholder="Yeni teklif müşteri/ref adı" value={newQuotationDraft.clientName} onChange={(event) => setNewQuotationDraft((value) => ({ ...value, clientName: event.target.value }))} className="border-zinc-800 bg-zinc-950" />
          <Input aria-label="Yeni teklif proje adı" placeholder={`Proje adı · ${file?.name ?? "SmartCheck aktarımı"}`} value={newQuotationDraft.projectName} onChange={(event) => setNewQuotationDraft((value) => ({ ...value, projectName: event.target.value }))} className="border-zinc-800 bg-zinc-950" />
          <Button disabled={!newQuotationDraft.clientName.trim()} onClick={createQuotationAndTransfer} className="bg-emerald-600 text-white hover:bg-emerald-700">Yeni taslak oluştur ve aktar</Button>
        </div>
        <div className="grid gap-3 border-t border-emerald-500/10 pt-4 md:grid-cols-[1fr_1fr_auto]">
          <select aria-label="Taslak teklif" value={quotationId} onChange={(event) => setQuotationId(event.target.value)} className="h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-200"><option value="">Var olan taslak teklif seçin</option>{quotes.filter((quote) => quote.status === "draft").map((quote) => <option key={quote.id} value={quote.id}>{quote.quoteNumber} · {quote.projectName}</option>)}</select>
          <Input aria-label="Gerçek maliyet" placeholder="Gerçek maliyet (opsiyonel)" value={commercial.costUnitPrice} onChange={(event) => setCommercial((value) => ({ ...value, costUnitPrice: event.target.value }))} className="border-zinc-800 bg-zinc-950" />
          <Button disabled={!quotationId} onClick={transfer} variant="outline" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">Seçili taslağa aktar</Button>
        </div>
      </div>}
    </section>
  );
}
