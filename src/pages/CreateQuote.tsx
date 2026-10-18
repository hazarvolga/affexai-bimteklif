import { benchmarkQuoteItem } from '../services/pricing/benchmark-policy';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Save, 
  ArrowLeft, 
  Calculator,
  AlertTriangle,
  AlertCircle,
  FileText,
  TrendingUp,
  ChevronLeft,
  Settings,
  ShieldCheck,
  Zap,
  DollarSign,
  Users,
  Box,
  Loader2,
  Info,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Currency, QuoteStatus, QuoteItem, Client } from '@/types';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionWrapper } from '@/components/layout/SectionWrapper';
import { applyIfcTransferredUnitPrices, buildIfcEstimateQuoteItems } from '@/ifc/quotation-transfer';
import { calculateLineItemTotal, calculateQuotationTotals } from '@/lib/calculations';
import { calculateQuotationFinancials } from '@/lib/financial-calculations';
import { parsePreBimQuoteDraft, PRE_BIM_DRAFT_STORAGE_KEY } from '@/lib/pre-bim-quote-draft';
import { parseQuoteCsv, parseQuoteXlsx, buildQuoteCsvTemplate } from '@/lib/quote-excel-import';

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
  const [importingFile, setImportingFile] = useState(false);

  const [formData, setFormData] = useState({
    clientId: '',
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
    notes: '',
  });

  const [items, setItems] = useState<Partial<QuoteItem>[]>([
    { id: crypto.randomUUID(), description: '', unit: 'm2', quantity: 0, unitPrice: 0, costUnitPrice: null, wastePercent: 0, costCategory: 'material', discountPercent: 0, vatPercent: 20, total: 0 }
  ]);

  const [benchmarksData, setBenchmarksData] = useState<{
    sourcesSummary: Array<{ name: string; code: string; lastSyncAt: string; versionTag: string; validityRange: string; status: string }>;
    disclaimer: string;
    items: Array<{
      id: string;
      itemCode: string;
      itemName: string;
      unit: string;
      currentPrice: string | null;
      crawledPrice: string;
      diffPercent: string | null;
      sourceName: string;
      notes: string;
      crawledAt: string;
    }>;
  } | null>(null);
  const [showBenchmarkDrawer, setShowBenchmarkDrawer] = useState(false);

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
      .then(res => res.json())
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
        } else {
          setIndustries(allIndustries);
        }
      })
      .catch(() => setIndustries([]));
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
        const newItem = { ...item, ...updates };
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
    setImportingFile(true);
    try {
      const isXlsx = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
      let result;
      if (isXlsx) {
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
      const data = await res.json();
      setAiResult(data);
      
      const aiItems = Array.isArray(data?.lineItems) ? data.lineItems : [];
      const formattedItems = aiItems.map((item: any) => {
        const baseItem: Partial<QuoteItem> = {
          id: crypto.randomUUID(),
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

      setItems(formattedItems);
      toast.success('AI Zekası ile kalemler ve risk analizi oluşturuldu!');
    } catch (error) {
      toast.error('AI ile kalem oluşturulamadı.');
    } finally {
      setAiLoading(false);
    }
  };

  const totals = calculateQuotationTotals(items);

  // Same calculation as the server profitability report, including risk premiums (L-4).
  const financials = calculateQuotationFinancials(items, {
    projectDurationMonths: formData.projectDurationMonths,
    escalationVolatilityPercent: formData.escalationVolatilityPercent,
    carbonRiskPremiumPercent: formData.carbonRiskPremiumPercent,
    informationDeliveryCostPercent: formData.informationDeliveryCostPercent,
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
    setFormData({
      clientId: clients[0]?.id || 'demo-client-id',
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
      notes: '6306 Sayılı Kentsel Dönüşüm Kanunu kapsamında TSE standartlı 1. sınıf malzeme ve ISO 19650 esaslı BIM teslim formatında hazırlanmış tekliftir.',
    });

    const demoRows: Partial<QuoteItem>[] = [
      { id: crypto.randomUUID(), description: 'Zemin Etüdü ve Statik Rölöve Çalışması (AR/Mobil)', unit: 'adet', quantity: 1, unitPrice: 45000, costUnitPrice: 25000, wastePercent: 0, costCategory: 'labor', discountPercent: 0, vatPercent: 20 },
      { id: crypto.randomUUID(), description: 'C35/45 Hazır Beton Dökümü ve Donatı Bağlantısı', unit: 'm3', quantity: 450, unitPrice: 3800, costUnitPrice: 2900, wastePercent: 3, costCategory: 'material', discountPercent: 5, vatPercent: 20 },
      { id: crypto.randomUUID(), description: 'BIM BEP ve ISO 19650 Dijital İkiz Teslim Paketi', unit: 'paket', quantity: 1, unitPrice: 85000, costUnitPrice: 40000, wastePercent: 0, costCategory: 'subcontractor', discountPercent: 0, vatPercent: 20 },
    ];
    setItems(demoRows.map((row) => ({ ...row, total: calculateItemTotal(row) })));
    toast.success("Kentsel Dönüşüm & Mühendislik Demo Şablonu Yüklendi!");
  };

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
        description={id ? formData.quoteNumber : 'AI destekli kalem sihirbazı ile saniyeler içinde profesyonel teklifler hazırlayın.'}
        icon={Plus}
        backButton={{
          label: "Tekliflere Dön",
          onClick: () => navigate('/app/quotes')
        }}
        actions={
          <div className="flex flex-wrap gap-2.5">
            {!id && <>
            <Button
              variant="outline" 
              onClick={() => navigate('/app/smartcheck')}
              className="border-border bg-card hover:bg-muted text-foreground font-mono text-xs uppercase tracking-wider h-10 px-4 gap-2 shadow-none"
            >
              <ShieldCheck size={14} className="text-muted-foreground" /> SmartCheck & e-PYS
            </Button>
            <Button
              variant="outline" 
              onClick={() => navigate('/app/ifc-parser')}
              className="border-border bg-card hover:bg-muted text-foreground font-mono text-xs uppercase tracking-wider h-10 px-4 gap-2 shadow-none"
            >
              <Box size={14} className="text-muted-foreground" /> 5D IFC Metraj Yükle
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
        <div className="min-w-0 lg:col-span-8 space-y-8">
          {/* AI Wizard Section */}
          {!id && <Card className="border border-border bg-card shadow-none">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-foreground flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold">
                <Sparkles size={14} className="text-primary" />
                AI Teklif Sihirbazı
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-48 shrink-0">
                  <Label htmlFor="quote-industry" className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Sektör</Label>
                  <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                    <SelectTrigger id="quote-industry" className="bg-background border-border text-foreground h-11 text-xs">
                      <SelectValue placeholder="Sektör" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {industries.map(ind => (
                        <SelectItem key={ind.id} value={ind.id} className="text-xs font-medium">{ind.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="quote-description" className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Proje Detayları</Label>
                  <div className="flex gap-2">
                    <Input
                      id="quote-description"
                      placeholder="Proje tipini anlatın... (Örn: 200m2 villa kaba inşaat)"
                      className="bg-background border-border focus:border-primary text-foreground h-11 text-xs"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && generateWithAi()}
                    />
                    <Button 
                      onClick={generateWithAi} 
                      disabled={aiLoading}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 font-mono text-xs uppercase tracking-wider h-11 px-6 shadow-none"
                    >
                      {aiLoading ? <Loader2 className="animate-spin" size={16} /> : 'Oluştur'}
                    </Button>
                  </div>
                </div>
              </div>

              {aiResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top duration-300">
                  <div className="bg-muted/20 p-4 border border-border">
                    <p className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Zap size={12} className="text-primary" /> AI Kalem Varsayımları
                    </p>
                    <p className="mb-3 border border-border bg-card px-2.5 py-1.5 text-[11px] font-mono text-muted-foreground leading-relaxed">
                      AI çıktısı doğrulanmış metraj veya maliyet kaynağı değildir. Miktarı, satış fiyatını ve gerçek maliyeti kontrol edin.
                    </p>
                    <ul className="space-y-1.5">
                      {aiResult.assumptions?.map((a: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" /> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-muted/20 p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-primary" /> Risk Analizi
                      </p>
                      <Badge variant="outline" className="text-[10px] font-mono tracking-wider px-2 py-0.5 uppercase border-border text-foreground">
                        {aiResult.riskLevel === 'high' ? 'YÜKSEK RİSK' : aiResult.riskLevel === 'medium' ? 'ORTA RİSK' : 'DÜŞÜK RİSK'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {aiResult.riskFlags?.map((f: string, i: number) => (
                        <span key={i} className="text-[10px] font-mono bg-card px-2 py-1 border border-border text-muted-foreground uppercase">
                          #{f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {!aiResult && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Info size={13} className="text-primary shrink-0" />
                  <p className="text-[11px] font-mono">
                    Birim fiyatlar piyasa verilerine göre AI asistanı tarafından hesaplanır.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>}

          {/* Line Items Table */}
          <SectionWrapper title="Teklif Kalemleri" description="Proje kapsamında sunacağınız iş kalemleri ve birim fiyatlar.">
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

            {/* PRICE VALIDITY & DISCLAIMER BANNER */}
            {benchmarksData && (
              <div className="mb-4 border border-border bg-card p-4 shadow-none">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Info size={15} className="text-primary shrink-0" />
                    <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                      Piyasa Rayiçleri & Fiyat Geçerlilik Bildirimi
                    </span>
                    <Badge variant="outline" className="border-border text-muted-foreground text-[10px] font-mono">
                      Bilgilendirme
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowBenchmarkDrawer(!showBenchmarkDrawer)}
                    variant="outline"
                    className="border-border bg-background hover:bg-muted text-foreground text-xs font-mono h-7 gap-1.5 shadow-none"
                  >
                    <Sparkles size={12} className="text-primary" />
                    {showBenchmarkDrawer ? 'Rayiç Havuzunu Gizle' : `Onaylı Rayiçleri Gör (${benchmarksData.items.length} Kalem)`}
                    {showBenchmarkDrawer ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </Button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-3 text-xs">
                  {benchmarksData.sourcesSummary.slice(0, 3).map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-muted/20 p-2.5 border border-border">
                      <Calendar size={13} className="text-muted-foreground shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-foreground block truncate text-xs">{s.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">Geçerlilik: {s.validityRange}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-xs text-muted-foreground leading-relaxed bg-muted/10 p-3 border border-border font-sans">
                  <strong className="text-foreground">⚠️ Kullanıcı Sorumluluğu & Manuel Teyit:</strong> {benchmarksData.disclaimer}
                </p>

                {/* BENCHMARK QUICK PICKER DRAWER */}
                {showBenchmarkDrawer && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs font-mono font-bold text-foreground mb-2 flex items-center gap-1.5">
                      <Zap size={13} className="text-primary" /> Taranmış Güncel Rayiçlerden Teklife Ekle:
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 max-h-60 overflow-y-auto pr-1">
                      {benchmarksData.items.map((bm) => (
                        <div
                          key={bm.id}
                          className="flex items-center justify-between p-2.5 bg-muted/20 border border-border hover:border-primary/50 transition-all text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] bg-background border border-border text-foreground px-1.5 py-0.5 font-bold">
                                {bm.itemCode}
                              </span>
                              <span className="font-bold text-foreground truncate text-xs">{bm.itemName}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-muted-foreground">
                              <span>Canlı: <strong className="text-foreground">₺{Number(bm.crawledPrice).toLocaleString('tr-TR')}</strong> /{bm.unit}</span>
                              {bm.diffPercent && Number(bm.diffPercent) !== 0 && (
                                <span className={Number(bm.diffPercent) > 0 ? 'text-primary font-bold' : 'text-foreground font-bold'}>
                                  {Number(bm.diffPercent) > 0 ? `+${bm.diffPercent}%` : `${bm.diffPercent}%`}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => applyBenchmarkItem(bm)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs h-7 px-3 shrink-0 shadow-none"
                          >
                            + Ekle
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Card className="bg-card border border-border shadow-none overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[980px]">
                    <TableHeader className="bg-muted/40">
                      <TableRow className="border-border">
                        <TableHead className="w-[30%] min-w-[200px] sticky left-0 z-10 bg-card border-r border-border text-muted-foreground font-mono text-xs uppercase pl-5 py-3">Detay / İş Kalemi</TableHead>
                        <TableHead className="text-muted-foreground font-mono text-xs uppercase text-center py-3">Kategori</TableHead>
                        <TableHead className="text-muted-foreground font-mono text-xs uppercase text-center py-3">Birim</TableHead>
                        <TableHead className="text-muted-foreground font-mono text-xs uppercase text-center py-3">Miktar</TableHead>
                        <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right py-3">Satış Birim</TableHead>
                        <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right py-3">Maliyet Birim</TableHead>
                        <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right py-3">Zayiat %</TableHead>
                        <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right py-3">İsk. %</TableHead>
                        <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right py-3">KDV %</TableHead>
                        <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right pr-5 py-3">Net Toplam</TableHead>
                        <TableHead className="w-[40px] py-3"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow 
                          key={item.id} 
                          className="border-border/60 group hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="pl-5 py-2.5 sticky left-0 z-10 bg-card group-hover:bg-muted/80 border-r border-border transition-colors">
                            <Input 
                              value={item.description} 
                              onChange={(e) => updateItem(item.id!, { description: e.target.value })}
                              className="bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-xs text-foreground placeholder:text-muted-foreground/60 font-medium"
                              placeholder="Burada yeni bir iş kalemi oluşturun..."
                            />
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                            <select
                              aria-label="Maliyet kategorisi"
                              value={item.costCategory || 'material'}
                              onChange={(e) => updateItem(item.id!, { costCategory: e.target.value as QuoteItem['costCategory'] })}
                              className="bg-background border border-border rounded px-1.5 py-1 text-[11px] font-mono text-foreground focus:border-primary"
                            >
                              <option value="material">Malzeme</option>
                              <option value="labor">İşçilik</option>
                              <option value="subcontractor">Taşeron</option>
                              <option value="logistics">Lojistik</option>
                              <option value="overhead">Genel Gider</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                            <Input 
                              value={item.unit} 
                              onChange={(e) => updateItem(item.id!, { unit: e.target.value })}
                              className="bg-transparent border-none text-center p-0 h-auto focus-visible:ring-0 text-xs font-mono text-muted-foreground uppercase"
                            />
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                            <Input 
                              type="number"
                              value={item.quantity} 
                              onChange={(e) => updateItem(item.id!, { quantity: Number(e.target.value) })}
                              className="bg-transparent border-none text-center p-0 h-auto focus-visible:ring-0 font-mono text-foreground text-xs tabular-nums"
                            />
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <Input 
                              type="number"
                              value={item.unitPrice} 
                              onChange={(e) => updateItem(item.id!, { unitPrice: Number(e.target.value) })}
                              className="bg-transparent border-none text-right p-0 h-auto focus-visible:ring-0 font-mono text-foreground font-semibold text-xs tabular-nums"
                            />
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <Input type="number" min="0" placeholder="Gerekli" value={item.costUnitPrice ?? ''} onChange={(e) => updateItem(item.id!, { costUnitPrice: e.target.value === '' ? null : Number(e.target.value) })} className="bg-transparent border-none text-right p-0 h-auto focus-visible:ring-0 font-mono text-amber-700 dark:text-amber-300 font-semibold text-xs placeholder:text-muted-foreground/60 tabular-nums" />
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <Input type="number" min="0" value={item.wastePercent ?? 0} onChange={(e) => updateItem(item.id!, { wastePercent: Number(e.target.value) })} className="bg-transparent border-none text-right p-0 h-auto focus-visible:ring-0 font-mono text-muted-foreground text-xs tabular-nums" />
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <Input type="number" min="0" max="100" value={item.discountPercent ?? 0} onChange={(e) => updateItem(item.id!, { discountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} className="bg-transparent border-none text-right p-0 h-auto focus-visible:ring-0 font-mono text-orange-600 dark:text-orange-300 font-semibold text-xs tabular-nums" />
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <Input type="number" min="0" max="100" value={item.vatPercent ?? 20} onChange={(e) => updateItem(item.id!, { vatPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} className="bg-transparent border-none text-right p-0 h-auto focus-visible:ring-0 font-mono text-muted-foreground text-xs tabular-nums" />
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground pr-5 py-2.5 font-mono text-xs tabular-nums">
                            ₺{(item.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Kalemi sil"
                              onClick={() => removeItem(item.id!)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 focus-visible:opacity-100 transition-opacity"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="p-3 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2 px-4">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      id="quote-file-upload"
                      aria-label="Excel veya CSV teklif dosyası yükle"
                      type="file"
                      accept=".xlsx,.xls,.csv,text/csv"
                      className="sr-only"
                      onChange={(e) => void handleQuoteFileImport(e.target.files?.[0] ?? null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={importingFile}
                      onClick={() => fileInputRef.current?.click()}
                      className="font-mono text-xs h-8 px-3 gap-1.5 border-border bg-background hover:bg-card text-foreground shadow-none"
                    >
                      {importingFile ? <Loader2 size={13} className="animate-spin text-primary" /> : <FileSpreadsheet size={13} className="text-muted-foreground" />}
                      Excel / CSV'den Kalem Aktar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleDownloadCsvTemplate}
                      className="text-muted-foreground hover:text-foreground font-mono text-[11px] h-8 px-2.5 gap-1"
                    >
                      <Download size={12} /> Şablon İndir (CSV)
                    </Button>
                  </div>
                  <Button variant="ghost" onClick={addItem} className="text-primary hover:bg-primary/10 font-mono text-xs h-8 px-5 gap-1.5">
                    <Plus size={14} /> Yeni Kalem Ekle
                  </Button>
                </div>
              </CardContent>
            </Card>
          </SectionWrapper>
        </div>

        {/* Sidebar Controls */}
        <div className="min-w-0 lg:col-span-4 space-y-6">
          <SectionWrapper title="Genel Taslak Bilgileri" description="Teklifin temel parametrelerini belirleyin.">
            <Card className="bg-card border border-border shadow-none">
              <CardContent className="space-y-5 pt-5">
                <div className="space-y-1.5">
                  <Label htmlFor="quote-client" className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Users size={12} className="text-primary" /> Müşteri İlişkilendirme
                  </Label>
                  <Select value={formData.clientId} onValueChange={(v) => setFormData({...formData, clientId: v})}>
                    <SelectTrigger id="quote-client" className="bg-background border-border text-foreground focus:ring-primary h-11 text-xs font-semibold">
                      <SelectValue placeholder="Bir müşteri atayın..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-medium">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Field
                  label={<span className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest"><Calculator size={12} className="text-primary" /> Proje Başlığı</span>}
                >
                  <Input
                    aria-label="Proje başlığı"
                    value={formData.projectName}
                    onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                    className="bg-background border-border text-foreground focus:border-primary h-11 text-xs font-semibold"
                    placeholder="Örn: Villa Restorasyonu Faz 1"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="quote-currency" className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Para Birimi</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v as Currency})}>
                      <SelectTrigger id="quote-currency" className="bg-background border-border text-foreground h-11 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value={Currency.TRY} className="text-xs font-medium">Türk Lirası (₺)</SelectItem>
                        <SelectItem value={Currency.USD} className="text-xs font-medium">Dolar ($)</SelectItem>
                        <SelectItem value={Currency.EUR} className="text-xs font-medium">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">KDV Oranı</Label>
                    <div className="h-11 flex items-center px-3 bg-muted/30 border border-border text-xs font-mono font-bold text-foreground">
                      %20 (Standart)
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="quote-delivery-level" className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Bilgi Teslimi</Label>
                    <Select value={formData.informationDeliveryLevel} onValueChange={(value) => setFormData({...formData, informationDeliveryLevel: value as typeof formData.informationDeliveryLevel, informationDeliveryCostPercent: value === 'as_built' ? 1 : value === 'cobie' ? 2 : value === 'digital_twin' ? 4 : 0})}>
                      <SelectTrigger id="quote-delivery-level" className="bg-background border-border text-foreground h-11 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="none" className="text-xs font-medium">Kapsam yok</SelectItem>
                        <SelectItem value="as_built" className="text-xs font-medium">As-built teslim</SelectItem>
                        <SelectItem value="cobie" className="text-xs font-medium">COBie veri teslimi</SelectItem>
                        <SelectItem value="digital_twin" className="text-xs font-medium">Dijital ikiz hazırlığı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Teslim Maliyeti %" labelClassName="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest" hint="Şirket kapsam varsayımıdır; ISO/COBie uygunluğu değildir.">
                    <Input type="number" min="0" step="0.1" value={formData.informationDeliveryCostPercent} onChange={(e) => setFormData({...formData, informationDeliveryCostPercent: Math.max(0, Number(e.target.value) || 0)})} className="bg-background border-border text-foreground h-11 font-mono text-xs" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="quote-procurement-profile" className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Tedarik Profili</Label>
                    <Select value={formData.procurementProfile} onValueChange={(value) => setFormData({...formData, procurementProfile: value as typeof formData.procurementProfile, carbonRiskPremiumPercent: value === 'high_carbon_risk' ? 4 : 0})}>
                      <SelectTrigger id="quote-procurement-profile" className="bg-background border-border text-foreground h-11 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="standard" className="text-xs font-medium">Standart</SelectItem>
                        <SelectItem value="low_carbon" className="text-xs font-medium">Düşük karbon hedefi</SelectItem>
                        <SelectItem value="high_carbon_risk" className="text-xs font-medium">Yüksek karbon riski</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Karbon Risk Primi %" labelClassName="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest" hint="Senaryo katsayısıdır; vergi/uyum kararı değildir.">
                    <Input type="number" min="0" step="0.1" value={formData.carbonRiskPremiumPercent} onChange={(e) => setFormData({...formData, carbonRiskPremiumPercent: Math.max(0, Number(e.target.value) || 0)})} className="bg-background border-border text-foreground h-11 font-mono text-xs" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Süre (Ay)" labelClassName="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                    <Input type="number" min="1" value={formData.projectDurationMonths} onChange={(e) => setFormData({...formData, projectDurationMonths: Math.max(1, Number(e.target.value) || 1)})} className="bg-background border-border text-foreground h-11 font-mono text-xs" />
                  </Field>
                  <Field label="Aylık Volatilite %" labelClassName="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest" hint="Şirket varsayımıdır; otomatik piyasa verisi değildir.">
                    <Input type="number" min="0" step="0.1" value={formData.escalationVolatilityPercent} onChange={(e) => setFormData({...formData, escalationVolatilityPercent: Math.max(0, Number(e.target.value) || 0)})} className="bg-background border-border text-foreground h-11 font-mono text-xs" />
                  </Field>
                </div>
              </CardContent>
            </Card>
          </SectionWrapper>

          {/* Pricing Summary Card */}
          <Card className="bg-card text-card-foreground border border-border shadow-none">
            <CardContent className="p-6">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Ara Toplam</span>
                  <span className="font-mono text-xs text-foreground font-semibold tabular-nums">{totals.subtotal.toLocaleString('tr-TR')} {formData.currency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">İndirimler</span>
                  <span className="font-mono text-xs text-destructive font-semibold tabular-nums">-{totals.discountTotal.toLocaleString('tr-TR')} {formData.currency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Yasal Vergi (KDV)</span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">+{totals.vatTotal.toLocaleString('tr-TR')} {formData.currency}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.25em] mb-2 leading-none">Net Teklif Toplamı</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-serif tracking-tight text-foreground tabular-nums">
                    {totals.grandTotal.toLocaleString('tr-TR')}
                  </h2>
                  <span className="text-lg font-mono text-muted-foreground">{formData.currency}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2.5 p-3 border border-border bg-muted/20 text-xs font-mono">
                {costInputsComplete ? <TrendingUp size={15} className="text-primary shrink-0" /> : <AlertCircle size={15} className="text-muted-foreground shrink-0" />}
                <span className={costInputsComplete ? "text-foreground font-medium" : "text-muted-foreground"}>
                  {costInputsComplete ? `Risk primleri dahil marj: %${estimatedMargin.toFixed(1)}` : 'Maliyet birim fiyatlarını girin; marj hesaplanmaz.'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <div className="bg-card border border-border p-4 flex gap-3 items-start shadow-none">
            <ShieldCheck size={18} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-mono font-bold text-foreground uppercase tracking-wider mb-1">Profesyonel İpucu</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pazarlık payı için %5-8 arası indirim kalemini AI asistanınıza eklemesini söyleyebilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
