import { benchmarkQuoteItem } from '../services/pricing/benchmark-policy';
import { applyLineEdit, catalogQuoteItem, type CatalogSnapshot } from '@/lib/price-catalog-pick';
import { CompanyCatalogPicker } from '@/components/quote/CompanyCatalogPicker';
/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api';
import {
  Plus,
  Sparkles,
  Save,
  AlertTriangle,
  Box,
  Loader2,
  Building2,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Currency, QuoteStatus, QuoteItem, Client } from '@/types';
import { QuoteItemsTable } from '@/components/quote/QuoteItemsTable';
import { QuoteAiWizard } from '@/components/quote/QuoteAiWizard';
import { QuoteNextStepsBanner } from '@/components/quote/QuoteNextStepsBanner';
import { BenchmarkPanel, type BenchmarkData } from '@/components/quote/BenchmarkPanel';
import { QuoteGeneralSettings, QuoteSummaryCard } from '@/components/quote/QuoteSidebar';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionWrapper } from '@/components/layout/SectionWrapper';
import { applyIfcTransferredUnitPrices, buildIfcEstimateQuoteItems } from '@/ifc/quotation-transfer';
import { calculateLineItemTotal, calculateQuotationTotals } from '@/lib/calculations';
import { calculateQuotationFinancials } from '@/lib/financial-calculations';
import { parsePreBimQuoteDraft, PRE_BIM_DRAFT_STORAGE_KEY } from '@/lib/pre-bim-quote-draft';
import { parseQuoteCsv, buildQuoteCsvTemplate } from '@/lib/quote-excel-import';
import { isLegacyXls, LEGACY_XLS_MESSAGE, readFileHead } from '@/lib/spreadsheet-format';

