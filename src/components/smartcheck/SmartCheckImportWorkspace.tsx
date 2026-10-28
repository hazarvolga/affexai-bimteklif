import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Download, Eye, FileCode2, FileSpreadsheet, Layers3, Loader2, RefreshCw, ShieldAlert, Table2, Upload } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, useSearchParams } from "react-router-dom";
import { ALL_MAPPING_PROFILES, getMappingProfile, MEP_MAPPING_PROFILES, type SmartCheckMappingProfile } from "@/smartcheck/import/mapping-profiles";
import { EpysPreflightPanel } from "./EpysPreflightPanel";
import { PdfPreflightPanel } from "./PdfPreflightPanel";
import { CalmIfcWorkspace } from "./CalmIfcWorkspace";
import { RevitPreUploadChecklistPanel } from "./AuthoringAdvisoryBanner";
import { PaftaDrawing } from "@/components/ui/PaftaDrawing";
import { buildCalmIfcDatasetFromElements, parseSmartCheckRowToPseudoElement } from "@/ifc/calm-icmal";
import { detectAuthoringSoftware, type AuthoringSoftwareDetection } from "@/ifc/authoring-software-diagnostics";
import type { ParsedIfcElement } from "@/ifc/types";
import { suggestMapping, type ColumnMapping, type SpreadsheetArchetype, type SpreadsheetTableMode } from "@/smartcheck/import/normalize";
import { buildCalmTransferSelection, calmTransferAttemptScope, calmTransferTargetHint, getOrCreateCalmTransferAttempt, type CalmTransferTarget, type CalmTransferUiItem } from "./calm-transfer-ui";
import { buildTenantPriceCatalogImportPayload, type TenantPriceCatalogRow } from "@/smartcheck/pricing/catalog-import";
import { parsePriceCatalogCsv } from "@/lib/price-catalog-import";
import { isLegacyXls, LEGACY_XLS_MESSAGE, readFileHead, spreadsheetKind } from "@/lib/spreadsheet-format";

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
  updatedAt: string;
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
  detectedArchetype?: SpreadsheetArchetype;
  repeatingBlockCount?: number;
};

const CUSTOM_EXCEL_PROFILES_STORAGE_KEY = "bimmetraj:custom-excel-profiles:v1";

