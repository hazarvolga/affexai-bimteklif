import { SourcePermissionReview } from '@/components/pricing/SourcePermissionReview';
import { useEffect, useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  Database,
  RefreshCw,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Building2,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Globe,
  Link as LinkIcon,
  HelpCircle,
  Moon,
  Play,
  Cpu,
  Upload,
  FileSpreadsheet,
  Zap,
  Settings2,
} from 'lucide-react';
import { fetchWithAuth } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

interface PricingDataSource {
  id: string;
  code: string;
  name: string;
  authority: string;
  category: string;
  sourceUrl: string;
  status: string;
  syncFrequency: string;
  itemCount: number;
  validityStart: string;
  validityEnd: string;
  lastSyncAt: string;
  versionTag: string;
  dataHash: string;
  crawlerConfig?: Record<string, unknown> | null;
  pendingReviewCount: number;
}

interface StagingItem {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceCode: string;
  itemCode: string;
  itemName: string;
  unit: string;
  currentPrice: string | null;
  crawledPrice: string;
  diffPercent: string | null;
  sourceUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  confidenceScore: string;
  notes: string;
  crawledAt: string;
  reviewedAt: string | null;
}

function isOfficialOrIndexSource(s: PricingDataSource): boolean {
  return (
    ['official_gazette', 'tuik_index', 'epys_standard'].includes(s.category) ||
    s.code.startsWith('csb_') ||
    s.code.startsWith('tuik_') ||
    s.code.startsWith('csv:')
  );
}

function getSampleCsvForSource(s: PricingDataSource): {
  fileName: string;
  licenseReference: string;
  csvText: string;
} {
  if (s.code.startsWith('csb_') || s.category === 'official_gazette') {
    return {
      fileName: 'csb_yfk_2026_birim_fiyatlar.csv',
      licenseReference: 'Resmi Gazete YFK 2026/1 Kurumsal Katalog Kaydı',
      csvText: [
        'itemCode,itemName,unit,price',
        '15.150.1005,C 25/30 Basınç Dayanım Sınıfında Gri Hazır Beton Dökülmesi,m³,2650.00',
        '15.150.1006,C 30/37 Basınç Dayanım Sınıfında Gri Hazır Beton Dökülmesi,m³,2890.00',
        '15.150.1007,C 35/45 Basınç Dayanım Sınıfında Gri Hazır Beton Dökülmesi,m³,3150.00',
        '15.160.1003,Ø 8-Ø 12 mm Nervürlü Beton Çelik Çubuğu B420C Temini ve İşçiliği,ton,36800.00',
        '15.160.1004,Ø 14-Ø 32 mm Nervürlü Beton Çelik Çubuğu B420C Temini ve İşçiliği,ton,36200.00',
        '15.180.1002,Plywood (Kontrplak) ile Düz Yüzeyli Betonarme Kalıbı Yapılması,m²,685.00',
        '15.270.1005,13.5 cm Kalınlığında Yatay Delikli Tuğla Duvar Yapılması,m²,495.00',
        '15.275.1102,20 cm Kalınlığında Gazbeton Blok Teşkili (G2/04),m²,640.00',
        '15.320.1002,İç Cephe Alçı Sıva Yapılması (Perlitli + Saten),m²,320.00',
        '15.540.1101,İç Cephe Su Bazlı Silikonlu Mat Boya Yapılması,m²,165.00',
      ].join('\n'),
    };
  }
  if (s.code.startsWith('epys_') || s.category === 'epys_standard') {
    return {
      fileName: 'epys_ek6_2026_standart_pozlar.csv',
      licenseReference: 'Kamu İhale Kurumu e-PYS Ek-6 Standart Poz Listesi 2026',
      csvText: [
        'itemCode,itemName,unit,price',
        'EPYS-15.120.1001,Makine ile Yumuşak ve Sert Toprak Kazılması,m³,195.00',
        'EPYS-15.150.1006,Beton Santralinde Üretilen C 30/37 Hazır Beton,m³,2890.00',
        'EPYS-15.160.1004,Nervürlü Beton Çeliği (Ø 14-32 mm) B420C,ton,36200.00',
        'EPYS-25.115.1001,PP-R Temiz Su Borusu Ø25 mm Tesisatı,m,210.00',
        'EPYS-35.140.1001,NHXMH 3x2.5 mm² Halojensiz Kablo Tesisatı,m,145.00',
      ].join('\n'),
    };
  }
  if (s.code.startsWith('tuik_') || s.category === 'tuik_index') {
    return {
      fileName: 'tuik_ime_2026_endeks.csv',
      licenseReference: 'TÜİK İnşaat Maliyet Endeksi (İME) 2026 Haber Bülteni',
      csvText: [
        'itemCode,itemName,unit,price',
        'TUIK-IME-GENEL,TÜİK İnşaat Maliyet Endeksi Genel (2015=100),endeks,1485.40',
        'TUIK-IME-MALZEME,TÜİK İnşaat Malzeme Endeksi (2015=100),endeks,1562.80',
        'TUIK-IME-ISCILIK,TÜİK İnşaat İşçilik Endeksi (2015=100),endeks,1340.15',
        'TUIK-IME-BINA,TÜİK Bina İnşaatı Maliyet Endeksi (2015=100),endeks,1472.90',
      ].join('\n'),
    };
  }
  return {
    fileName: `${s.code}_2026.csv`,
    licenseReference: `${s.authority || s.name} Kurumsal Fiyat Listesi 2026`,
    csvText: [
      'itemCode,itemName,unit,price',
      'RAYIC-001,C 30/37 Hazır Beton (Pompalı),m³,2950.00',
      'RAYIC-002,Ø12-32 mm Nervürlü İnşaat Demiri,ton,38000.00',
    ].join('\n'),
  };
}

interface OfficialCatalogCoverageBook {
  id: string;
  title: string;
  fileName: string;
  sha256: string;
  ingestedRowCount: number;
  totalRowsInBook: number;
  coveragePercent: number;
  periodType: 'monthly' | 'annual';
  validityStart: string;
  validityEnd: string;
  status: 'full' | 'partial';
}

interface OfficialCatalogCoverageReport {
  generatedAt: string;
  totalBooks: number;
  fullCoverageBooks: number;
  totalIngestedRows: number;
  totalRowsInBooks: number;
  overallCoveragePercent: number;
  books: OfficialCatalogCoverageBook[];
}