export function CreateQuote() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const [editVersion, setEditVersion] = useState('');
  const [editError, setEditError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [editLoading, setEditLoading] = useState(Boolean(id));
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('residential');
  const [industries, setIndustries] = useState<any[]>([]);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [ifcTransferNotice, setIfcTransferNotice] = useState<{
    importedItems: number;
    skippedItems: number;
    evidenceElementCount?: number;
  } | null>(null);
  const [preBimNotice, setPreBimNotice] = useState<{
    itemCount: number;
    notes?: string;
  } | null>(null);
  const [excelImportNotice, setExcelImportNotice] = useState<{
    fileName: string;
    itemCount: number;
    warnings: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Dashboard "Excel metrajım var" opens this screen at the Excel import (marka.md M-12.1, M-11.4).
  const [searchParams] = useSearchParams();
  const startFromExcel = searchParams.get('kaynak') === 'excel';
  const excelImportRef = useRef<HTMLDivElement>(null);
  const startManually = searchParams.get('kaynak') === 'elle';
  useEffect(() => {
    if (!startManually) return;
    document.querySelector<HTMLInputElement>('[data-testid="quote-items-table"] input')?.focus();
  }, [startManually]);
  useEffect(() => {
    if (!startFromExcel) return;
    excelImportRef.current?.scrollIntoView({ block: 'center' });
    excelImportRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [startFromExcel]);
  const [importingFile, setImportingFile] = useState(false);

  const [formData, setFormData] = useState({
    clientId: searchParams.get('clientId') || '',
    projectName: '',
    quoteNumber: `TKF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: Currency.TRY,
    projectDurationMonths: 1,
    escalationVolatilityPercent: 0,
    procurementProfile: 'standard' as 'standard' | 'low_carbon' | 'high_carbon_risk',
    carbonRiskPremiumPercent: 0,
    informationDeliveryLevel: 'none' as 'none' | 'as_built' | 'cobie' | 'digital_twin',
    informationDeliveryCostPercent: 0,
    overheadProfitPercent: 0,
    notes: '',
  });

  const [items, setItems] = useState<Partial<QuoteItem>[]>([
    { id: crypto.randomUUID(), description: '', unit: 'm2', quantity: 0, unitPrice: 0, costUnitPrice: null, wastePercent: 0, costCategory: 'material', discountPercent: 0, vatPercent: 20, total: 0 }
  ]);

  const [benchmarksData, setBenchmarksData] = useState<BenchmarkData | null>(null);

  const applyCatalogItem = (snapshot: CatalogSnapshot) => {
    setItems((prev) => [...prev.filter((i) => i.description?.trim()), catalogQuoteItem(snapshot)]);
    toast.success(`"${snapshot.description}" firma kataloğundan eklendi. Miktarı girin.`);
  };

  const applyBenchmarkItem = (bm: any) => {
    const newItem: Partial<QuoteItem> = { id: crypto.randomUUID(), ...benchmarkQuoteItem(bm) };
    setItems((prev) => [...prev.filter((i) => i.description?.trim()), newItem]);
    toast.success(`"${bm.itemName}" onaylı kaynak fiyatıyla (${newItem.unitPrice!.toLocaleString('tr-TR')} ₺) teklife eklendi.`);
  };

  useEffect(() => {
    // Check if openBIM IFC parsed metraj data exists in sessionStorage
    const ifcData = id ? null : sessionStorage.getItem('teklifpro_ifc_extracted');
    if (ifcData) {
      try {
        const parsedTransfer = JSON.parse(ifcData);
        const summary = parsedTransfer && typeof parsedTransfer === 'object' ? parsedTransfer.summary : null;
        if (summary) {
          const transfer = buildIfcEstimateQuoteItems(summary, {
            includeDerivedEstimates: parsedTransfer.includeDerivedEstimates ?? true,
          });
          const unitPrices = parsedTransfer.unitPrices && typeof parsedTransfer.unitPrices === 'object'
            ? parsedTransfer.unitPrices
            : null;
          const importedItems = applyIfcTransferredUnitPrices(transfer.items, unitPrices).map((item) => ({
            ...item,
            total: calculateLineItemTotal(item),
          }));

          if (importedItems.length > 0) {
            setItems(importedItems);
            setFormData((current) => ({
              ...current,
              projectName: current.projectName || 'IFC Ön Analiz Teklifi',
              notes: current.notes || 'IFC browser ön analizinden aktarılan kalemler teknik review bekler; verified/kesin metraj değildir.',
            }));
            setIfcTransferNotice({
              importedItems: importedItems.length,
              skippedItems: transfer.skipped.length,
              evidenceElementCount: Number(parsedTransfer.evidenceElementCount) || undefined,
            });
            toast.warning(`IFC ön analizinden ${importedItems.length} tahmini kalem (beton, kalıp, donatı) aktarıldı; birim fiyatları onaylı kaynaktan doğrulayın.`);
          }
          if (transfer.skipped.length > 0) {
            toast.info(`${transfer.skipped.length} IFC türevi kalem kanıt eksikliği nedeniyle aktarılmadı.`);
          }
        }
      } catch (err) {
        console.error('Error importing IFC data:', err);
        toast.error('IFC aktarım verisi okunamadı; lütfen dosyayı tekrar aktarın.');
      } finally {
        sessionStorage.removeItem('teklifpro_ifc_extracted');
      }
    }

    // Check if pre-BIM feasibility draft exists in sessionStorage
    const preBimRaw = id ? null : sessionStorage.getItem(PRE_BIM_DRAFT_STORAGE_KEY);
    if (preBimRaw) {
      try {
        const draft = parsePreBimQuoteDraft(preBimRaw);
        if (draft && draft.items.length > 0) {
          const draftItems = draft.items.map((item) => ({
            ...item,
            total: calculateLineItemTotal(item),
          }));
          setItems(draftItems);
          setFormData((current) => ({
            ...current,
            projectName: draft.projectName || current.projectName,
            notes: draft.notes ? (current.notes ? `${current.notes}\n\n${draft.notes}` : draft.notes) : current.notes,
          }));
          setPreBimNotice({
            itemCount: draftItems.length,
            notes: draft.notes,
          });
          toast.success(`Ön teklif fizibilitesinden ${draftItems.length} kalem aktarıldı. Birim fiyatları ve KDV oranlarını kontrol edin.`);
        }
      } catch (err) {
        console.error('Error importing pre-BIM draft:', err);
        toast.error('Ön teklif taslak verisi okunamadı.');
      } finally {
        sessionStorage.removeItem(PRE_BIM_DRAFT_STORAGE_KEY);
      }
    }

    fetchWithAuth('/api/clients')
      .then(res => res.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetchWithAuth('/api/pricing/benchmarks')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.sourcesSummary) setBenchmarksData(data);
      })
      .catch(console.error);

    if (!id) fetchWithAuth('/api/company/risk-settings')
      .then(res => res.ok ? res.json() : null)
      .then((settings) => settings && setFormData((current) => ({
        ...current,
        escalationVolatilityPercent: settings.escalationVolatilityPercent,
        carbonRiskPremiumPercent: settings.carbonRiskPremiumPercent,
        informationDeliveryCostPercent: settings.informationDeliveryCostPercent,
      })))
      .catch(console.error);

    fetchWithAuth('/api/ai/industries')
      .then((res) => {
        const headerVal = res.headers?.get?.('x-ai-configured');
        if (headerVal === 'true') setAiConfigured(true);
        else if (headerVal === 'false') setAiConfigured(false);
        return res.json();
      })
      .then(async (rawIndustries) => {
        const allIndustries = Array.isArray(rawIndustries) ? rawIndustries : [];
        const settingsRes = await fetchWithAuth(`/api/company/industry-settings`);
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          const settingsList = Array.isArray(settingsData) ? settingsData : [];
          const filtered = allIndustries.filter((ind: any) => {
            const setting = settingsList.find((s: any) => s.industryId === ind.id);
            return setting ? setting.isEnabled : true;
          });
          setIndustries(filtered);
          if (!id) {
            setSelectedIndustry(current => filtered.some((ind: any) => ind.id === current) ? current : (filtered[0]?.id ?? ''));
          }
        } else {
          setIndustries(allIndustries);
          if (!id) {
            setSelectedIndustry(current => allIndustries.some((ind: any) => ind.id === current) ? current : (allIndustries[0]?.id ?? ''));
          }
        }
      })
      .catch(() => {
        setIndustries([]);
        if (!id) setSelectedIndustry('');
      });
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setEditLoading(true);
    setEditError('');
    fetchWithAuth(`/api/quotations/${id}/edit`).then(async res => {
      const quote = await res.json();
      if (!res.ok) throw new Error(quote.error || 'Teklif yüklenemedi.');
      if (cancelled) return;
      setFormData({
        clientId: quote.clientId, projectName: quote.projectName, quoteNumber: quote.quoteNumber,
        date: quote.date, expiryDate: quote.expiryDate, currency: quote.currency,
        projectDurationMonths: quote.projectDurationMonths, escalationVolatilityPercent: Number(quote.escalationVolatilityPercent),
        procurementProfile: quote.procurementProfile, carbonRiskPremiumPercent: Number(quote.carbonRiskPremiumPercent),
        informationDeliveryLevel: quote.informationDeliveryLevel, informationDeliveryCostPercent: Number(quote.informationDeliveryCostPercent),
        overheadProfitPercent: Number(quote.overheadProfitPercent ?? 0),
        notes: quote.notes ?? '',
      });
      setItems(quote.items);
      setSelectedIndustry(quote.industryId ?? '');
      setEditVersion(quote.updatedAt);
    }).catch(error => { if (!cancelled) setEditError(error instanceof Error ? error.message : 'Teklif yüklenemedi.'); })
      .finally(() => { if (!cancelled) setEditLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // Tek hesap kaynağı: sunucu, PDF ve ekran aynı yuvarlama kuralını kullanır.
  const calculateItemTotal = (item: Partial<QuoteItem>) => calculateLineItemTotal(item);

  const updateItem = (id: string, updates: Partial<QuoteItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const newItem = applyLineEdit(item, updates);
        if (item.priceSnapshotId && !newItem.priceSnapshotId) {
          toast.info('Satırın fiyat kataloğu bağlantısı kaldırıldı; fiyat artık elle girilmiş sayılır.');
        }
        newItem.total = calculateItemTotal(newItem);
        return newItem;
      }
      return item;
    }));
  };

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: '', unit: 'm2', quantity: 0, unitPrice: 0, costUnitPrice: null, wastePercent: 0, costCategory: 'material', discountPercent: 0, vatPercent: 20, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const handleQuoteFileImport = async (file: File | null) => {
    if (!file) return;
    if (isLegacyXls(file.name, await readFileHead(file))) {
      toast.error(LEGACY_XLS_MESSAGE, { duration: 12000 });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setImportingFile(true);
    try {
      const isXlsx = file.name.toLowerCase().endsWith('.xlsx');
      let result;
      if (isXlsx) {
        const { parseQuoteXlsx } = await import('@/lib/quote-xlsx');
        const buffer = await file.arrayBuffer();
        result = await parseQuoteXlsx(buffer, file.name);
      } else {
        const text = await file.text();
        result = parseQuoteCsv(text, file.name);
      }

      if (result.errors.length > 0) {
        toast.error(`Dosya okunamadı: ${result.errors.join('; ')}`);
        return;
      }

      if (result.items.length === 0) {
        toast.warning('Dosyada geçerli iş kalemi bulunamadı; sütun başlıklarını kontrol edin.');
        return;
      }

      setItems((prev) => {
        const hasOnlyEmptyInitial = prev.length === 1 && !prev[0]?.description?.trim();
        return hasOnlyEmptyInitial ? result.items : [...prev, ...result.items];
      });

      setExcelImportNotice({
        fileName: file.name,
        itemCount: result.items.length,
        warnings: result.warnings,
      });

      toast.success(`${file.name} dosyasından ${result.items.length} kalem aktarıldı.`);
    } catch (err) {
      console.error('Quote file import error:', err);
      toast.error('Dosya içe aktarılırken bir hata oluştu.');
    } finally {
      setImportingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadXlsxTemplate = async () => {
    try {
      const { buildQuoteXlsxTemplate, downloadXlsx } = await import('@/lib/spreadsheet-templates');
      downloadXlsx(await buildQuoteXlsxTemplate(), 'bimmetraj-teklif-sablonu.xlsx');
    } catch {
      toast.error('Excel şablonu hazırlanamadı. CSV şablonunu kullanabilirsiniz.');
    }
  };

  const handleDownloadCsvTemplate = () => {
    const csv = buildQuoteCsvTemplate();
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teklif-sablonu.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateWithAi = async () => {
    if (!description) {
      toast.error('Lütfen bir proje açıklaması girin.');
      return;
    }

    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetchWithAuth('/api/ai/generate-quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description, 
          industryId: selectedIndustry,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.lineItems) || data.lineItems.length === 0) {
        if (data?.code === 'AI_PROVIDER_NOT_CONFIGURED') {
          setAiConfigured(false);
        }
        toast.error(
          data?.error ||
            'AI servisi şu an yanıt vermedi; mevcut Excel/teklif kalemleriniz korundu.',
        );
        return;
      }
      setAiResult(data);
      
      const aiItems = data.lineItems;
      const formattedItems = aiItems.map((item: any) => {
        const baseItem: Partial<QuoteItem> = {
          id: crypto.randomUUID(),
          aiEvidenceToken: item.aiEvidenceToken,
          description: item.description,
          unit: item.unit || 'm2',
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          costUnitPrice: null,
          wastePercent: 0,
          costCategory: 'material',
          quantitySource: 'ai_estimate',
          priceSource: 'ai_estimate',
          sourceReference: 'AI teklif asistanı',
          verificationStatus: 'unverified',
          discountPercent: 0,
          vatPercent: 20,
        };
        return {
          ...baseItem,
          total: calculateItemTotal(baseItem)
        };
      });

      setItems((prev) => {
        const populated = prev.filter((i) => i.description?.trim());
        return populated.length > 0 ? [...populated, ...formattedItems] : formattedItems;
      });
      toast.success('AI Zekası ile kalemler ve risk analizi oluşturuldu!');
    } catch (error) {
      toast.error('AI ile kalem oluşturulamadı.');
    } finally {
      setAiLoading(false);
    }
  };

  const totals = calculateQuotationTotals(items, { overheadProfitPercent: formData.overheadProfitPercent });

  // Same calculation as the server profitability report, including risk premiums (L-4).
  const financials = calculateQuotationFinancials(items, {
    projectDurationMonths: formData.projectDurationMonths,
    escalationVolatilityPercent: formData.escalationVolatilityPercent,
    carbonRiskPremiumPercent: formData.carbonRiskPremiumPercent,
    informationDeliveryCostPercent: formData.informationDeliveryCostPercent,
    overheadProfitPercent: formData.overheadProfitPercent,
  });
  const costInputsComplete = items.length > 0 && financials.missingCostItemIndexes.length === 0;
  const estimatedMargin = costInputsComplete ? financials.margin : 0;

  const handleSave = async (status: QuoteStatus = QuoteStatus.DRAFT) => {
    if (id && (!editVersion || editLoading || editError)) return;
    if (!formData.clientId || !formData.projectName) {
      toast.error('Lütfen zorunlu alanları doldurun.');
      return;
    }

    setLoading(true);
    setSaveError('');
    try {
      const res = await fetchWithAuth(id ? `/api/quotations/${id}/edit` : '/api/quotations', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...totals,
          status: QuoteStatus.DRAFT,
          ...(id ? { updatedAt: editVersion } : {}),
          industryId: selectedIndustry || null,
          items: items.map(({ id, ...i }) => i)
        }),
      });

      if (res.ok) {
        const newQuote = await res.json();
        toast.success('Teklif başarıyla kaydedildi.');
        navigate(`/app/quotes/${newQuote.id}`);
      } else {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Teklif kaydedilemedi.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Teklif kaydedilemedi.';
      setSaveError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemoTemplate = () => {
    setFormData((current) => ({
      ...current,
      clientId: current.clientId || clients[0]?.id || '',
      projectName: 'Kadıköy Kentsel Dönüşüm & Mühendislik Projesi',
      quoteNumber: `TKF-${new Date().getFullYear()}-DEMO`,
      date: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: Currency.TRY,
      projectDurationMonths: 6,
      escalationVolatilityPercent: 2,
      procurementProfile: 'low_carbon',
      carbonRiskPremiumPercent: 3,
      informationDeliveryLevel: 'cobie',
      informationDeliveryCostPercent: 2,
      overheadProfitPercent: 0,
      notes: '6306 Sayılı Kentsel Dönüşüm Kanunu kapsamında TSE standartlı 1. sınıf malzeme ve ISO 19650 esaslı BIM teslim formatında hazırlanmış tekliftir.',
    }));

    const demoRows: Partial<QuoteItem>[] = [
      { id: crypto.randomUUID(), description: 'Zemin Etüdü ve Statik Rölöve Çalışması (AR/Mobil)', unit: 'adet', quantity: 1, unitPrice: 45000, costUnitPrice: 25000, wastePercent: 0, costCategory: 'labor', discountPercent: 0, vatPercent: 20 },
      { id: crypto.randomUUID(), description: 'C35/45 Hazır Beton Dökümü ve Donatı Bağlantısı', unit: 'm3', quantity: 450, unitPrice: 3800, costUnitPrice: 2900, wastePercent: 3, costCategory: 'material', discountPercent: 5, vatPercent: 20 },
      { id: crypto.randomUUID(), description: 'BIM BEP ve ISO 19650 Dijital İkiz Teslim Paketi', unit: 'paket', quantity: 1, unitPrice: 85000, costUnitPrice: 40000, wastePercent: 0, costCategory: 'subcontractor', discountPercent: 0, vatPercent: 20 },
    ];
    setItems(demoRows.map((row) => ({ ...row, total: calculateItemTotal(row) })));
    setDemoLoaded(true);
    toast.success("Kentsel Dönüşüm & Mühendislik Demo Şablonu (3 örnek iş kalemi) yüklendi!");
  };

  const populatedItems = items.filter((i) => i.description?.trim());
  const selectedClientObj = clients.find((c) => c.id === formData.clientId);
  const showNextStepsGuide = Boolean(
    excelImportNotice || demoLoaded || ifcTransferNotice || preBimNotice,
  );
  const nextStepsSourceLabel = excelImportNotice
    ? 'Excel / CSV İçe Aktarımı'
    : demoLoaded
      ? 'Demo Proje Şablonu'
      : ifcTransferNotice
        ? 'IFC Ön Metraj Aktarımı'
        : 'Ön Teklif Fizibilitesi';

  if (id && (editLoading || editError || !['owner', 'admin', 'manager'].includes(role ?? ''))) return (
    <PageContainer>
      <p role={editLoading ? 'status' : 'alert'}>{editLoading ? 'Teklif yükleniyor...' : editError || 'Düzenleme yetkiniz yok.'}</p>
      {!editLoading && <Button onClick={() => navigate(`/app/quotes/${id}`)}>Teklife dön</Button>}
    </PageContainer>
  );

  return (
    <PageContainer>
      <PageHeader 
        title={id ? 'Taslağı Düzenle' : 'Yeni Teklif Oluştur'}
        description={id ? formData.quoteNumber : 'Excel/CSV metraj cetveli, firma kataloğu, onaylı piyasa rayiçleri veya isteğe bağlı AI sihirbazı ile teklif hazırlayın.'}
        icon={Plus}
        backButton={{
          label: "Tekliflere Dön",
          onClick: () => navigate('/app/quotes')
        }}
        actions={
          <div className="flex flex-wrap gap-2.5">
            {!id && <>
            <Button
              type="button"
              variant="outline"
              disabled={importingFile}
              onClick={() => fileInputRef.current?.click()}
              className="border-primary/50 bg-primary/10 hover:bg-primary/20 text-foreground font-mono text-xs uppercase tracking-wider h-10 px-4 gap-2 shadow-none"
            >
              {importingFile ? <Loader2 size={14} className="animate-spin text-primary" /> : <FileSpreadsheet size={14} className="text-primary" />}
              Excel / CSV Yükle
            </Button>
            <Button
              variant="outline" 
              onClick={() => navigate('/app/smartcheck')}
              className="border-border bg-card hover:bg-muted text-foreground font-mono text-xs uppercase tracking-wider h-10 px-4 gap-2 shadow-none"
            >
              <Box size={14} className="text-muted-foreground" /> IFC Modelinden Kalem Al
            </Button>
            <Button 
              variant="outline" 
              onClick={handleLoadDemoTemplate}
              className="border-border bg-card hover:bg-muted text-foreground font-mono text-xs uppercase tracking-wider h-10 px-4 gap-2 shadow-none"
            >
              <Sparkles size={14} className="text-muted-foreground" /> Demo Şablon Yükle
            </Button></>}
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs uppercase tracking-wider h-10 px-6 gap-2 shadow-none" 
              onClick={() => handleSave()}
              disabled={loading}
            >
              <Save size={15} /> {loading ? 'Kaydediliyor...' : 'Taslağı Kaydet'}
            </Button>
          </div>
        }
      />
      {saveError && <div role="alert" className="mb-4 text-xs font-mono text-destructive">{saveError} {id && <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Yeniden yükle</Button>}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="min-w-0 lg:col-span-8 space-y-5">
          {/* AI Wizard Section */}
          {!id && (
            <QuoteAiWizard
              industries={industries}
              selectedIndustry={selectedIndustry}
              setSelectedIndustry={setSelectedIndustry}
              description={description}
              setDescription={setDescription}
              aiLoading={aiLoading}
              aiResult={aiResult}
              generateWithAi={generateWithAi}
              aiConfigured={aiConfigured}
              collapsedByDefault={startFromExcel || Boolean(excelImportNotice) || demoLoaded || aiConfigured !== true}
              existingItemCount={populatedItems.length}
            />
          )}

          {/* Line Items Table */}
          <SectionWrapper title="Teklif Kalemleri" description="Proje kapsamında sunacağınız iş kalemleri ve birim fiyatlar.">
            {showNextStepsGuide && (
              <QuoteNextStepsBanner
                sourceLabel={nextStepsSourceLabel}
                itemCount={populatedItems.length}
                hasValidClient={Boolean(selectedClientObj)}
                clientName={selectedClientObj?.name}
                hasProjectName={Boolean(formData.projectName.trim())}
                costInputsComplete={costInputsComplete}
                saving={loading}
                onSave={() => void handleSave()}
                onFocusClientSelect={() => {
                  const btn = document.getElementById('quick-inline-client-btn') || document.getElementById('quote-client');
                  btn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  btn?.focus();
                }}
              />
            )}
            {ifcTransferNotice && (
              <div className="mb-4 border border-border border-l-2 border-l-primary bg-card p-4 shadow-none">
                <div className="flex flex-col gap-2 text-xs md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                        IFC Ön Metraj Aktarımı · Teknik İnceleme Bekliyor
                      </p>
                      <p className="mt-1 leading-relaxed text-muted-foreground">
                        {ifcTransferNotice.importedItems} tahmini betonarme kalem teklife aktarıldı.
                        {ifcTransferNotice.skippedItems > 0 ? ` ${ifcTransferNotice.skippedItems} türev kalem kanıt eksikliği nedeniyle aktarılmadı.` : ''}
                        {ifcTransferNotice.evidenceElementCount ? ` ${ifcTransferNotice.evidenceElementCount} IFC özellik/QTO kanıtlı eleman bulundu.` : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit font-mono text-[10px] uppercase border-border text-muted-foreground">
                    Onay Bekliyor
                  </Badge>
                </div>
              </div>
            )}

            {preBimNotice && (
              <div className="mb-4 border border-border border-l-2 border-l-primary bg-card p-4 shadow-none">
                <div className="flex flex-col gap-2 text-xs md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                        Ön Teklif Fizibilitesinden Aktarıldı (Kat Karşılığı / Emsal)
                      </p>
                      <p className="mt-1 leading-relaxed text-muted-foreground">
                        {preBimNotice.itemCount} kalem teklif taslağına aktarıldı. İmar durumu belgesi ve proje mimarının değerleri esastır; birim fiyat ve KDV oranlarını kontrol edin.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit font-mono text-[10px] uppercase border-border text-muted-foreground">
                    Ön Taslak
                  </Badge>
                </div>
              </div>
            )}

            {excelImportNotice && (
              <div className="mb-4 border border-border border-l-2 border-l-primary bg-card p-4 shadow-none">
                <div className="flex flex-col gap-2 text-xs md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                        Excel / CSV İçe Aktarımı Tamamlandı
                      </p>
                      <p className="mt-1 leading-relaxed text-muted-foreground">
                        <strong>{excelImportNotice.fileName}</strong> dosyasından {excelImportNotice.itemCount} iş kalemi teklife eklendi.
                        {excelImportNotice.warnings.length > 0 && ` (${excelImportNotice.warnings.length} adet uyarı / bilgi notu)`}
                      </p>
                      {excelImportNotice.warnings.length > 0 && (
                        <ul className="mt-1.5 list-disc pl-4 text-[11px] font-mono text-muted-foreground space-y-0.5">
                          {excelImportNotice.warnings.slice(0, 3).map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                          {excelImportNotice.warnings.length > 3 && (
                            <li>...ve {excelImportNotice.warnings.length - 3} uyarı daha</li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit font-mono text-[10px] uppercase border-border text-muted-foreground">
                    İçe Aktarıldı
                  </Badge>
                </div>
              </div>
            )}

            {/* COMPACT CATALOG & BENCHMARK PICKER BARS ABOVE TABLE */}
            <CompanyCatalogPicker currency={formData.currency} onPick={applyCatalogItem} />
            {benchmarksData && <BenchmarkPanel data={benchmarksData} onApply={applyBenchmarkItem} mode="compact-picker" />}

            <Card className="bg-card border border-border shadow-none overflow-hidden">
              <CardContent className="p-0">
                <div
                  ref={excelImportRef}
                  data-testid="quote-excel-import"
                  className={`p-3 border-b border-border flex flex-wrap items-center justify-between gap-2 px-4 ${startFromExcel ? 'bg-primary/10 ring-2 ring-primary/40' : 'bg-muted/20'}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {startFromExcel && (
                      <p className="w-full text-xs text-foreground">
                        Excel metrajınızı yükleyin. Şablonu indirip doldurabilir veya kendi dosyanızı (başlıklarında açıklama ve miktar olan) doğrudan seçebilirsiniz.
                      </p>
                    )}
                    <input
                      ref={fileInputRef}
                      id="quote-file-upload"
                      aria-label="Excel veya CSV teklif dosyası yükle"
                      type="file"
                      accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="sr-only"
                      onChange={(e) => void handleQuoteFileImport(e.target.files?.[0] ?? null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={importingFile}
                      onClick={() => fileInputRef.current?.click()}
                      className="font-mono text-xs h-8 px-3 gap-1.5 border-primary/50 bg-primary/10 hover:bg-primary/20 text-foreground font-semibold shadow-none"
                    >
                      {importingFile ? <Loader2 size={13} className="animate-spin text-primary" /> : <FileSpreadsheet size={13} className="text-primary" />}
                      Excel / CSV'den Kalem Aktar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleDownloadXlsxTemplate()}
                      className="font-mono text-xs h-8 px-3 gap-1.5 border-border bg-background hover:bg-card text-foreground shadow-none"
                    >
                      <Download size={13} /> Excel Şablonu İndir (.xlsx)
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleDownloadCsvTemplate}
                      className="text-muted-foreground hover:text-foreground font-mono text-[11px] h-8 px-2.5 gap-1"
                    >
                      CSV şablonu
                    </Button>
                  </div>
                  <Button variant="ghost" onClick={addItem} className="text-primary hover:bg-primary/10 font-mono text-xs h-8 px-4 gap-1.5">
                    <Plus size={14} /> Yeni Kalem Ekle
                  </Button>
                </div>
                <QuoteItemsTable items={items} currency={formData.currency} onUpdate={updateItem} onRemove={removeItem} />
                <div className="px-4 py-2.5 border-t border-border bg-muted/10 flex items-center justify-end">
                  <Button variant="ghost" onClick={addItem} className="text-primary hover:bg-primary/10 font-mono text-xs h-8 px-4 gap-1.5">
                    <Plus size={14} /> Yeni Kalem Ekle
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* PRICE VALIDITY & DISCLAIMER NOTICE BELOW TABLE (Option C) */}
            {benchmarksData && <BenchmarkPanel data={benchmarksData} onApply={applyBenchmarkItem} mode="sources-notice" />}
          </SectionWrapper>
        </div>

        {/* Sidebar Controls */}
        <div className="min-w-0 lg:col-span-4 space-y-6">
          <QuoteGeneralSettings
            formData={formData}
            setFormData={setFormData}
            clients={clients}
            onClientCreated={(created) => setClients((prev) => [created, ...prev])}
          />
          <QuoteSummaryCard
            totals={totals}
            currency={formData.currency}
            overheadProfitPercent={formData.overheadProfitPercent}
            costInputsComplete={costInputsComplete}
            estimatedMargin={estimatedMargin}
          />
        </div>
      </div>
    </PageContainer>
  );
}