const ARCHETYPE_LABELS: Record<SpreadsheetArchetype, string> = {
  flat_table: "Düz Metraj / Keşif İcmali",
  multi_header_pivot: "Katlara / Mahallere Göre Pivot İcmal",
  repeating_block_boq: "TOKİ / Kamu Tekrarlayan Poz Blokları",
  hybrid_summary_and_blocks: "Hibrit: Üstte Kat İcmali + Altta Detay Bloklar",
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
type PriceCatalogImportRow = TenantPriceCatalogRow;
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

export function SmartCheckImportWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedIfcDetection, setSelectedIfcDetection] = useState<AuthoringSoftwareDetection | null>(null);
  const [openedFileName, setOpenedFileName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!file || !isIfcSmartCheckFile(file)) {
      setSelectedIfcDetection(null);
      return;
    }
    file
      .slice(0, 131072)
      .text()
      .then((headText) => {
        if (!cancelled) {
          setSelectedIfcDetection(detectAuthoringSoftware(headText));
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedIfcDetection(null);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);
  const [reportRefreshKey, setReportRefreshKey] = useState(0);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("Dosya bekleniyor");
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headerRow, setHeaderRow] = useState("1");
  const [selectedProfileId, setSelectedProfileId] = useState("tr-auto-smart-v1");
  const [customProfiles, setCustomProfiles] = useState<SmartCheckMappingProfile[]>(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOM_EXCEL_PROFILES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [newProfileName, setNewProfileName] = useState("");
  const [quotes, setQuotes] = useState<Array<{ id: string; quoteNumber: string; projectName: string; status: string }>>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [quotationId, setQuotationId] = useState("");
  const [calmTarget, setCalmTarget] = useState<CalmTransferTarget>({ mode: "new", clientName: "", projectName: "" });
  const [transferredQuotationId, setTransferredQuotationId] = useState<string | null>(null);
  const [calmTransferBusy, setCalmTransferBusy] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [commercial, setCommercial] = useState({ costUnitPrice: "", wastePercent: "0", vatPercent: "20" });
  const [newQuotationDraft, setNewQuotationDraft] = useState({ clientName: "", projectName: "" });
  const [mapping, setMapping] = useState<ColumnMapping>(MEP_MAPPING_PROFILES[0].mapping);
  const [priceSnapshots, setPriceSnapshots] = useState<PriceSnapshotOption[]>([]);
  const [snapshotByRow, setSnapshotByRow] = useState<Record<string, string>>({});
  const [manualSnapshotDraft, setManualSnapshotDraft] = useState({ rowId: "", amount: "", currency: "TRY", sourceName: "", validUntil: "" });
  const [catalogImportDraft, setCatalogImportDraft] = useState({ sourceName: "", region: "", validUntil: "", fileName: "" });
  const [catalogOwnershipConfirmed, setCatalogOwnershipConfirmed] = useState(false);
  const [catalogImportText, setCatalogImportText] = useState("");
  const [catalogImportRows, setCatalogImportRows] = useState<PriceCatalogImportRow[]>([]);
  const [catalogImportBusy, setCatalogImportBusy] = useState(false);
  const [suggestionBusy, setSuggestionBusy] = useState(false);
  const [bulkReviewBusy, setBulkReviewBusy] = useState(false);
  const [sampleBusyId, setSampleBusyId] = useState<string | null>(null);
  // Samples carry no IFC evidence artifact, so the server would refuse their transfer; say so up front.
  const [sampleDocumentId, setSampleDocumentId] = useState<string | null>(null);
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
          ? "Sistem fiyat uydurmaz: fiyat kataloğunuzu ekleyin, önerileri getirin ve uygun fiyatı satıra bağlayın."
          : "Fiyat kanıtı bağlı satırlar teklife aktarılabilir; yeni taslak oluşturabilir veya mevcut taslağı seçebilirsiniz.";
  const workflowSteps: Array<{ label: string; value: string; hint: string; status: "done" | "active" | "waiting" }> = [
    { label: "1 · Kanıt satırları", value: isPdfFile && documentId ? "PDF/A Raporu" : rows.length ? `${rows.length} satır` : "Bekliyor", hint: isPdfFile && documentId ? "ISO 19005-2 + ISO 216" : rows.length ? `${openFindingCount} açık bulgu` : "Upload / örnek proje", status: (isPdfFile && documentId) || rows.length ? "done" : documentId || busy ? "active" : "waiting" },
    { label: "2 · İnsan review", value: `${reviewedRows.length}/${rows.length || 0}`, hint: pendingReviewCount ? `${pendingReviewCount} bekliyor` : "Aktarım kilidi açık", status: reviewedRows.length ? "done" : rows.length ? "active" : "waiting" },
    { label: "3 · Fiyat kanıtı", value: `${selectedPriceEvidenceCount}/${reviewedRows.length || 0}`, hint: suggestionResults.length ? `${matchedSuggestionCount} öneri · ${safeSuggestionCount} güvenli` : `${priceSnapshots.length} kayıtlı fiyat`, status: selectedPriceEvidenceCount ? "done" : reviewedRows.length ? "active" : "waiting" },
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

  useEffect(() => {
    if (!documentId) return;
    try {
      const raw = window.localStorage.getItem(`bimmetraj:calm-transfer-result:v1:${documentId}`);
      if (!raw) return;
      const record = JSON.parse(raw) as { resultQuotationId?: string };
      if (record.resultQuotationId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(record.resultQuotationId)) {
        setTransferredQuotationId(record.resultQuotationId);
      }
    } catch {
      // Invalid browser state is ignored; the server ledger remains authoritative.
    }
  }, [documentId]);

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
      setSampleDocumentId(body.documentId);
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

  // Dashboard "Örnek projeyi inceleyeceğim" opens a sample directly (marka.md M-11.4); the URL param is consumed once.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSample = searchParams.get("ornek");
  useEffect(() => {
    if (requestedSample !== "mm-mimari-tablo-9-1" && requestedSample !== "st-statik-tablo-9-2" && requestedSample !== "pdfa-pafta-iso216") return;
    setSearchParams((current) => { const next = new URLSearchParams(current); next.delete("ornek"); return next; }, { replace: true });
    void loadSampleProject(requestedSample);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per requested sample
  }, [requestedSample]);

  const availableProfiles = useMemo<SmartCheckMappingProfile[]>(
    () => [...ALL_MAPPING_PROFILES, ...customProfiles],
    [customProfiles],
  );

  const findProfileById = (profileId: string | undefined) =>
    availableProfiles.find((p) => p.id === profileId) ?? getMappingProfile(profileId);

  const saveCustomExcelProfile = () => {
    const label = newProfileName.trim();
    if (!label) {
      toast.error("Şablon adı girin (örn. Taşeron Hakediş Şablonum).");
      return;
    }
    const id = `custom-${Date.now()}`;
    const nextProfile: SmartCheckMappingProfile = {
      id,
      label: `Firma Şablonu · ${label}`,
      description: `Başlık: Satır ${headerRow} · ${mapping.description || "Açıklama"} / ${mapping.quantity || "Miktar"}`,
      mapping: {
        ...mapping,
        headerRow: Number(headerRow) || 1,
      },
    };
    const nextList = [nextProfile, ...customProfiles];
    setCustomProfiles(nextList);
    try {
      window.localStorage.setItem(CUSTOM_EXCEL_PROFILES_STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // Ignore storage quota errors
    }
    setSelectedProfileId(id);
    setNewProfileName("");
    toast.success(`"${label}" şablonu kaydedildi. Sonraki yüklemelerde listeden tek tıkla seçebilirsiniz.`);
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
    const sheetPreview = nextPreview.sheets.find((s) => s.name === sheet) ?? nextPreview.sheets[0];
    const suggested = sheetPreview?.suggestedMapping ?? {};
    const hasExplicitStoredColumns = Boolean(storedMapping.description && storedMapping.quantity);
    const profile = hasExplicitStoredColumns && storedMapping.profileId
      ? findProfileById(storedMapping.profileId)
      : undefined;
    const resolvedHeaderRow =
      (hasExplicitStoredColumns ? storedMapping.headerRow : undefined) ??
      suggested.headerRow ??
      profile?.mapping.headerRow ??
      1;
    const resolvedProfileId = profile?.id ?? "tr-auto-smart-v1";
    setSelectedSheet(sheet);
    setHeaderRow(String(resolvedHeaderRow));
    setSelectedProfileId(resolvedProfileId);
    setMapping({
      ...(profile?.mapping ?? {}),
      ...suggested,
      ...(hasExplicitStoredColumns ? storedMapping : {}),
      profileId: resolvedProfileId,
      sheet,
      headerRow: resolvedHeaderRow,
    });
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
    const response = await fetchWithAuth(`/api/smartcheck/rows/${reviewDraft.row.id}/review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: reviewDraft.status, notes: notes || undefined, correction, expectedUpdatedAt: reviewDraft.row.updatedAt }) });
    const body = await response.json();
    if (response.status === 409 && body.code === "REVIEW_VERSION_CONFLICT") {
      setReviewDraft(null);
      if (documentId) await loadRows(documentId);
      return toast.error("Satır başka bir işlemde değişti. Güncel satır yüklendi; kararınızı yeniden gözden geçirin.");
    }
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
    const importResponse = await fetchWithAuth("/api/pricing/catalog/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "manual_override",
        sourceName,
        authority: "Kullanıcı manuel fiyat girişi",
        sourceDocumentIdentifier: `smartcheck:${documentId}:${row.id}:${Date.now()}`,
        capturedAt,
        validUntil: manualSnapshotDraft.validUntil ? new Date(manualSnapshotDraft.validUntil).toISOString() : null,
        rows: [{
          positionCode: row.normalizedPositionCode ?? row.rawPositionCode,
          description: row.normalizedDescription ?? row.rawDescription ?? "SmartCheck metraj kalemi",
          unit: row.normalizedUnit ?? row.rawUnit ?? "adet",
          amount,
          currency: manualSnapshotDraft.currency,
          confidence: 0.55,
          metadataJson: { smartcheckDocumentId: documentId, smartcheckRowId: row.id, source: "smartcheck_manual_price" },
        }],
        licenseStatus: "not_applicable",
        metadataJson: { smartcheckDocumentId: documentId, smartcheckRowId: row.id },
      }),
    });
    const imported = await readJsonBody<{ snapshots?: PriceSnapshotOption[]; error?: string }>(importResponse);
    const snapshot = imported.snapshots?.[0];
    if (!importResponse.ok || !snapshot?.id) return toast.error(imported.error ?? "Fiyat kaydı oluşturulamadı.");
    setPriceSnapshots((current) => [snapshot, ...current.filter((candidate) => candidate.id !== snapshot.id)]);
    setSnapshotByRow((current) => ({ ...current, [row.id]: snapshot.id }));
    setManualSnapshotDraft((current) => ({ ...current, rowId: row.id, amount: "", sourceName }));
    toast.success("Manuel fiyat kaydedildi. Teklifte kullanmak için farklı bir yetkili tarafından onaylanmalıdır.");
  };

  const readPriceCatalogFile = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    setCatalogOwnershipConfirmed(false);
    try {
      const kind = spreadsheetKind(selectedFile.name, await readFileHead(selectedFile));
      if (kind === "xls") throw new Error(LEGACY_XLS_MESSAGE);
      const parsedRows = kind === "xlsx"
        ? await import("@/lib/price-catalog-import").then(({ parsePriceCatalogXlsx }) => selectedFile.arrayBuffer().then(parsePriceCatalogXlsx))
        : parsePriceCatalogCsv(await selectedFile.text());
      setCatalogImportRows(parsedRows);
      setCatalogImportDraft((current) => ({
        ...current,
        fileName: selectedFile.name,
        sourceName: current.sourceName || selectedFile.name.replace(/\.[^.]+$/, ""),
      }));
      toast.success(`${parsedRows.length} fiyat satırı hazır.`);
    } catch (error) {
      setCatalogImportRows([]);
      toast.error(error instanceof Error ? error.message : "Fiyat kataloğu dosyası okunamadı.", { duration: 12000 });
    }
  };

  const downloadPriceCatalogTemplate = async () => {
    try {
      const { buildPriceCatalogXlsxTemplate, downloadXlsx } = await import("@/lib/spreadsheet-templates");
      downloadXlsx(await buildPriceCatalogXlsxTemplate(), "bimmetraj-fiyat-katalogu-sablonu.xlsx");
    } catch {
      toast.error("Excel şablonu hazırlanamadı.");
    }
  };

  const readPriceCatalogText = () => {
    setCatalogOwnershipConfirmed(false);
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
    if (!catalogOwnershipConfirmed) return toast.error("Bu fiyatların firmanıza ait gerçekleşen veriler olduğunu onaylayın.");
    setCatalogImportBusy(true);
    const sourceName = catalogImportDraft.sourceName.trim() || catalogImportDraft.fileName || "SmartCheck CSV fiyat kataloğu";
    try {
      const response = await fetchWithAuth("/api/pricing/catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildTenantPriceCatalogImportPayload({
          sourceName,
          fileName: catalogImportDraft.fileName,
          documentId,
          region: catalogImportDraft.region.trim() || undefined,
          validUntil: catalogImportDraft.validUntil ? new Date(catalogImportDraft.validUntil).toISOString() : undefined,
          rows: catalogImportRows,
          ownershipConfirmed: catalogOwnershipConfirmed,
        })),
      });
      const body = await readJsonBody<{ error?: string; insertedCount?: number; reusedCount?: number; snapshots?: PriceSnapshotOption[] }>(response);
      if (!response.ok || !body.snapshots) return toast.error(body.error ?? "CSV fiyat kataloğu içe aktarılamadı.");
      setPriceSnapshots((current) => [
        ...body.snapshots!,
        ...current.filter((candidate) => !body.snapshots!.some((snapshot) => snapshot.id === candidate.id)),
      ]);
      setPriceSuggestionsByRow({});
      setCatalogOwnershipConfirmed(false);
      toast.success(`${(body.insertedCount ?? 0) + (body.reusedCount ?? 0)} fiyat kataloğa eklendi.`);
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

  const transferCalmToQuotation = async (items: CalmTransferUiItem[], { overheadProfitPercent }: { overheadProfitPercent: number }) => {
    if (!documentId) { toast.error("İcmalin kaynak dosyası bulunamadı."); return; }
    const targetHint = calmTransferTargetHint(calmTarget);
    if (targetHint) { toast.error(targetHint); return; }
    const approvedRowIds = new Set(rows.filter((row) => row.reviewStatus === "approved").map((row) => row.id));
    let selection;
    try {
      selection = buildCalmTransferSelection(items);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      toast.error(code === "CALM_TRANSFER_PRICE_CONFLICT"
        ? "Aynı icmal satırı birden fazla fiyat kaydına eşleşti. Kalemleri gözden geçirin."
        : "İcmal kalemlerinin kaynak satır bilgisi eksik; aktarım durduruldu.");
      return;
    }
    const sourceRowIds = [...new Set(items.flatMap((item) => item.sourceQuantityRowIds))];
    if (sourceRowIds.some((rowId) => !approvedRowIds.has(rowId))) {
      toast.error("Aktarım için kaleme giren tüm kaynak satırların mühendis tarafından onaylanmış olması gerekir.");
      return;
    }
    setCalmTransferBusy(true);
    try {
      // The percentage is part of the request the server hashes, so a changed value is a new attempt, not a conflict.
      const attempt = getOrCreateCalmTransferAttempt(window.localStorage, documentId, calmTransferAttemptScope(calmTarget), { ...selection, overheadProfitPercent }, () => crypto.randomUUID());
      const isNewQuotation = calmTarget.mode === "new";
      const response = await fetchWithAuth(`/api/smartcheck/documents/${documentId}/${isNewQuotation ? "transfer-calm-to-new-quotation" : "transfer-calm-to-quotation"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.record.idempotencyKey },
        body: JSON.stringify(calmTarget.mode === "new"
          ? { clientName: calmTarget.clientName.trim(), projectName: calmTarget.projectName.trim() || undefined, overheadProfitPercent, ...selection }
          : { quotationId: calmTarget.quotationId, overheadProfitPercent, ...selection }),
      });
      const body = await readJsonBody<{ error?: string; quotationId?: string; revisionVersion?: number; transferredCount?: number; replayed?: boolean }>(response);
      if (!response.ok || !body.quotationId) { toast.error(body.error ?? "İcmalin teklife aktarımı tamamlanamadı."); return; }
      window.localStorage.setItem(attempt.storageKey, JSON.stringify({
        ...attempt.record,
        resultQuotationId: body.quotationId,
        revisionVersion: body.revisionVersion,
      }));
      window.localStorage.setItem(`bimmetraj:calm-transfer-result:v1:${documentId}`, JSON.stringify({
        sourceQuotationId: calmTarget.mode === "revision" ? calmTarget.quotationId : null,
        resultQuotationId: body.quotationId,
        revisionVersion: body.revisionVersion,
      }));
      setTransferredQuotationId(body.quotationId);
      const quotesResponse = await fetchWithAuth("/api/quotations");
      if (quotesResponse.ok) {
        const latestQuotes = await quotesResponse.json() as Array<{ id: string; quoteNumber: string; projectName: string; status: string }>;
        setQuotes(latestQuotes);
        if (latestQuotes.some((quote) => quote.id === body.quotationId)) {
          setQuotationId(body.quotationId);
          // The successor is now the latest revision; a further transfer must target it, not the superseded one.
          if (!isNewQuotation) setCalmTarget({ mode: "revision", quotationId: body.quotationId });
        }
      }
      const created = isNewQuotation ? "yeni teklif" : `Rev. ${body.revisionVersion ?? "?"}`;
      toast.success(body.replayed
        ? `Daha önce oluşturulan ${created} tekrar açıldı.`
        : `${body.transferredCount ?? sourceRowIds.length} kaynak satırdan ${created} oluşturuldu.`);
    } catch {
      toast.error("İcmal teklife aktarılırken bağlantı hatası oluştu.");
    } finally {
      setCalmTransferBusy(false);
    }
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
        <div><p className="text-xs font-bold text-sky-100">Fiyat listesi içe aktarma (Excel veya CSV)</p><button type="button" onClick={() => void downloadPriceCatalogTemplate()} className="mt-1 text-[11px] font-semibold text-sky-300 underline">Excel şablonunu indir (.xlsx)</button><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Başlıklar: Poz No, Açıklama, Birim, Birim Fiyat, Para Birimi. Bu genel akış yalnız firmanızın kendi gerçekleşen fiyat hafızası içindir; tedarikçi teklifleri ayrı lisans ve yetkilendirme incelemesine tabidir. İçe aktarılan fiyatlar öneri niteliğindedir; onay veya satıra bağlama kararı mühendiste kalır.</p></div>
        {catalogImportRows.length > 0 && <Badge className="w-fit border-emerald-500/20 bg-emerald-500/10 text-emerald-400">{catalogImportRows.length} satır hazır</Badge>}
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
        <Input aria-label="CSV fiyat katalog kaynak adı" placeholder="Kaynak adı / firma fiyat hafızası" value={catalogImportDraft.sourceName} onChange={(event) => { setCatalogOwnershipConfirmed(false); setCatalogImportDraft((value) => ({ ...value, sourceName: event.target.value })); }} className="border-border bg-background" />
        <Input aria-label="CSV fiyat katalog bölgesi" placeholder="Bölge (opsiyonel)" value={catalogImportDraft.region} onChange={(event) => { setCatalogOwnershipConfirmed(false); setCatalogImportDraft((value) => ({ ...value, region: event.target.value })); }} className="border-border bg-background" />
        <Input aria-label="CSV fiyat katalog geçerlilik tarihi" type="date" value={catalogImportDraft.validUntil} onChange={(event) => { setCatalogOwnershipConfirmed(false); setCatalogImportDraft((value) => ({ ...value, validUntil: event.target.value })); }} className="border-border bg-background" />
        <Button disabled={!catalogImportRows.length || !catalogOwnershipConfirmed || catalogImportBusy} onClick={importPriceCatalog} className="bg-sky-600 text-white hover:bg-sky-700">{catalogImportBusy ? <Loader2 className="animate-spin" size={15} /> : "Kataloğu aktar"}</Button>
      </div>
      <label className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-muted-foreground">
        <input aria-label="Firma gerçekleşen fiyat sahiplik beyanı" type="checkbox" checked={catalogOwnershipConfirmed} onChange={(event) => setCatalogOwnershipConfirmed(event.target.checked)} className="mt-0.5" />
        <span>Bu dosyanın firmamıza ait gerçekleşen fiyat verisi olduğunu ve tedarikçi teklifi olmadığını beyan ediyorum.</span>
      </label>
      <label className="mt-3 flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-border p-4 text-[11px] text-muted-foreground hover:border-sky-500/50">
        <span className="font-bold text-foreground dark:text-muted-foreground">{catalogImportDraft.fileName || "Fiyat kataloğu dosyası seçin (Excel veya CSV)"}</span>
        <span>Excel (.xlsx) veya CSV; poz, açıklama, birim ve birim fiyat kolonlarını içerir.</span>
        <input aria-label="Fiyat kataloğu dosyası (Excel veya CSV)" className="sr-only" type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { const selected = event.target.files?.[0] ?? null; event.target.value = ""; void readPriceCatalogFile(selected); }} />
      </label>
      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
        <textarea aria-label="CSV fiyat katalog metni" placeholder="Excel/CSV satırlarını buraya yapıştırın" value={catalogImportText} onChange={(event) => { setCatalogOwnershipConfirmed(false); setCatalogImportText(event.target.value); }} className="min-h-24 rounded-xl border border-border bg-background p-3 text-[11px] text-foreground outline-none focus:border-sky-500/60" />
        <Button disabled={!catalogImportText.trim()} onClick={readPriceCatalogText} variant="outline" className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10">CSV metnini oku</Button>
      </div>
      {catalogImportRows[0] && <div className="mt-3 rounded-xl border border-border bg-background p-3 text-[10px] text-muted-foreground">
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
    setCatalogOwnershipConfirmed(false);
    setTransferredQuotationId(null);
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
            documentId={documentId}
            quotations={quotes}
            transferTarget={calmTarget}
            onTransferTargetChange={(nextTarget) => {
              setCalmTarget(nextTarget);
              if (nextTarget.mode === "revision") setQuotationId(nextTarget.quotationId);
              setTransferredQuotationId(null);
            }}
            onTransferToQuote={transferCalmToQuotation}
            transferUnavailableReason={documentId && documentId === sampleDocumentId
              ? "Örnek projeden teklif oluşturulmaz; fiyatlandırmayı burada deneyebilirsiniz. Teklif için kendi IFC modelinizi yükleyin."
              : undefined}
            transferBusy={calmTransferBusy}
            transferredQuotationId={transferredQuotationId}
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
              : "IFC katmanları, kapı/pencere boşluk düşümleri (minha) ve bağımsız bölüm (daire) net/brüt alanları çıkarılıyor. İşlem tamamlandığında metraj icmali otomatik açılır."}
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
                  Proje Dosyanızı Yükleyin, <em>Kaynak Bağlantılı Metraj İcmali</em> Oluşturun
                </h2>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground max-w-xl">
                  IFC modelinizi yüklediğinizde imalat kalemleri, modelde varsa çok katmanlı kaplamalar ve kapı/pencere boşluk düşümleri (minha) ile daire m² cetveli çıkarılır. Modelde bulunmayan bilgi sonuç ekranında ayrıca belirtilir.
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
                    onChange={async (event) => {
                      const selected = event.target.files?.[0] ?? null;
                      if (selected && isLegacyXls(selected.name, await readFileHead(selected))) {
                        event.target.value = "";
                        toast.error(LEGACY_XLS_MESSAGE, { duration: 12000 });
                        return;
                      }
                      setFile(selected);
                      setOpenedFileName(null);
                      setDocumentId(null);
                      setPilotCaseId(null);
                      setPreview(null);
                      setRows([]);
                      setStage("Dosya seçildi — Yüklemeye hazır");
                    }}
                  />
                </label>

                {/* SÜREÇ ÖNCESİ REVIT & IFC DIŞA AKTARIM KONTROL LİSTESİ (DOSYA SEÇİLDİĞİNDE OTOMATİK TESPİT EDER) */}
                <RevitPreUploadChecklistPanel selectedDetection={selectedIfcDetection} />

                <button
                  type="button"
                  disabled={!file || busy}
                  onClick={upload}
                  className="pafta-button w-full !justify-center"
                >
                  <Upload size={15} />
                  <span>
                    {isIfcFile
                      ? "IFC Modelini Yükle ve Metraj İcmalini Çıkar"
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Table2 size={14} className="text-orange-400" /> Kaynak yapısı ve Akıllı Excel Adaptörü
                  </div>
                  {activeSheet?.detectedArchetype && (
                    <Badge className="border-sky-500/30 bg-sky-500/10 text-[10px] text-sky-300">
                      {ARCHETYPE_LABELS[activeSheet.detectedArchetype]}
                      {activeSheet.repeatingBlockCount ? ` (${activeSheet.repeatingBlockCount} blok)` : ""}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Sheet
                    <select
                      aria-label="Sheet"
                      value={selectedSheet}
                      onChange={(event) => {
                        const nextSheetName = event.target.value;
                        const nextSheetObj = preview.sheets.find((s) => s.name === nextSheetName);
                        const nextSuggested = nextSheetObj?.suggestedMapping ?? {};
                        setSelectedSheet(nextSheetName);
                        if (nextSuggested.headerRow) setHeaderRow(String(nextSuggested.headerRow));
                        setMapping((current) => ({ ...current, ...nextSuggested, sheet: nextSheetName }));
                      }}
                      className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                    >
                      {preview.sheets.map((sheet) => (
                        <option key={sheet.name} value={sheet.name}>
                          {sheet.name} · {sheet.rowCount} satır
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Başlık satırı
                    <input
                      aria-label="Başlık satırı"
                      type="number"
                      min="1"
                      max="100"
                      value={headerRow}
                      onChange={(event) => {
                        const nextRow = event.target.value;
                        setHeaderRow(nextRow);
                        const rowCells = activeSheet?.sampleRows[Number(nextRow) - 1];
                        if (rowCells && rowCells.some((c) => c.trim())) {
                          const reSuggested = suggestMapping(rowCells);
                          setMapping((current) => ({ ...current, ...reSuggested, headerRow: Number(nextRow) }));
                        }
                      }}
                      className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Eşleme profili
                    <select
                      aria-label="MEP eşleme profili"
                      value={selectedProfileId}
                      onChange={(event) => {
                        const profile = findProfileById(event.target.value);
                        if (!profile) return;
                        setSelectedProfileId(profile.id);
                        if (profile.id === "tr-auto-smart-v1" && activeSheet) {
                          const autoMap = activeSheet.suggestedMapping;
                          setHeaderRow(String(autoMap.headerRow ?? 1));
                          setMapping({ ...autoMap, profileId: profile.id, sheet: selectedSheet });
                          return;
                        }
                        const nextH = profile.mapping.headerRow ?? Number(headerRow);
                        setHeaderRow(String(nextH));
                        setMapping((current) => ({
                          ...current,
                          ...profile.mapping,
                          profileId: profile.id,
                          sheet: selectedSheet,
                          headerRow: nextH,
                        }));
                      }}
                      className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                    >
                      {availableProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Okuma modu
                    <select
                      aria-label="Tablo okuma modu"
                      value={mapping.tableMode ?? "auto"}
                      onChange={(event) => {
                        const nextMode = event.target.value as SpreadsheetTableMode;
                        setMapping((current) => ({
                          ...current,
                          tableMode: nextMode,
                          ...(nextMode === "repeating_blocks"
                            ? {
                                positionCode: "POZ NO",
                                description: "İMALATIN ADI",
                                unit: "BİRİMİ",
                                quantity: "Genel Toplam",
                              }
                            : {}),
                        }));
                      }}
                      className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                    >
                      <option value="auto">Otomatik (Önerilen)</option>
                      <option value="flat_or_pivot">Düz / Kat İcmal Tablosu</option>
                      <option value="repeating_blocks">Tekrarlayan Poz Blokları (TOKİ)</option>
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {mappingFields.map((key) => (
                    <Input
                      key={key}
                      aria-label={key}
                      placeholder={mappingLabels[key]}
                      value={String(mapping[key] ?? "")}
                      onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value }))}
                      className="h-9 border-border bg-background text-xs"
                    />
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Input
                    aria-label="Yeni firma Excel şablon adı"
                    placeholder="Bu düzeni kaydet (örn. X İnşaat Şablonu)"
                    value={newProfileName}
                    onChange={(event) => setNewProfileName(event.target.value)}
                    className="h-8 border-border bg-background text-[11px]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={saveCustomExcelProfile}
                    className="h-8 shrink-0 border-border text-[11px]"
                  >
                    Şablon Kaydet
                  </Button>
                </div>
                <Button
                  disabled={busy || previewBusy || !selectedSheet}
                  onClick={startProcessing}
                  className="w-full gap-2 bg-sky-600 text-white hover:bg-sky-700"
                >
                  {busy ? <Loader2 className="animate-spin" size={15} /> : <Layers3 size={15} />} Eşlemeyi onayla ve işle
                </Button>
              </div>
              {activeSheet && (
                <div className="overflow-auto rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>İpucu: Tablodaki herhangi bir satıra tıklayarak onu <b>Başlık Satırı</b> olarak seçebilirsiniz.</span>
                    <span className="font-mono">Seçili Başlık: Satır {headerRow}</span>
                  </div>
                  <table className="w-full min-w-[640px] text-left text-[11px]">
                    <tbody>
                      {activeSheet.sampleRows.map((row, rowIndex) => (
                        <tr
                          key={`${rowIndex}-${row.join("|")}`}
                          onClick={() => {
                            const nextRowNum = rowIndex + 1;
                            setHeaderRow(String(nextRowNum));
                            if (row.some((c) => c.trim())) {
                              const reSuggested = suggestMapping(row);
                              setMapping((current) => ({
                                ...current,
                                ...reSuggested,
                                headerRow: nextRowNum,
                              }));
                            }
                          }}
                          className={`cursor-pointer transition-colors hover:bg-orange-500/5 ${
                            rowIndex === Number(headerRow) - 1
                              ? "bg-orange-500/15 text-orange-200 font-semibold"
                              : "border-t border-border text-muted-foreground"
                          }`}
                        >
                          <td className="w-10 select-none border-r border-border/60 px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                            {rowIndex + 1}
                          </td>
                          {row.map((value, columnIndex) => (
                            <td key={`${rowIndex}-${columnIndex}`} className="max-w-48 truncate p-2" title={value}>
                              {value || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {documentId && isIfcFile && !busy && <EpysPreflightPanel documentId={documentId} refreshKey={rows.length + reportRefreshKey} />}
          {documentId && isPdfFile && !busy && <PdfPreflightPanel documentId={documentId} refreshKey={reportRefreshKey} />}

          {rows.length > 0 && (
            <div className="max-h-[480px] overflow-auto rounded-2xl border border-border">
              <table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-card text-muted-foreground sticky top-0"><tr><th className="p-3">Kaynak</th><th className="p-3">Poz / Açıklama</th><th className="p-3">Miktar</th><th className="p-3">Bulgular</th><th className="p-3">Karar</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border align-top"><td className="p-3 font-mono text-orange-400">{row.sheetName}!{row.sourceCellRange}<div className="mt-1 text-[10px] text-muted-foreground">satır {row.sourceRowNumber}</div></td><td className="p-3 text-foreground dark:text-muted-foreground"><b>{row.rawPositionCode || "Poz yok"}</b><div className="text-muted-foreground">{row.rawDescription}</div></td><td className="p-3 text-foreground dark:text-muted-foreground">{row.normalizedQuantity ?? row.rawQuantity} {row.normalizedUnit ?? row.rawUnit}</td><td className="p-3">{row.findingsJson.length ? row.findingsJson.map((finding) => <div key={finding.code} title={`${finding.ruleVersion}: ${finding.suggestion}`} className="mb-1 text-amber-400">{finding.message}</div>) : <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 size={13} /> Bulgu yok</span>}</td><td className="p-3"><div className="mb-2 text-[10px] text-muted-foreground">{statusLabel(row.reviewStatus)}</div><div className="flex flex-wrap gap-2"><Button size="sm" disabled={row.findingsJson.length > 0 || row.reviewStatus === "approved"} onClick={() => openReviewDraft(row, "approved")}>Onayla</Button>{row.findingsJson.length > 0 && <Button size="sm" variant="outline" onClick={() => openReviewDraft(row, "approved")}>Miktarı düzelt</Button>}<Button size="sm" variant="outline" onClick={() => openReviewDraft(row, "accepted_exception")}>İstisna</Button><Button size="sm" variant="outline" onClick={() => openReviewDraft(row, "rejected")}>Reddet</Button><Button size="sm" variant="ghost" onClick={() => setExpandedRowId((current) => current === row.id ? null : row.id)}><ChevronDown size={13} className={expandedRowId === row.id ? "rotate-180" : ""} />Kanıt</Button></div></td></tr>).flatMap((rowElement, index) => { const row = rows[index]; return expandedRowId === row.id ? [rowElement, <tr key={`${row.id}-evidence`} className="border-t border-sky-500/10 bg-sky-500/[0.03]"><td colSpan={5} className="p-4"><div className="grid gap-4 md:grid-cols-3"><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-sky-400">Kaynak değer</p><dl className="space-y-1 text-[11px] text-muted-foreground"><div className="flex justify-between gap-3"><dt>Poz</dt><dd>{row.rawPositionCode || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Açıklama</dt><dd>{row.rawDescription || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Birim</dt><dd>{row.rawUnit || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Miktar</dt><dd>{row.rawQuantity || "—"}</dd></div></dl></div><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">Normalize değer</p><dl className="space-y-1 text-[11px] text-muted-foreground"><div className="flex justify-between gap-3"><dt>Poz</dt><dd>{row.normalizedPositionCode || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Açıklama</dt><dd>{row.normalizedDescription || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Birim</dt><dd>{row.normalizedUnit || "—"}</dd></div><div className="flex justify-between gap-3"><dt>Miktar</dt><dd>{row.normalizedQuantity || "—"}</dd></div></dl></div><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-orange-400">Kural ve inceleme</p><dl className="space-y-1 text-[11px] text-muted-foreground"><div className="flex justify-between gap-3"><dt>Durum</dt><dd>{statusLabel(row.reviewStatus)}</dd></div><div className="flex justify-between gap-3"><dt>Not</dt><dd>{row.reviewerNotes || "—"}</dd></div></dl></div></div></td></tr>] : [rowElement]; })}</tbody></table>
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