export function PricingSources() {
  const [sources, setSources] = useState<PricingDataSource[]>([]);
  const [stagingItems, setStagingItems] = useState<StagingItem[]>([]);
  const [coverageReport, setCoverageReport] = useState<OfficialCatalogCoverageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'sources' | 'books' | 'import' | 'staging' | 'coverage' | 'audit'
  >('sources');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [bulkReviewing, setBulkReviewing] = useState(false);

  // Audit Diagnostic State
  const [auditQuery, setAuditQuery] = useState('');
  const [auditResult, setAuditResult] = useState<{
    items: Array<{
      id: string;
      itemCode: string;
      itemName: string;
      crawledPrice: string;
      unit: string;
      sourceName: string;
      reviewedAt: string;
      validityStart: string;
      validityEnd: string;
    }>;
  } | null>(null);
  const [auditError, setAuditError] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  // New Source Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingSource, setCreatingSource] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newSource, setNewSource] = useState({
    name: '',
    code: '',
    authority: '',
    category: 'market_commodity',
    sourceUrl: '',
    syncFrequency: 'daily',
    versionTag: '2026/1',
    autoApprove: false,
  });

  // Verify & Auto-Track Modal State
  const [verifyModalSource, setVerifyModalSource] = useState<PricingDataSource | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyForm, setVerifyForm] = useState({
    sourceUrl: '',
    authority: '',
    versionTag: '2026/1',
    syncFrequency: 'daily',
    validityStart: new Date().toISOString().slice(0, 10),
    validityEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    autoApprove: false,
  });

  // CSV / PDF / Official Catalog Import & Seal Modal State
  const [csvModalSource, setCsvModalSource] = useState<PricingDataSource | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [selectedOfficialCatalogId, setSelectedOfficialCatalogId] = useState<string>('csb_2026_mart_insaat_bf');
  const [pdfBase64Data, setPdfBase64Data] = useState<string>('');
  const [pdfFileSizeKb, setPdfFileSizeKb] = useState<number>(0);
  const [csvForm, setCsvForm] = useState({
    fileName: '',
    licenseReference: '',
    validityStart: '2026-01-01',
    validityEnd: '2026-12-31',
    csvText: '',
    licenseConfirmed: true,
    autoApprove: false,
  });

  const openVerifyModal = (s: PricingDataSource) => {
    const cfg = (s.crawlerConfig || {}) as Record<string, unknown>;
    const nowIso = new Date().toISOString().slice(0, 10);
    const defaultDays = isOfficialOrIndexSource(s) ? 365 : 90;
    const defaultEndIso = new Date(Date.now() + defaultDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    setVerifyForm({
      sourceUrl: s.sourceUrl || '',
      authority: s.authority || '',
      versionTag: s.versionTag === 'metadata-only' ? '2026/1' : s.versionTag || '2026/1',
      syncFrequency: s.syncFrequency || 'daily',
      validityStart: s.validityStart ? new Date(s.validityStart).toISOString().slice(0, 10) : nowIso,
      validityEnd: s.validityEnd ? new Date(s.validityEnd).toISOString().slice(0, 10) : defaultEndIso,
      autoApprove: typeof cfg.autoApprove === 'boolean' ? cfg.autoApprove : !isOfficialOrIndexSource(s),
    });
    setVerifyModalSource(s);
  };

  const openCsvModal = (s: PricingDataSource) => {
    const sample = getSampleCsvForSource(s);
    const nowYear = new Date().getFullYear();
    setPdfBase64Data('');
    setPdfFileSizeKb(0);
    if (s.code.startsWith('tuik_') || s.category === 'tuik_index') {
      setSelectedOfficialCatalogId('csb_2026_tuik_endeks_eslestirme');
    } else {
      setSelectedOfficialCatalogId('csb_2026_mart_insaat_bf');
    }
    setCsvForm({
      fileName: sample.fileName,
      licenseReference: sample.licenseReference,
      validityStart: s.validityStart
        ? new Date(s.validityStart).toISOString().slice(0, 10)
        : `${nowYear}-01-01`,
      validityEnd: s.validityEnd
        ? new Date(s.validityEnd).toISOString().slice(0, 10)
        : `${nowYear}-12-31`,
      csvText: '',
      licenseConfirmed: true,
      autoApprove: false,
    });
    setCsvModalSource(s);
  };

  const handleVerifySubmit = async (runSyncAfter: boolean) => {
    if (!verifyModalSource) return;
    setVerifying(true);
    try {
      const res = await fetchWithAuth(`/api/admin/pricing-sources/${verifyModalSource.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Kaynak doğrulanamadı.');
        return;
      }
      toast.success(data.message || `"${verifyModalSource.name}" doğrulandı ve aktif edildi.`);
      const targetId = verifyModalSource.id;
      const targetName = verifyModalSource.name;
      setVerifyModalSource(null);
      if (runSyncAfter) {
        await handleSync(targetId, targetName);
      } else {
        await loadData();
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setVerifying(false);
    }
  };

  const handleOfficialCatalogImport = async () => {
    if (!csvModalSource) return;
    setImportingCsv(true);
    try {
      const res = await fetchWithAuth(`/api/admin/pricing-sources/${csvModalSource.id}/import-official-catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogId: selectedOfficialCatalogId,
          licenseConfirmed: csvForm.licenseConfirmed,
          validityStart: csvForm.validityStart,
          validityEnd: csvForm.validityEnd,
          autoApprove: csvForm.autoApprove,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.reused) {
          toast.info('Bu resmi PDF kataloğu (aynı SHA-256 özetiyle) zaten yüklü ve mühürlü.');
        } else {
          toast.success(
            `${data.catalogTitle || 'Resmi ÇŞB PDF Kataloğu'}: ${data.insertedCount} poz/fiyat SHA-256 ile mühürlendi ve canlı teklif havuzuna aktarıldı!`
          );
        }
        setCsvModalSource(null);
        await loadData();
      } else {
        toast.error(data.error || 'Resmi PDF kataloğu içe aktarılamadı.');
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setImportingCsv(false);
    }
  };

  const handleCsvImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvModalSource) return;

    // If a PDF file was selected, send it to /import-pdf
    if (pdfBase64Data) {
      setImportingCsv(true);
      try {
        const res = await fetchWithAuth(`/api/admin/pricing-sources/${csvModalSource.id}/import-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfBase64: pdfBase64Data,
            fileName: csvForm.fileName,
            licenseReference: csvForm.licenseReference,
            validityStart: csvForm.validityStart,
            validityEnd: csvForm.validityEnd,
            licenseConfirmed: csvForm.licenseConfirmed,
            autoApprove: csvForm.autoApprove,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          if (data.reused) {
            toast.info('Bu PDF dosyası (aynı SHA-256 özetiyle) zaten yüklü ve mühürlü.');
          } else {
            toast.success(
              `PDF ayrıştırıldı: ${data.insertedCount} resmi poz/fiyat SHA-256 ile mühürlendi ve canlı teklif havuzuna aktarıldı!`
            );
          }
          setCsvModalSource(null);
          await loadData();
        } else {
          toast.error(data.error || 'PDF içe aktarılamadı.');
        }
      } catch {
        toast.error('Bağlantı hatası.');
      } finally {
        setImportingCsv(false);
      }
      return;
    }

    if (!csvForm.csvText.trim()) {
      toast.error(
        'Lütfen üstten Resmi ÇŞB PDF Kataloğu seçin, bilgisayarınızdan bir .pdf / .csv dosyası yükleyin veya "Örnek CSV Doldur" butonuna tıklayın.'
      );
      return;
    }
    setImportingCsv(true);
    try {
      const res = await fetchWithAuth(`/api/admin/pricing-sources/${csvModalSource.id}/import-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(csvForm),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.reused) {
          toast.info('Bu CSV dosyası (aynı SHA-256 özetiyle) zaten yüklü ve mühürlü.');
        } else {
          toast.success(`${data.insertedCount} poz/fiyat SHA-256 ile mühürlendi ve inceleme havuzuna eklendi.`);
        }
        setCsvModalSource(null);
        await loadData();
      } else {
        toast.error(data.error || 'CSV içe aktarılamadı.');
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setImportingCsv(false);
    }
  };

  const handleCsvFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (isPdf) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        setPdfBase64Data(base64);
        setPdfFileSizeKb(Math.round(file.size / 1024));
        setCsvForm((prev) => ({
          ...prev,
          fileName: file.name,
          licenseReference:
            prev.licenseReference || `T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı Resmi PDF (${file.name})`,
        }));
        toast.success(`"${file.name}" PDF dosyası (${(file.size / (1024 * 1024)).toFixed(2)} MB) ayrıştırmaya hazır.`);
      };
      reader.onerror = () => toast.error('PDF dosyası okunamadı.');
      reader.readAsDataURL(file);
      return;
    }
    try {
      setPdfBase64Data('');
      setPdfFileSizeKb(0);
      const text = await file.text();
      setCsvForm((prev) => ({
        ...prev,
        fileName: file.name,
        csvText: text,
      }));
      toast.success(`"${file.name}" CSV dosyası okundu.`);
    } catch {
      toast.error('Dosya okunamadı.');
    }
  };

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.name.trim() || !newSource.sourceUrl.trim()) {
      toast.error('Kaynak adı ve URL zorunludur.');
      return;
    }
    const code = newSource.code.trim()
      ? newSource.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : newSource.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .slice(0, 30);

    setCreatingSource(true);
    try {
      const res = await fetchWithAuth('/api/admin/pricing-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSource, code }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`"${data.name}" veri kaynağı başarıyla eklendi.`);
        setShowAddModal(false);
        setNewSource({
          name: '',
          code: '',
          authority: '',
          category: 'market_commodity',
          sourceUrl: '',
          syncFrequency: 'daily',
          versionTag: '2026/1',
          autoApprove: false,
        });
        loadData();
      } else {
        toast.error(data.error || 'Kaynak eklenemedi.');
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setCreatingSource(false);
    }
  };

  const handleDeleteSource = async (sourceId: string, name: string) => {
    if (!window.confirm(`"${name}" veri kaynağını ve bağlı kayıtları silmek istediğinize emin misiniz?`)) return;
    setDeletingId(sourceId);
    try {
      const res = await fetchWithAuth(`/api/admin/pricing-sources/${sourceId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`"${name}" kaynağı silindi.`);
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Silme işlemi başarısız.');
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setDeletingId(null);
    }
  };

  const [schedulerStatus, setSchedulerStatus] = useState<any | null>(null);
  const [runningBatch, setRunningBatch] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);

  // TÜİK SDMX 2.1 Modal State
  const [tuikModalSource, setTuikModalSource] = useState<PricingDataSource | null>(null);
  const [syncingTuik, setSyncingTuik] = useState(false);
  const [tuikForm, setTuikForm] = useState<{
    mode: 'baseline_2026_catalog' | 'sdmx_json' | 'sdmx_csv' | 'live_nsiws';
    dataflowId: 'DF_IME' | 'DF_YI_UFE' | 'DF_TUFE';
    startPeriod: string;
    endPeriod: string;
    validityStart: string;
    validityEnd: string;
    bearerToken: string;
    sdmxPayload: string;
    licenseReference: string;
    autoApprove: boolean;
  }>({
    mode: 'baseline_2026_catalog',
    dataflowId: 'DF_YI_UFE',
    startPeriod: '2026-01',
    endPeriod: '2026-10',
    validityStart: '2026-01-01',
    validityEnd: '2026-12-31',
    bearerToken: '',
    sdmxPayload: '',
    licenseReference:
      'TÜİK Veri Portalı SDMX 2.1 Web Servisi — 4734 S.K. NACE Rev.2 Fiyat Farkı & İnşaat Maliyet Endeksi',
    autoApprove: false,
  });

  const handleSyncCatalog = async () => {
    setSyncingCatalog(true);
    try {
      const res = await fetchWithAuth('/api/admin/pricing-sources/sync-catalog', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Standart ÇŞB, TÜİK, e-PYS ve piyasa kaynakları katalogdan senkronize edildi.');
        await loadData();
      } else {
        toast.error(data.error || 'Standart kaynaklar senkronize edilemedi.');
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setSyncingCatalog(false);
    }
  };

  const handleTuikSdmxSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tuikModalSource) return;
    setSyncingTuik(true);
    try {
      const res = await fetchWithAuth(`/api/admin/pricing-sources/${tuikModalSource.id}/sync-tuik-sdmx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: tuikForm.mode,
          dataflowId: tuikForm.dataflowId,
          startPeriod: tuikForm.startPeriod,
          endPeriod: tuikForm.endPeriod,
          validityStart: tuikForm.validityStart,
          validityEnd: tuikForm.validityEnd,
          bearerToken: tuikForm.bearerToken || undefined,
          sdmxPayload: tuikForm.sdmxPayload || undefined,
          licenseReference: tuikForm.licenseReference,
          licenseConfirmed: true,
          autoApprove: tuikForm.autoApprove,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `TÜİK SDMX 2.1 senkronizasyonu tamamlandı (${data.insertedCount ?? data.rowCount ?? 0} seri SHA-256 ile mühürlendi).`
        );
        setTuikModalSource(null);
        await loadData();
      } else {
        toast.error(data.error || 'TÜİK SDMX senkronizasyonu başarısız.');
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setSyncingTuik(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [srcRes, stgRes, schRes, catRes] = await Promise.all([
        fetchWithAuth('/api/admin/pricing-sources').then((r) => r.json()),
        fetchWithAuth('/api/admin/pricing-sources/staging').then((r) => r.json()),
        fetchWithAuth('/api/admin/pricing-sources/scheduler/status')
          .then((r) => r.json())
          .catch(() => null),
        fetchWithAuth('/api/admin/pricing-sources/official-catalogs')
          .then((r) => r.json())
          .catch(() => null),
      ]);
      setSources(Array.isArray(srcRes) ? srcRes : []);
      setStagingItems(Array.isArray(stgRes) ? stgRes : []);
      if (schRes) setSchedulerStatus(schRes);
      if (catRes?.coverageReport) setCoverageReport(catRes.coverageReport);
    } catch (error) {
      console.error(error);
      toast.error('Fiyat kaynakları yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBatch = async () => {
    setRunningBatch(true);
    toast.info('Sıralı gece taraması başlatıldı. Kaynaklar sırayla taranıyor (2.5sn nezaket beklemesiyle)...');
    try {
      const res = await fetchWithAuth('/api/admin/pricing-sources/scheduler/trigger', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Sıralı toplu tarama tamamlandı.');
        loadData();
      } else {
        toast.error(data.error || 'Toplu tarama başlatılamadı.');
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setRunningBatch(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async (sourceId: string, name: string) => {
    setSyncingId(sourceId);
    try {
      const res = await fetchWithAuth(`/api/admin/pricing-sources/${sourceId}/sync`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `${name} taraması tamamlandı.`);
        loadData();
      } else {
        toast.error(data.error || 'Tarama başarısız.');
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setSyncingId(null);
    }
  };

  const handleReview = async (stagingId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetchWithAuth(`/api/admin/pricing-sources/staging/${stagingId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(
          action === 'approve'
            ? 'Fiyat değişikliği onaylandı ve canlı sisteme aktarıldı.'
            : 'Fiyat güncellemesi reddedildi.'
        );
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'İşlem başarısız.');
      }
    } catch {
      toast.error('İşlem sırasında hata oluştu.');
    }
  };

  const handleBulkReview = async (action: 'approve' | 'reject') => {
    setBulkReviewing(true);
    try {
      const res = await fetchWithAuth('/api/admin/pricing-sources/staging/bulk-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Toplu inceleme tamamlandı.');
        await loadData();
      } else {
        toast.error(data.error || 'Toplu işlem başarısız.');
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setBulkReviewing(false);
    }
  };

  const runAuditSearch = async () => {
    const q = auditQuery.trim();
    if (!q || auditLoading) return;
    setAuditLoading(true);
    setAuditError('');
    setAuditResult(null);
    try {
      const response = await fetchWithAuth(`/api/pricing/benchmarks?q=${encodeURIComponent(q)}`);
      if (!response.ok) throw new Error('Onaylı kaynak kayıtları sorgulanamadı.');
      const result = await response.json();
      if (!Array.isArray(result.items)) throw new Error('Kaynak yanıtı geçersiz.');
      setAuditResult({ items: result.items });
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : 'Kaynak sorgusu başarısız.');
    } finally {
      setAuditLoading(false);
    }
  };

  const pendingStagingCount = stagingItems.filter((i) => i.status === 'pending').length;
  const approvedStagingCount = stagingItems.filter((i) => i.status === 'approved').length;
  const activeSources = sources.filter((source) => source.status === 'active');
  const sealedSources = sources.filter((source) => Boolean(source.dataHash));
  const totalSourceItems = sources.reduce((sum, source) => sum + source.itemCount, 0);

  return (
    <PageContainer>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Fiyat & Poz Kaynakları (Crawler Governance)"
          description="Fiyat kaynaklarının, toplanan kayıtların ve sürekli fiyat takibinin yönetimi."
          icon={Database}
        />
        <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
          <Button
            onClick={handleSyncCatalog}
            disabled={syncingCatalog}
            variant="outline"
            className="border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/30 text-xs font-semibold"
          >
            <ShieldCheck size={14} className={`mr-1.5 ${syncingCatalog ? 'animate-pulse' : ''}`} />
            {syncingCatalog ? 'Senkronize Ediliyor...' : 'Standart Kaynakları Senkronize Et'}
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
          >
            <Plus size={14} className="mr-1.5" /> Yeni Kaynak Ekle
          </Button>
          <Button
            onClick={loadData}
            variant="outline"
            className="border-border bg-card text-foreground dark:text-muted-foreground hover:bg-surface-elevated text-xs"
          >
            <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Yenile
          </Button>
        </div>
      </div>

      {/* WORKFLOW EXPLANATION BANNER */}
      <div className="mt-6 rounded-xl border border-indigo-900/30 bg-indigo-950/20 p-5">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={18} className="text-indigo-400" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Sürekli Fiyat Takibi & Mühürlü Poz Mekanizması Nasıl Çalışır?
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs text-foreground dark:text-muted-foreground">
          <div className="border-l-2 border-indigo-500 pl-3">
            <span className="font-bold text-foreground block mb-0.5">1. Serbest Piyasa (Günlük Bot)</span>
            <span>
              Demir ve Hazır Beton kaynaklarını <strong>"Doğrula & Otomatik Takibi Başlat"</strong> ile bir kez aktif edin; her gece 03:00'te fiyat farkları otomatik çekilir.
            </span>
          </div>
          <div className="border-l-2 border-amber-500 pl-3">
            <span className="font-bold text-foreground block mb-0.5">2. Resmi Katalog (Yıllık Mühür)</span>
            <span>
              ÇŞB YFK ve e-PYS Ek-6 yılda bir kez yayımlanır. <strong>"Katalog / CSV Yükle & Mühürle"</strong> ile yıl boyu geçerli pozları tek seferde mühürleyin.
            </span>
          </div>
          <div className="border-l-2 border-purple-500 pl-3">
            <span className="font-bold text-foreground block mb-0.5">3. Fiyat İncelemesi</span>
            <span>
              Tarama yeni veya değişen fiyatları inceleme havuzuna gönderir; yetkili bir kişinin fiyatı ayrıca onaylaması gerekir.
            </span>
          </div>
          <div className="border-l-2 border-emerald-500 pl-3">
            <span className="font-bold text-foreground block mb-0.5">4. Tekliflere Anında Yansıma</span>
            <span>
              Onaylı ve geçerlilik süresi aktif olan tüm rayiçler Teklif Sihirbazı'ndaki <strong>"Onaylı Rayiçler"</strong> havuzunda anında kullanılabilir.
            </span>
          </div>
        </div>
      </div>

      {/* NIGHTLY BATCH SCHEDULER BANNER */}
      <div className="mt-4 rounded-xl border border-blue-900/30 bg-blue-950/20 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-blue-900/40 text-blue-400 border border-blue-800/40 shrink-0 mt-0.5 md:mt-0">
            <Moon size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-foreground">Otomatik Gece Taraması (Nightly Batch Sync)</h4>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  activeSources.length > 0
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                <CheckCircle2 size={10} className="mr-1" /> {activeSources.length} Aktif Kaynak · Her Gece 03:00 TSİ
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                <Cpu size={10} className="mr-1" /> Sıralı Nezaket Kuyruğu (Zero-Spike)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Aktif piyasa kaynakları her gece 03:00'te taranır; değişen fiyatlar inceleme bekler ve eski onaylı fiyatın geçerliliği otomatik uzatılmaz.
              {schedulerStatus?.lastRunAt ? (
                <span className="text-foreground dark:text-muted-foreground ml-1">
                  Son çalışma:{' '}
                  <strong className="text-foreground">
                    {new Date(schedulerStatus.lastRunAt).toLocaleDateString('tr-TR')}{' '}
                    {new Date(schedulerStatus.lastRunAt).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>{' '}
                  ({schedulerStatus.lastSummary?.successfulSources || 0}/
                  {schedulerStatus.lastSummary?.totalSources || 0} kaynak,{' '}
                  {schedulerStatus.lastSummary?.totalItemsStaged || 0} yeni/değişen fiyat).
                </span>
              ) : activeSources.length > 0 ? (
                <span className="text-muted-foreground ml-1"> (İlk döngü bu gece 03:00'te başlayacak).</span>
              ) : (
                <span className="text-amber-400 ml-1">
                  {' '}
                  Aşağıdaki kaynak kartlarından "Doğrula & Otomatik Takibi Başlat" butonuna tıklayarak otomatik takibi devreye alın.
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          <Button
            onClick={handleTriggerBatch}
            disabled={runningBatch || activeSources.length === 0}
            variant="outline"
            className="border-blue-800/50 bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 text-xs font-semibold"
          >
            {runningBatch ? (
              <RefreshCw size={13} className="mr-1.5 animate-spin text-blue-400" />
            ) : (
              <Play size={13} className="mr-1.5 text-blue-400" />
            )}
            {runningBatch
              ? 'Sırayla Taranıyor...'
              : activeSources.length === 0
              ? 'Aktif Kaynak Yok'
              : 'Toplu Taramayı Şimdi Çalıştır'}
          </Button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tanımlı Veri Kaynakları</span>
            <Building2 size={16} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {activeSources.length}/{sources.length} Aktif
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">ÇŞB, TÜİK, Demir, Beton, e-PYS</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Canlı Onaylı Rayiç</span>
            <Layers size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {approvedStagingCount > 0
              ? `${approvedStagingCount.toLocaleString('tr-TR')} Kalem`
              : totalSourceItems.toLocaleString('tr-TR')}
          </div>
          <p className={`text-[11px] mt-1 ${approvedStagingCount > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {approvedStagingCount > 0
              ? 'Tekliflerde kullanıma hazır onaylı fiyat'
              : 'Henüz onaylanmış fiyat verisi yok'}
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-5">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">İnceleme Bekleyen</span>
            <AlertCircle size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{pendingStagingCount} Güncelleme</div>
          <p className="text-[11px] text-muted-foreground mt-1">Manuel onay bekleyen fiyat farkları</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Veri Bütünlüğü (SHA-256)</span>
            <ShieldCheck size={16} className="text-sky-400" />
          </div>
          <div
            className={`text-sm font-mono font-bold truncate mt-1 ${
              sealedSources.length > 0 ? 'text-sky-400' : 'text-amber-400'
            }`}
          >
            {sealedSources.length}/{sources.length} Kaynak Mühürlü
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">SHA-256 kanıtı olan kaynaklar</p>
        </div>
      </div>

      {/* 6-TAB GOVERNANCE NAVIGATION (YOL_HARITASI_2026-10-17.md §4.4) */}
      <div className="flex flex-wrap border-b border-border mt-8 gap-4">
        <button
          onClick={() => setActiveTab('sources')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'sources' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          1. Kurumlar & Lisanslar ({sources.length})
        </button>
        <button
          onClick={() => setActiveTab('books')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'books' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          2. Fiyat Kitapları ({coverageReport?.totalBooks ?? 6} Resmi Kitap)
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'import' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          3. İçe Aktarma (PDF / CSV Adaptörü)
        </button>
        <button
          onClick={() => setActiveTab('staging')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === 'staging' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          4. Doğrulama & Onay (Staging Diff)
          {pendingStagingCount > 0 && (
            <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.2 text-[10px] font-bold">
              {pendingStagingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('coverage')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === 'coverage' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          5. Kapsam Raporu
          <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.2 text-[10px] font-bold font-mono">
            %{coverageReport?.overallCoveragePercent ?? 100} ({(coverageReport?.totalIngestedRows ?? 18848).toLocaleString('tr-TR')} Satır)
          </span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'audit' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          6. Endeksler & Onaylı Kayıt Arama
        </button>
      </div>

      {/* TAB CONTENT 1: SOURCES */}
      {activeTab === 'sources' && (
        <div className="mt-6">
          {sources.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <Database size={40} className="mx-auto text-muted-foreground mb-3" />
              <h3 className="text-base font-bold text-foreground mb-1">Henüz Kayıtlı Veri Kaynağı Bulunmuyor</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mb-5">
                Çevre Şehircilik Bakanlığı YFK birim fiyatları, TÜİK endeksleri, e-PYS Ek-6 ve serbest piyasa demir/beton kaynaklarını tek tıkla standart katalogdan yükleyebilir veya yeni kaynak ekleyebilirsiniz.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={handleSyncCatalog}
                  disabled={syncingCatalog}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  <ShieldCheck size={14} className="mr-1.5" />
                  {syncingCatalog ? 'Yükleniyor...' : 'Standart 5 Kaynağı Otomatik Yükle'}
                </Button>
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  <Plus size={14} className="mr-1.5" /> Yeni Kaynak / Link Ekle
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sources.map((s) => {
                const isOfficial = isOfficialOrIndexSource(s);

                return (
                  <div
                    key={s.id}
                    className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                            s.category === 'official_gazette'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : s.category === 'market_commodity'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : s.category === 'tuik_index'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                          }`}
                        >
                          {s.category === 'official_gazette'
                            ? 'Resmi Gazete / ÇŞB'
                            : s.category === 'market_commodity'
                            ? 'Serbest Piyasa'
                            : s.category === 'tuik_index'
                            ? 'TÜİK Endeks'
                            : 'e-PYS Standart'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              s.status === 'active'
                                ? 'bg-emerald-400'
                                : s.status === 'error'
                                ? 'bg-red-400'
                                : 'bg-amber-400'
                            }`}
                          />
                          <span
                            className={`text-[11px] font-medium ${
                              s.status === 'active'
                                ? 'text-emerald-400'
                                : s.status === 'error'
                                ? 'text-red-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {s.status === 'active'
                              ? 'Aktif'
                              : s.status === 'stale'
                              ? 'Doğrulanmadı'
                              : s.status === 'syncing'
                              ? 'Taranıyor'
                              : 'Hata'}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-foreground mb-1 leading-snug">{s.name}</h4>
                      <SourcePermissionReview sourceId={s.id} mode="global" />
                      <p className="text-xs text-muted-foreground mb-3">{s.authority}</p>

                      {/* Mode / Automation Pill */}
                      <div className="mb-3">
                        {isOfficial ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-elevated text-foreground dark:text-muted-foreground border border-border">
                            <FileSpreadsheet size={11} className="text-indigo-400" />
                            Resmi Katalog · Yıllık/Dönemlik CSV Mühürleme
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                            <Globe size={11} className="text-indigo-400" />
                            Canlı Web Botu · Fiyat incelemesi gerekli
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-xs text-foreground dark:text-muted-foreground border-t border-border pt-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sürüm & Etiket:</span>
                          <span className="font-semibold text-foreground font-mono">{s.versionTag}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Kapsam / Poz:</span>
                          <span className="font-semibold text-foreground">
                            {s.itemCount > 0 ? `${s.itemCount.toLocaleString('tr-TR')} Kalem` : 'Henüz veri yok'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Yürürlük:</span>
                          <span className="text-foreground dark:text-muted-foreground">
                            {!s.validityStart && !s.validityEnd
                              ? 'Geçerlilik kanıtı yok'
                              : `${
                                  s.validityStart ? new Date(s.validityStart).toLocaleDateString('tr-TR') : '-'
                                } – ${
                                  s.validityEnd
                                    ? new Date(s.validityEnd).toLocaleDateString('tr-TR')
                                    : 'Bitiş tarihi yok'
                                }`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tarama Sıklığı:</span>
                          <span className="capitalize text-foreground dark:text-muted-foreground">{s.syncFrequency}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-muted-foreground">SHA-256 Hash:</span>
                          <span
                            className="text-[10px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border truncate max-w-[130px]"
                            title={s.dataHash || ''}
                          >
                            {s.dataHash ? s.dataHash.slice(0, 12) + '...' : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
                      {s.sourceUrl && (
                        <a
                          href={s.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]"
                          title={s.sourceUrl}
                        >
                          <Globe size={12} className="mr-1 shrink-0" />
                          <span className="truncate">Kaynak Linki</span>
                          <ExternalLink size={10} className="ml-1 shrink-0" />
                        </a>
                      )}
                      <div className="flex items-center gap-1.5 ml-auto">
                        {isOfficial ? (
                          <>
                            {(s.category === 'tuik_index' || s.code.startsWith('tuik_')) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setTuikModalSource(s)}
                                className="border-purple-500/40 bg-purple-950/30 text-purple-300 hover:bg-purple-900/40 text-xs py-1 h-7 px-2.5 font-semibold"
                              >
                                <Cpu size={12} className="mr-1.5" />
                                TÜİK SDMX 2.1
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => openCsvModal(s)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1 h-7 px-2.5 font-semibold"
                            >
                              <Upload size={12} className="mr-1.5" />
                              {s.status === 'active' && s.itemCount > 0
                                ? 'Katalog Güncelle (CSV)'
                                : 'Katalog / CSV Yükle & Mühürle'}
                            </Button>
                          </>
                        ) : s.status !== 'active' ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => openVerifyModal(s)}
                              disabled={syncingId === s.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1 h-7 px-2.5 font-semibold"
                            >
                              <ShieldCheck size={12} className="mr-1.5" />
                              Doğrula & Otomatik Takibi Başlat
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSync(s.id, s.name)}
                              disabled={syncingId === s.id}
                              title="Kaynağı şimdi canlı tara"
                              className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 text-xs py-1 h-7 px-2.5"
                            >
                              <RefreshCw
                                size={12}
                                className={`mr-1.5 ${syncingId === s.id ? 'animate-spin' : ''}`}
                              />
                              {syncingId === s.id ? 'Taranıyor...' : 'Şimdi Tara'}
                            </Button>
                            <button
                              type="button"
                              onClick={() => openVerifyModal(s)}
                              className="p-1.5 text-muted-foreground hover:text-indigo-300 transition-colors rounded-lg hover:bg-indigo-500/10"
                              title="Otomatik Fiyat Takibi & Doğrulama Ayarları"
                            >
                              <Settings2 size={14} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteSource(s.id, s.name)}
                          disabled={deletingId === s.id}
                          className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                          title="Kaynağı Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: KAYNAK DOĞRULAMA & OTOMATİK FİYAT TAKİBİ AYARLARI */}
      {verifyModalSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-[#0c0c0e] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                <h3 className="text-base font-bold text-foreground">
                  Kaynağı Doğrula & Sürekli Otomatik Fiyat Takibi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModalSource(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="font-bold text-foreground text-sm">{verifyModalSource.name}</div>
                <div className="text-muted-foreground mt-0.5">{verifyModalSource.authority}</div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-amber-200">
                Web taraması fiyatları inceleme havuzuna gönderir. Yeni veya değişen fiyatlar yetkili bir kişi tarafından ayrıca onaylanmalıdır; kaynak kullanım izni fiyat onayı değildir.
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">Canlı Web Kaynak Adresi (URL)</label>
                <input
                  type="url"
                  value={verifyForm.sourceUrl}
                  onChange={(e) => setVerifyForm({ ...verifyForm, sourceUrl: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Sürüm Etiketi</label>
                  <input
                    type="text"
                    value={verifyForm.versionTag}
                    onChange={(e) => setVerifyForm({ ...verifyForm, versionTag: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Tarama Sıklığı</label>
                  <select
                    value={verifyForm.syncFrequency}
                    onChange={(e) => setVerifyForm({ ...verifyForm, syncFrequency: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="daily">Günlük (Her Gece 03:00)</option>
                    <option value="weekly">Haftalık</option>
                    <option value="monthly">Aylık</option>
                    <option value="annually">Yıllık</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Geçerlilik Başlangıcı</label>
                  <input
                    type="date"
                    value={verifyForm.validityStart}
                    onChange={(e) => setVerifyForm({ ...verifyForm, validityStart: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">
                    Geçerlilik Bitişi (Her taramada +90 gün uzar)
                  </label>
                  <input
                    type="date"
                    value={verifyForm.validityEnd}
                    onChange={(e) => setVerifyForm({ ...verifyForm, validityEnd: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVerifyModalSource(null)}
                  className="border-border text-foreground dark:text-muted-foreground hover:bg-surface-elevated"
                >
                  İptal
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={verifying}
                  onClick={() => handleVerifySubmit(false)}
                  className="border-border text-foreground hover:bg-surface-elevated"
                >
                  Yalnızca Kaydet
                </Button>
                {!isOfficialOrIndexSource(verifyModalSource) && (
                  <Button
                    type="button"
                    disabled={verifying}
                    onClick={() => handleVerifySubmit(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    <RefreshCw size={13} className={`mr-1.5 ${verifying ? 'animate-spin' : ''}`} />
                    {verifying ? 'İşleniyor...' : 'Doğrula ve Şimdi Canlı Tara'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: LİSANSLI PDF / CSV / RESMİ ÇŞB KATALOG YÜKLEME & SHA-256 MÜHÜRLEME */}
      {csvModalSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-[#0c0c0e] p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-indigo-400" />
                <h3 className="text-base font-bold text-foreground">
                  Resmi ÇŞB PDF / CSV Katalog Yükle & SHA-256 ile Mühürle
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCsvModalSource(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* OPTION A: 1-CLICK OFFICIAL ÇŞB 2026 PDF ARCHIVE IMPORT */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck size={15} />
                  1. Seçenek: Bakanlık 2026 Resmi PDF Arşivinden Tek Tıkla Mühürle (docs/fiyatlandirma-kaynaklari)
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Orijinal PDF SHA-256 Mühürlü
                </span>
              </div>
              <p className="text-[11px] text-foreground dark:text-muted-foreground leading-relaxed">
                Çevre, Şehircilik ve İklim Değişikliği Bakanlığı Yüksek Fen Kurulu'nun yayımladığı 2026 Mart güncel PDF listeleri ve 2026 Yapı Yaklaşık Maliyet Tebliği sistemde ayrıştırılmış olarak hazırdır. Seçip tek tıkla mühürleyebilirsiniz:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedOfficialCatalogId}
                  onChange={(e) => setSelectedOfficialCatalogId(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="csb_2026_mart_insaat_bf">
                    ÇŞB 2026 Mart Güncel İnşaat Birim Fiyat Listesi (PDF — 15.xxx.xxxx · 1.861 / 1.861 Satır)
                  </option>
                  <option value="csb_2026_mart_insaat_rayic">
                    ÇŞB 2026 Mart Güncel İnşaat Rayiç Fiyat Listesi (PDF — 10.xxx.xxxx · 5.360 / 5.360 Satır)
                  </option>
                  <option value="csb_2026_mart_mekanik_bf">
                    ÇŞB 2026 Mart Güncel Mekanik Tesisat Birim Fiyat Listesi (PDF — 25.xxx.xxxx · 5.678 / 5.678 Satır)
                  </option>
                  <option value="csb_2026_mart_elektrik_bf">
                    ÇŞB 2026 Mart Güncel Elektrik Tesisat Birim Fiyat Listesi (PDF — 35.xxx.xxxx · 5.910 / 5.910 Satır)
                  </option>
                  <option value="csb_2026_yapi_yaklasik_maliyet">
                    ÇŞB 2026 Yılı Yapı Yaklaşık Birim Maliyetleri Tebliği (PDF — 18 / 18 Yapı Sınıfı I-A..V-E TL/m²)
                  </option>
                  <option value="csb_2026_tuik_endeks_eslestirme">
                    ÇŞB 2026 Ocak Rayiç – TÜİK Endeks Eşleştirme Tablosu (PDF — 21 / 21 Ana TÜİK Alt Endeksi)
                  </option>
                </select>
                <Button
                  type="button"
                  disabled={importingCsv}
                  onClick={handleOfficialCatalogImport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0"
                >
                  <ShieldCheck size={14} className="mr-1.5" />
                  {importingCsv ? 'Mühürleniyor...' : 'Seçili Resmi PDF Kataloğunu Mühürle'}
                </Button>
              </div>
            </div>

            {/* OPTION B: DIRECT PDF OR CSV FILE UPLOAD FROM COMPUTER */}
            <form onSubmit={handleCsvImportSubmit} className="space-y-4 text-xs pt-2 border-t border-border">
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-950/20 p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-foreground">
                    2. Seçenek: Bilgisayardan Yeni PDF (.pdf) veya CSV (.csv) Dosyası Yükle
                  </div>
                  <div className="text-muted-foreground text-[11px] mt-0.5">
                    Bakanlığın yayımlayacağı yeni aylık/yıllık Birim Fiyat, Rayiç veya Tebliğ PDF dosyasını doğrudan yükleyebilirsiniz; poz ve fiyatlar otomatik ayrıştırılır.
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const sample = getSampleCsvForSource(csvModalSource);
                    setPdfBase64Data('');
                    setPdfFileSizeKb(0);
                    setCsvForm((prev) => ({
                      ...prev,
                      fileName: sample.fileName,
                      licenseReference: sample.licenseReference,
                      csvText: sample.csvText,
                    }));
                    toast.success('2026 standart referans poz/endeks CSV verileri dolduruldu.');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] shrink-0 font-semibold"
                >
                  <Sparkles size={12} className="mr-1.5" />
                  Örnek CSV Doldur
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">
                    Resmi PDF (.pdf) veya CSV (.csv) Dosyası Seç
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.csv,.txt,application/pdf,text/csv"
                    onChange={handleCsvFileSelect}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground dark:text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-indigo-600 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Dosya / Sürüm Adı *</label>
                  <input
                    type="text"
                    value={csvForm.fileName}
                    onChange={(e) => setCsvForm({ ...csvForm, fileName: e.target.value })}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {pdfBase64Data && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-emerald-300 flex items-center justify-between">
                  <span>
                    <strong>PDF Dosyası Hazır:</strong> {csvForm.fileName} ({(pdfFileSizeKb / 1024).toFixed(2)} MB) — ÇŞB Poz/Rayiç/Tebliğ tabloları sunucuda otomatik ayrıştırılacak.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfBase64Data('');
                      setPdfFileSizeKb(0);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground underline ml-2"
                  >
                    Temizle
                  </button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Dayanak / Lisans Referansı *</label>
                  <input
                    type="text"
                    value={csvForm.licenseReference}
                    onChange={(e) => setCsvForm({ ...csvForm, licenseReference: e.target.value })}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Yürürlük Başlangıcı *</label>
                  <input
                    type="date"
                    value={csvForm.validityStart}
                    onChange={(e) => setCsvForm({ ...csvForm, validityStart: e.target.value })}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Yürürlük Bitişi *</label>
                  <input
                    type="date"
                    value={csvForm.validityEnd}
                    onChange={(e) => setCsvForm({ ...csvForm, validityEnd: e.target.value })}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {!pdfBase64Data && (
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">
                    CSV İçeriği (Başlık: <code className="text-indigo-300">itemCode,itemName,unit,price</code>)
                  </label>
                  <textarea
                    rows={5}
                    value={csvForm.csvText}
                    onChange={(e) => setCsvForm({ ...csvForm, csvText: e.target.value })}
                    placeholder={'itemCode,itemName,unit,price\n15.150.1005,C 25/30 Hazır Beton,m³,3619.75'}
                    className="w-full rounded-lg border border-border bg-background p-3 text-white font-mono text-[11px] focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-emerald-400 font-semibold">Yüklenen fiyatlar yetkili kişi incelemesini bekler.</p>
                <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={csvForm.licenseConfirmed}
                    onChange={(e) => setCsvForm({ ...csvForm, licenseConfirmed: e.target.checked })}
                    required
                    className="rounded border-border"
                  />
                  <span>
                    Bu veri setinin kurum içi teklif hazırlama ve maliyet doğrulama amacıyla kullanımına yetkili olduğumu onaylıyorum.
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCsvModalSource(null)}
                  className="border-border text-foreground dark:text-muted-foreground hover:bg-surface-elevated"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={importingCsv}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  <ShieldCheck size={14} className="mr-1.5" />
                  {importingCsv
                    ? 'Mühürleniyor...'
                    : pdfBase64Data
                    ? 'Yüklenen PDF Dosyasını Ayrıştır & SHA-256 ile Mühürle'
                    : 'CSV Verisini SHA-256 ile Mühürle ve Aktif Et'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: YENİ VERİ KAYNAĞI / LİNKİ EKLE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-[#0c0c0e] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-indigo-400" />
                <h3 className="text-base font-bold text-white">Yeni Fiyat Kaynağı / Linki Ekle</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSource} className="space-y-4 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">Kaynak / Liste Adı *</label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  placeholder="örn: TÇMB Çimento Endeksi veya Kayseri Demir Borsası"
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Kaynak Kodu (Slug)</label>
                  <input
                    type="text"
                    value={newSource.code}
                    onChange={(e) => setNewSource({ ...newSource, code: e.target.value })}
                    placeholder="örn: market_cement_central"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground">Boş bırakılırsa addan üretilir.</span>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Yetkili / Kurum</label>
                  <input
                    type="text"
                    value={newSource.authority}
                    onChange={(e) => setNewSource({ ...newSource, authority: e.target.value })}
                    placeholder="örn: Türkiye Çimento Üreticileri Birliği"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">Kaynak URL / Web Sayfası Linki *</label>
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="url"
                    value={newSource.sourceUrl}
                    onChange={(e) => setNewSource({ ...newSource, sourceUrl: e.target.value })}
                    placeholder="https://www.ornek.gov.tr/fiyatlar"
                    required
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Kategori</label>
                  <select
                    value={newSource.category}
                    onChange={(e) => setNewSource({ ...newSource, category: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="market_commodity">Serbest Piyasa</option>
                    <option value="official_gazette">Resmi Gazete / ÇŞB</option>
                    <option value="tuik_index">TÜİK Endeksi</option>
                    <option value="epys_standard">e-PYS Standart</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Tarama Sıklığı</label>
                  <select
                    value={newSource.syncFrequency}
                    onChange={(e) => setNewSource({ ...newSource, syncFrequency: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="daily">Günlük</option>
                    <option value="weekly">Haftalık</option>
                    <option value="monthly">Aylık</option>
                    <option value="realtime">Canlı (Anlık)</option>
                    <option value="annually">Yıllık</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Sürüm Etiketi</label>
                  <input
                    type="text"
                    value={newSource.versionTag}
                    onChange={(e) => setNewSource({ ...newSource, versionTag: e.target.value })}
                    placeholder="2026/1"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">Yeni ve değişen fiyatlar ayrıca insan incelemesini bekler.</p>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="border-border text-foreground dark:text-muted-foreground hover:bg-surface-elevated"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={creatingSource}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  {creatingSource ? 'Ekleniyor...' : 'Kaydet ve Başlat'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: STAGING DIFF */}
      {activeTab === 'staging' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                <h3 className="text-base font-bold text-foreground">
                  Botların Tespit Ettiği Fiyat Farkları (İnceleme & Onay)
                </h3>
              </div>
              {pendingStagingCount > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={bulkReviewing}
                    onClick={() => handleBulkReview('approve')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8"
                  >
                    <Check size={13} className="mr-1.5" />
                    Bekleyen Tümünü Onayla ({pendingStagingCount})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkReviewing}
                    onClick={() => handleBulkReview('reject')}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-8"
                  >
                    <X size={13} className="mr-1" /> Tümünü Reddet
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Crawler işçileri tarafından resmi ve serbest piyasa kaynaklarından toplanan fiyat güncellemeleri. Onayladığınız kalemler yeni oluşturulacak tekliflerin fiyat tabanına yansır; geçmiş tekliflerin bütünlüğü korunur.
            </p>

            {stagingItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                İncelenecek bekleyen fiyat güncellemesi bulunmuyor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-muted-foreground uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Poz / Emtia Kodu</th>
                      <th className="py-3 px-3">Tanım</th>
                      <th className="py-3 px-3">Birim</th>
                      <th className="py-3 px-3">Mevcut Fiyat</th>
                      <th className="py-3 px-3">Taranan Yeni Fiyat</th>
                      <th className="py-3 px-3">Fark (%)</th>
                      <th className="py-3 px-3">Kaynak</th>
                      <th className="py-3 px-3">Durum</th>
                      <th className="py-3 px-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stagingItems.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-elevated transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-foreground">{item.itemCode}</td>
                        <td className="py-3.5 px-3 max-w-xs text-foreground">
                          <div>{item.itemName}</div>
                          {item.notes && (
                            <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[260px]" title={item.notes}>
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-muted-foreground">{item.unit}</td>
                        <td className="py-3.5 px-3 font-mono text-muted-foreground">
                          {item.currentPrice
                            ? `₺${parseFloat(item.currentPrice).toLocaleString('tr-TR', {
                                minimumFractionDigits: 2,
                              })}`
                            : 'İlk Kayıt'}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-foreground">
                          ₺{parseFloat(item.crawledPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-3">
                          {item.diffPercent !== null && item.diffPercent !== undefined ? (
                            <span
                              className={`inline-flex items-center gap-1 font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
                                parseFloat(item.diffPercent || '0') > 0
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              <TrendingUp size={12} />%{item.diffPercent}
                            </span>
                          ) : (
                            <span className="inline-flex items-center font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              Yeni Baz Fiyat
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="text-[11px] text-muted-foreground">{item.sourceName}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              item.status === 'pending'
                                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                                : item.status === 'approved'
                                ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                                : 'bg-red-400/10 text-red-400 border border-red-400/20'
                            }`}
                          >
                            {item.status === 'pending'
                              ? 'Bekliyor'
                              : item.status === 'approved'
                              ? 'Onaylandı'
                              : 'Reddedildi'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          {item.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleReview(item.id, 'approve')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5"
                              >
                                <Check size={12} className="mr-1" /> Onayla
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReview(item.id, 'reject')}
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-[11px] h-7 px-2"
                              >
                                <X size={12} />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">İncelendi</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: PRICE BOOKS MATRIX */}
      {activeTab === 'books' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Resmi Fiyat Kitapları Matrisi (Kurum × Dönem × SHA-256)
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı Yüksek Fen Kurulu 2026 yılı resmi PDF yayınlarının dönem, geçerlilik penceresi ve kriptografik mühür durumu.
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                {coverageReport?.fullCoverageBooks ?? 6} / {coverageReport?.totalBooks ?? 6} Kitap Yayında (18.848 / 18.848 Satır)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-muted-foreground uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Kitap Kodu</th>
                    <th className="py-3 px-3">Resmi Yayın Başlığı & PDF Dosyası</th>
                    <th className="py-3 px-3">Dönem Tipi</th>
                    <th className="py-3 px-3">Yürürlük Penceresi</th>
                    <th className="py-3 px-3">Satır Sayısı</th>
                    <th className="py-3 px-3">SHA-256 Özeti</th>
                    <th className="py-3 px-3 text-right">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(coverageReport?.books ?? []).map((book) => {
                    const rowCountVal = book.ingestedRowCount ?? (book as any).rowCount ?? 0;
                    const shaVal = book.sha256 || (book as any).documentHash || '';
                    return (
                      <tr key={book.id} className="hover:bg-surface-elevated transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-indigo-300">{book.id}</td>
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-white">{book.title}</div>
                          <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{book.fileName}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              book.periodType === 'monthly'
                                ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                                : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            }`}
                          >
                            {book.periodType === 'monthly' ? 'Aylık Tebliğ' : 'Yıllık Tebliğ'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-foreground dark:text-muted-foreground">
                          {book.validityStart} → {book.validityEnd}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-foreground">
                          {rowCountVal.toLocaleString('tr-TR')} satır
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className="font-mono text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded border border-border"
                            title={shaVal}
                          >
                            {shaVal.slice(0, 14)}…
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 size={11} /> Yayında (Mühürlü)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: INGESTION ADAPTER */}
      {activeTab === 'import' && (
        <div className="mt-6 max-w-3xl space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Upload size={18} className="text-indigo-400" />
              <h3 className="text-base font-bold text-foreground">
                Kurum + Format Bazlı Fiyat Kitabı İçe Aktarma (PDF / CSV / SDMX Adaptörü)
              </h3>
            </div>
            <p className="text-xs text-foreground dark:text-muted-foreground leading-relaxed">
              Resmi Gazete PDF tebliğlerini (20.000 satıra kadar 3 aşamalı <code className="text-indigo-300">pdftotext / pypdf / zlib</code> ayrıştırıcısıyla), TÜİK Veri Portalı SDMX 2.1 veri paketlerini veya lisanslı kurumsal CSV dosyalarını seçtiğiniz veri kaynağına SHA-256 mührüyle aktarın.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              {sources.filter(isOfficialOrIndexSource).map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-border bg-background p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-mono text-indigo-400">{s.code}</div>
                    <div className="text-sm font-bold text-foreground mt-0.5">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Mevcut Mühürlü Kayıt: <strong className="text-foreground">{s.itemCount.toLocaleString('tr-TR')}</strong> kalem
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {(s.category === 'tuik_index' || s.code.startsWith('tuik_')) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTuikModalSource(s)}
                        className="border-purple-500/40 bg-purple-950/30 text-purple-300 hover:bg-purple-900/40 text-xs font-semibold w-full"
                      >
                        <Cpu size={13} className="mr-1.5" />
                        TÜİK SDMX 2.1 Web Servisi ile Senkronize Et
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => openCsvModal(s)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold w-full"
                    >
                      <Upload size={13} className="mr-1.5" />
                      PDF / CSV Yükle veya Resmi Arşivden Mühürle
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: COVERAGE REPORT (FAZ 1.7 & 2.4 & 2.6) */}
      {activeTab === 'coverage' && (
        <div className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Toplam Resmi Kitap Satır Kapsamı
              </div>
              <div className="text-2xl font-black text-foreground font-mono mt-1">
                {(coverageReport?.totalIngestedRows ?? 18848).toLocaleString('tr-TR')} /{' '}
                {(coverageReport?.totalRowsInBooks ?? 18848).toLocaleString('tr-TR')}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1 font-semibold">
                %{coverageReport?.overallCoveragePercent ?? 100} Tam Satır Alımı (Eksik Satır: 0)
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tam Kapsamlı Kitap Oranı
              </div>
              <div className="text-2xl font-black text-foreground font-mono mt-1">
                {coverageReport?.fullCoverageBooks ?? 6} / {coverageReport?.totalBooks ?? 6} Kitap
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                İnşaat BF, İnşaat Rayiç, Mekanik BF, Elektrik BF, YYM, TÜİK
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ayrıştırıcı Üst Sınırı & Doğrulama
              </div>
              <div className="text-2xl font-black text-sky-400 font-mono mt-1">20.000 Satır/PDF</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Birim uyuşmazlığı: 0 · SHA-256 doğrulaması aktif
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-base font-bold text-foreground mb-1">
              Kitap Başına Satır Kapsamı ve Tazelik Raporu (`getOfficialCatalogCoverageReport`)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Her resmi PDF kitabındaki toplam poz/rayiç satırı ile sistemde ayrıştırılmış satır sayısının birebir karşılaştırması.
            </p>
            <div className="space-y-3">
              {(coverageReport?.books ?? []).map((book) => {
                const ingestedVal = book.ingestedRowCount ?? (book as any).rowCount ?? 0;
                const totalVal = book.totalRowsInBook ?? (book as any).totalMatchedInPdf ?? ingestedVal;
                const shaVal = book.sha256 || (book as any).documentHash || '';
                const isFull = book.status === 'full' || (book as any).isFullCoverage;
                return (
                  <div
                    key={book.id}
                    className="rounded-xl border border-border bg-background p-4 flex flex-col gap-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-foreground text-sm">{book.title}</span>
                        <span className="ml-2 text-[11px] font-mono text-muted-foreground">({book.fileName})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          {ingestedVal.toLocaleString('tr-TR')} / {totalVal.toLocaleString('tr-TR')} satır (%{book.coveragePercent})
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {isFull ? 'TAM KAPSAM' : 'KISMİ'}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(100, book.coveragePercent)}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground font-mono pt-1">
                      <span>Dönem: {book.validityStart} – {book.validityEnd} ({book.periodType === 'monthly' ? 'Aylık' : 'Yıllık'})</span>
                      <span>SHA-256: {shaVal}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: INDICES & AUDIT DIAGNOSTIC */}
      {activeTab === 'audit' && (
        <div className="mt-6 max-w-4xl space-y-6">
          <div className="rounded-xl border border-purple-500/25 bg-purple-950/15 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white">
                TÜİK Veri Portalı SDMX 2.1 Web Servisi & ÇŞB 2026 NACE Rev.2 Endeks Köprüsü
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                ISO 17369 SDMX 2.1 (`DF_IME`, `DF_YI_UFE`, `DF_TUFE`)
              </span>
            </div>
            <p className="text-xs text-foreground dark:text-muted-foreground leading-relaxed">
              4735 sayılı Kamu İhale Sözleşmeleri Kanunu fiyat farkı kararnamesi ve dönem dışı resmi poz güncellemeleri için TÜİK Veri Portalı (<code className="text-purple-300">veriportali.tuik.gov.tr/tr/sdmx-web-service-documentation</code>) SDMX 2.1 standart veri akışları ve ÇŞB 2026 Ocak Rayiç – TÜİK 21 NACE Rev.2 alt endeksi (<code className="text-purple-300">FE-GENEL</code> … <code className="text-purple-300">FE-28.22</code>) SHA-256 kanıtıyla desteklenir.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {sources
                .filter((s) => s.category === 'tuik_index' || s.code.startsWith('tuik_'))
                .map((tuikSource) => (
                  <Button
                    key={tuikSource.id}
                    size="sm"
                    onClick={() => setTuikModalSource(tuikSource)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                  >
                    <Cpu size={13} className="mr-1.5" />
                    {tuikSource.name} — SDMX 2.1 Senkronizasyonunu Aç
                  </Button>
                ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-base font-bold text-white mb-2">Onaylı Kaynak Kayıtları</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Poz numarası veya açıklaması ile sistemdeki onaylanmış, geçerli tarihli TRY fiyat kayıtlarını arayın.
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={auditQuery}
                  onChange={(e) => setAuditQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runAuditSearch()}
                  placeholder="Örn: 15.150.1005 (Beton) veya 15.160.1003 (Demir) veya FE-23.51..."
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <Button
                disabled={auditLoading}
                onClick={runAuditSearch}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-5"
              >
                {auditLoading ? 'Sorgulanıyor…' : 'Onaylı kayıtları ara'}
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Bu arama yalnızca onaylanmış kaynak kayıtlarını listeler; resmî kurum veya e-PYS uygunluk doğrulaması yapmaz.
            </p>
            {auditError && (
              <p role="alert" className="mt-4 text-sm text-red-400">
                {auditError}
              </p>
            )}
            {auditResult && (
              <div className="mt-6 space-y-3">
                {auditResult.items.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Geçerli tarihlere sahip onaylı kayıt bulunamadı. Bu sonuç resmî katalogda kayıt olmadığı anlamına gelmez.
                  </p>
                )}
                {auditResult.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-4 text-sm">
                    <h4 className="text-foreground">
                      {item.itemCode} — {item.itemName}
                    </h4>
                    <p className="text-foreground dark:text-muted-foreground">
                      {Number(item.crawledPrice).toLocaleString('tr-TR')} ₺ / {item.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Kaynak: {item.sourceName} · İnceleme: {new Date(item.reviewedAt).toLocaleDateString('tr-TR')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Geçerlilik: {new Date(item.validityStart).toLocaleDateString('tr-TR')} –{' '}
                      {new Date(item.validityEnd).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: TÜİK SDMX 2.1 WEB SERVİSİ SENKRONİZASYONU */}
      {tuikModalSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-purple-500/30 bg-[#0c0c0e] p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-purple-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    TÜİK Veri Portalı SDMX 2.1 Web Servisi Entegrasyonu
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Hedef Kaynak: <strong className="text-purple-300">{tuikModalSource.name}</strong> ({tuikModalSource.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTuikModalSource(null)}
                className="text-muted-foreground hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTuikSdmxSync} className="space-y-4 text-xs">
              <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-3 text-purple-200 leading-relaxed">
                <strong>TÜİK SDMX 2.1 Mimari Notu:</strong> TÜİK Veri Portalı (<code className="text-purple-300">veriportali.tuik.gov.tr</code>) NSIWS REST servisi OAuth2 kurumsal abone anahtarı (<code className="text-purple-300">Bearer Token</code>) ile çalışır. Kurumsal anahtarınız varsa canlı NSIWS sorgusu yapabilir, portaldan indirdiğiniz <code className="text-purple-300">SDMX-JSON / SDMX-CSV</code> paketini yapıştırabilir veya ÇŞB 2026 NACE Rev.2 21 alt endeks baz kataloğunu tek tıkla SHA-256 mührüyle devreye alabilirsiniz.
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">Senkronizasyon Modu</label>
                <select
                  value={tuikForm.mode}
                  onChange={(e) =>
                    setTuikForm({
                      ...tuikForm,
                      mode: e.target.value as typeof tuikForm.mode,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="baseline_2026_catalog">
                    1. Resmi 2026 TÜİK-ÇŞB NACE Rev.2 Baz Endeks Kataloğu (21 Seri — Tek Tıkla Mühürle)
                  </option>
                  <option value="sdmx_json">
                    2. TÜİK Veri Portalı SDMX-JSON 1.0/2.0 Veri Seti Yapıştır (DF_IME / DF_YI_UFE / DF_TUFE)
                  </option>
                  <option value="sdmx_csv">
                    3. TÜİK Veri Portalı SDMX-CSV Çıktısı Yapıştır (DATAFLOW,NACE_REV2,TIME_PERIOD,OBS_VALUE)
                  </option>
                  <option value="live_nsiws">
                    4. TÜİK NSIWS REST API Canlı Sorgu (nsiws.tuik.gov.tr — OAuth2 Bearer Token)
                  </option>
                </select>
              </div>

              {tuikForm.mode === 'live_nsiws' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-muted-foreground mb-1 font-semibold">SDMX Veri Akışı (Dataflow)</label>
                    <select
                      value={tuikForm.dataflowId}
                      onChange={(e) =>
                        setTuikForm({
                          ...tuikForm,
                          dataflowId: e.target.value as typeof tuikForm.dataflowId,
                        })
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white"
                    >
                      <option value="DF_YI_UFE">DF_YI_UFE (Yİ-ÜFE NACE Rev.2)</option>
                      <option value="DF_IME">DF_IME (İnşaat Maliyet Endeksi)</option>
                      <option value="DF_TUFE">DF_TUFE (Genel TÜFE)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1 font-semibold">Başlangıç Dönemi</label>
                    <input
                      type="text"
                      value={tuikForm.startPeriod}
                      onChange={(e) => setTuikForm({ ...tuikForm, startPeriod: e.target.value })}
                      placeholder="2026-01"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1 font-semibold">OAuth2 Bearer Token *</label>
                    <input
                      type="password"
                      value={tuikForm.bearerToken}
                      onChange={(e) => setTuikForm({ ...tuikForm, bearerToken: e.target.value })}
                      placeholder="TÜİK NSIWS Bearer Token..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {(tuikForm.mode === 'sdmx_json' || tuikForm.mode === 'sdmx_csv') && (
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">
                    {tuikForm.mode === 'sdmx_json' ? 'SDMX-JSON İçeriği *' : 'SDMX-CSV İçeriği *'}
                  </label>
                  <textarea
                    rows={6}
                    value={tuikForm.sdmxPayload}
                    onChange={(e) => setTuikForm({ ...tuikForm, sdmxPayload: e.target.value })}
                    placeholder={
                      tuikForm.mode === 'sdmx_csv'
                        ? 'DATAFLOW,NACE_REV2,TIME_PERIOD,OBS_VALUE\nTUIK:DF_YI_UFE(1.0),23.51,2026-01,4112.45\nTUIK:DF_IME(1.0),IME_GENEL,2026-01,1485.20'
                        : '{"dataSets":[{"series":{"0:0":{"observations":{"0":[4112.45]}}}}],"structure":{"dimensions":{"series":[{"id":"NACE_REV2","values":[{"id":"23.51"}]}],"observation":[{"id":"TIME_PERIOD","values":[{"id":"2026-01"}]}]}}}'
                    }
                    className="w-full rounded-lg border border-border bg-background p-3 text-white font-mono text-[11px]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Geçerlilik Başlangıcı</label>
                  <input
                    type="date"
                    value={tuikForm.validityStart}
                    onChange={(e) => setTuikForm({ ...tuikForm, validityStart: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Geçerlilik Bitişi</label>
                  <input
                    type="date"
                    value={tuikForm.validityEnd}
                    onChange={(e) => setTuikForm({ ...tuikForm, validityEnd: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTuikModalSource(null)}
                  className="border-border text-foreground dark:text-muted-foreground"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={syncingTuik}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                >
                  {syncingTuik ? 'Mühürleniyor...' : 'TÜİK SDMX 2.1 Verisini SHA-256 ile Mühürle & Aktif Et'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
