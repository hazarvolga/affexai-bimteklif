import { useNavigate } from "react-router-dom";
import { canPreviewIfcInBrowser } from "@/ifc/browser-preview";
import { reserveBrowserIfcAnalysis, type BrowserQuotaDenial } from "@/ifc/browser-quota";
import { IfcQuotaDenialAlert } from "@/components/bimplan/IfcQuotaDenialAlert";
import { useAuth } from "@/hooks/useAuth";
import React, { useState, useMemo } from 'react';
import { 
  FileCode, 
  Upload, 
  Layers, 
  Box, 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  Send, 
  Search, 
  Database,
  Building,
  Sparkles,
  Zap,
  CheckCircle2,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { describeIfcQuantityEvidence, summarizeIfcEvidencePolicy } from '@/ifc/evidence-policy';
import { calculateSummary, parseIfcText } from '@/ifc/parser/legacy-parser';
import { validateEpysRules } from "@/smartcheck/rules/epys";
import { CalmIfcWorkspace } from "@/components/smartcheck/CalmIfcWorkspace";
import { RevitPreUploadChecklistPanel } from "@/components/smartcheck/AuthoringAdvisoryBanner";
import { buildCalmIfcDatasetFromElements } from "@/ifc/calm-icmal";

import type { IfcParseSummary, ParsedIfcElement } from '@/ifc/types';

const IFC_TYPE_LABELS: Record<ParsedIfcElement['type'], string> = {
  IfcBeam: 'IfcBeam (Kiriş)',
  IfcColumn: 'IfcColumn (Kolon)',
  IfcSlab: 'IfcSlab (Döşeme)',
  IfcWall: 'IfcWall (Perde/Duvar)',
  IfcReinforcingBar: 'IfcReinforcingBar (Donatı)',
  IfcCovering: 'IfcCovering (Kaplama / İnce İş)',
};

// Sample OpenBIM IFC Demo Datasets
const DEMO_IFC_DATASETS = [
  {
    id: 'demo-5kat-konut',
    title: '5-Katlı Betonarme Konut IFC Modeli',
    source: 'Allplan 2026 openBIM IFC4',
    fileSize: '4.2 MB',
    elementCount: 142,
  },
  {
    id: 'demo-viyaduk-kiris',
    title: 'Viyadük Kiriş & Ağır Donatı IFC Modeli',
    source: 'Revit 2025 Structural IFC4',
    fileSize: '6.8 MB',
    elementCount: 88,
  },
  {
    id: 'demo-karma-ticari',
    title: 'Karma Ticari Yapı (Kiriş+Kolon+Döşeme) IFC Modeli',
    source: 'Archicad 28 openBIM IFC4x3',
    fileSize: '8.1 MB',
    elementCount: 215,
  }
];

// Generate realistic synthetic openBIM IFC dataset for instant preview / demo files
function generateSyntheticIfcDataset(): { elements: ParsedIfcElement[]; summary: IfcParseSummary } {
  const elements: ParsedIfcElement[] = [];

  // Generate Beams
  for (let i = 1; i <= 24; i++) {
    const vol = parseFloat((1.2 + (i % 5) * 0.25).toFixed(2));
    const rebar = parseFloat((vol * (110 + (i % 20))).toFixed(1));
    elements.push({
      id: `beam-${i}`,
      guid: `2vB${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      type: 'IfcBeam',
      name: `Kiriş K-${100 + i}`,
      storey: i <= 12 ? 'Kat 1' : 'Kat 2',
      storeySource: 'estimate',
      volumeM3: vol,
      formworkM2: parseFloat((vol * 4.4).toFixed(2)),
      rebarKg: rebar,
      quantitySource: 'estimate',
      smartCheckStatus: 'review',
      smartCheckNote: 'Sentetik demo verisi; model veya standart uygunluğu doğrulanmamıştır.'
    });
  }

  // Generate Columns
  for (let i = 1; i <= 18; i++) {
    const vol = parseFloat((0.75 + (i % 4) * 0.2).toFixed(2));
    const rebar = parseFloat((vol * (135 + (i % 15))).toFixed(1));
    elements.push({
      id: `col-${i}`,
      guid: `3vC${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      type: 'IfcColumn',
      name: `Kolon S-${100 + i}`,
      storey: i <= 9 ? 'Kat 1' : 'Kat 2',
      storeySource: 'estimate',
      volumeM3: vol,
      formworkM2: parseFloat((vol * 5.2).toFixed(2)),
      rebarKg: rebar,
      quantitySource: 'estimate',
      smartCheckStatus: 'review',
      smartCheckNote: 'Sentetik demo verisi; model veya standart uygunluğu doğrulanmamıştır.'
    });
  }

  // Generate Slabs
  for (let i = 1; i <= 12; i++) {
    const vol = parseFloat((4.8 + (i % 3) * 1.2).toFixed(2));
    const rebar = parseFloat((vol * (82 + (i % 10))).toFixed(1));
    elements.push({
      id: `slab-${i}`,
      guid: `4vS${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      type: 'IfcSlab',
      name: `Döşeme D-${100 + i}`,
      storey: i <= 6 ? 'Kat 1' : 'Kat 2',
      storeySource: 'estimate',
      volumeM3: vol,
      formworkM2: parseFloat((vol / 0.18).toFixed(2)),
      rebarKg: rebar,
      quantitySource: 'estimate',
      smartCheckStatus: 'review',
      smartCheckNote: 'Sentetik demo verisi; model veya standart uygunluğu doğrulanmamıştır.'
    });
  }

  // Generate Walls
  for (let i = 1; i <= 10; i++) {
    const vol = parseFloat((3.1 + (i % 4) * 0.6).toFixed(2));
    const rebar = parseFloat((vol * 98).toFixed(1));
    elements.push({
      id: `wall-${i}`,
      guid: `5vW${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      type: 'IfcWall',
      name: `Perde Duvar P-${100 + i}`,
      storey: i <= 5 ? 'Bodrum Kat' : 'Kat 1',
      storeySource: 'estimate',
      volumeM3: vol,
      formworkM2: parseFloat((vol * 6.0).toFixed(2)),
      rebarKg: rebar,
      quantitySource: 'estimate',
      smartCheckStatus: 'review',
      smartCheckNote: 'Sentetik demo verisi; model veya standart uygunluğu doğrulanmamıştır.'
    });
  }

  // Generate Rebar Bundles
  const diameters = [10, 12, 14, 16, 20, 25, 32];
  diameters.forEach((d, idx) => {
    const lengthM = 1500 + idx * 800;
    const nominalKgPerM = (Math.PI * Math.pow(d, 2) / 4) * 0.00785;
    const rebarKg = parseFloat((nominalKgPerM * lengthM).toFixed(1));
    elements.push({
      id: `rebar-group-${d}`,
      guid: `6vR${d}MM${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      type: 'IfcReinforcingBar',
      name: `Donatı Demeti ∅${d}`,
      storey: 'Tüm Katlar',
      storeySource: 'estimate',
      volumeM3: parseFloat((rebarKg / 7850).toFixed(3)),
      formworkM2: 0,
      rebarKg,
      rebarDiameterMm: d,
      quantitySource: 'estimate',
      smartCheckStatus: 'review',
      smartCheckNote: 'Sentetik demo verisi; model veya standart uygunluğu doğrulanmamıştır.'
    });
  });

  return calculateSummary(elements);
}

export interface BimIfcParserProps {
  /** @deprecated Browser preview results cannot be transferred to a quote. */
  onTransferToQuote?: (elements: ParsedIfcElement[], summary: IfcParseSummary) => void;
}

export function BimIfcParser(_props: BimIfcParserProps) {
  const navigate = useNavigate();
  const { isDemoMode, user } = useAuth();
  const [fileName, setFileName] = useState<string | null>(null);
  const [quotaDenial, setQuotaDenial] = useState<BrowserQuotaDenial | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<{ elements: ParsedIfcElement[]; summary: IfcParseSummary } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStorey, setSelectedStorey] = useState<string>('all');
  const [expandedType, setExpandedType] = useState<ParsedIfcElement['type'] | null>(null);
  const epysResult = useMemo(() => {
    if (!parsedData) return null;
    // Mock pozExtraction for now using elements
    const pozMap = new Map();
    parsedData.elements.forEach(el => {
      if (el.pozNo) pozMap.set(el.id, { stepId: el.id, value: el.pozNo, sourcePath: "" });
    });
    return validateEpysRules({
      complianceData: parsedData.summary.trPsetCsb,
      pozExtraction: { pozNoByStepId: pozMap },
      totalElementsCount: parsedData.elements.length,
      spaceNames: parsedData.summary.spaceNames ?? [],
      materialNames: parsedData.summary.materialNames ?? [],
    });
  }, [parsedData]);


  // Handle Drag & Drop or File Select
  const handleFileUpload = async (file: File) => {
    if (!canPreviewIfcInBrowser(file.size)) {
      toast.warning('Tarayıcı önizleme sınırı 25 MB. Büyük IFC dosyanızı SmartCheck üzerinden yükleyin.');
      navigate('/app/smartcheck');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      toast.error('Lütfen geçerli bir .ifc uzantılı openBIM dosyası seçin.');
      return;
    }

    setQuotaDenial(null);
    setIsParsing(true);

    // Each real file counts against the package's monthly IFC quota; demo datasets do not.
    if (!isDemoMode) {
      const denial = await reserveBrowserIfcAnalysis();
      if (denial) {
        setIsParsing(false);
        setFileName(null);
        setParsedData(null);
        setQuotaDenial(denial);
        return;
      }
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onerror = () => { setIsParsing(false); toast.error('Dosya okunamadı.'); };
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setTimeout(() => {
        let result;
        try { result = parseIfcText(text); }
        catch { setIsParsing(false); toast.error('IFC ayrıştırılamadı.'); return; }
        setParsedData(result);
        setIsParsing(false);
        if (result.summary.parseStatus === 'failed') {
          toast.error(`${file.name} desteklenen IFC elemanı üretmedi; demo veri oluşturulmadı.`);
        } else {
          toast.warning(`${file.name} ön analiz edildi: ${result.summary.totalElements} nesne bulundu; sonuçlar review bekliyor.`);
        }
      }, 600);
    };

    reader.readAsText(file);
  };

  // Handle Load Demo Model
  const handleLoadDemo = (demoId: string) => {
    const demo = DEMO_IFC_DATASETS.find(d => d.id === demoId);
    if (!demo) return;

    setQuotaDenial(null);
    setFileName(`SENTETİK DEMO — ${demo.title}`);
    setIsParsing(true);

    setTimeout(() => {
      const result = generateSyntheticIfcDataset();
      setParsedData(result);
      setIsParsing(false);
      toast.warning('Sentetik demo gösteriliyor; gerçek IFC dosyası işlenmedi.');
    }, 500);
  };

  // Filter elements
  const filteredElements = useMemo(() => {
    if (!parsedData) return [];
    return parsedData.elements.filter((el) => {
      const matchesSearch = 
        el.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        el.guid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        el.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = selectedType === 'all' || el.type === selectedType;
      const matchesStorey = selectedStorey === 'all' || el.storey === selectedStorey;

      return matchesSearch && matchesType && matchesStorey;
    });
  }, [parsedData, searchQuery, selectedType, selectedStorey]);

  // Unique storeys for filter dropdown
  const storeys = useMemo(() => {
    if (!parsedData) return [];
    const set = new Set(parsedData.elements.map(e => e.storey));
    return Array.from(set);
  }, [parsedData]);

  const evidencePolicySummary = useMemo(() => {
    if (!parsedData) return null;
    return summarizeIfcEvidencePolicy(parsedData.elements);
  }, [parsedData]);

  const hasActiveFilter = searchQuery.trim() !== '' || selectedType !== 'all' || selectedStorey !== 'all';

  const groupedByType = useMemo(() => {
    const groups = new Map<ParsedIfcElement['type'], {
      type: ParsedIfcElement['type'];
      count: number;
      byStatus: Record<ParsedIfcElement['smartCheckStatus'], number>;
      admittedCount: number;
      missingPozNoCount: number;
    }>();
    for (const el of filteredElements) {
      const group = groups.get(el.type) ?? {
        type: el.type,
        count: 0,
        byStatus: { pass: 0, warning: 0, review: 0 },
        admittedCount: 0,
        missingPozNoCount: 0,
      };
      group.count += 1;
      group.byStatus[el.smartCheckStatus] += 1;
      if (describeIfcQuantityEvidence(el).admittedToSmartCheck) group.admittedCount += 1;
      if (!el.pozNo) group.missingPozNoCount += 1;
      groups.set(el.type, group);
    }
    return Array.from(groups.values()).sort((a, b) => b.byStatus.review - a.byStatus.review || b.count - a.count);
  }, [filteredElements]);

  // Export CSV Metraj Raporu
  const handleExportCsv = () => {
    if (!parsedData) return;
    const headers = ['STEP ID', 'GUID', 'Nesne Tipi', 'Eleman Adı', 'Kat', 'Kat Kaynağı', 'Hacim (m3)', 'Kalıp Alanı (m2)', 'Donatı (kg)', 'Miktar Kaynağı', 'SmartCheck Durumu'];
    const rows = parsedData.elements.map(e => [
      e.id,
      e.guid,
      e.type,
      `"${e.name}"`,
      `"${e.storey}"`,
      e.storeySourcePath ? `"${e.storeySourcePath}"` : e.storeySource,
      e.volumeM3,
      e.formworkM2,
      e.rebarKg,
      e.quantitySourcePath ? `"${e.quantitySourcePath}"` : e.quantitySource,
      e.smartCheckStatus
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TeklifPro_5D_IFC_Metraj_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Metraj Raporu indirildi!');
  };

  // Browser parsing is preview-only. Quote-capable imports must pass through the
  // server worker so provenance, duplicate and quality gates cannot be bypassed.
  const handleTransfer = () => {
    toast.warning('Tarayıcı önizlemesi teklife aktarılamaz. Kaynak ve kalite denetimi için sunucu SmartCheck worker akışına yönlendiriliyorsunuz.');
    navigate('/app/smartcheck');
  };

  return (
    <div className="space-y-8 font-sans">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-r from-background via-background to-background p-8 shadow-2xl">
        <div className="absolute top-0 right-0 h-64 w-64 translate-x-16 -translate-y-16 rounded-full bg-orange-600/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-orange-400">
              <Sparkles className="h-3.5 w-3.5 animate-spin" />
              IFC Kanıt Denetim Motoru - Ön İnceleme Modu
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Tarayıcı İçi IFC Ön Metraj ve İnceleme Hazırlığı
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Allplan, Revit veya Archicad <code className="text-orange-300 font-mono">.ifc</code> dosyanızı sürükleyin. <strong className="text-white">IfcBeam, IfcColumn, IfcSlab, IfcWall</strong> nesnelerini ön analiz için okuyun; metrajlar teknik inceleme tamamlanmadan kesin metraj sayılmaz.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-mono text-muted-foreground">
            <span className="rounded-lg bg-card px-3 py-2 border border-border flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Ön Tahmin
            </span>
            <span className="rounded-lg bg-card px-3 py-2 border border-border flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Teknik İnceleme Gerekli
            </span>
            <span className="rounded-lg bg-card px-3 py-2 border border-border flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Onay Bekliyor
            </span>
          </div>
        </div>
      </div>

      {/* UPLOAD & DEMO SELECTION ZONE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Drag & Drop File Box */}
        <div className="lg:col-span-7">
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
            className="group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-[#0c0c0e] p-10 text-center transition-all hover:border-orange-500/50 hover:bg-card"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600/10 text-orange-500 group-hover:scale-110 transition-transform">
              <Upload className="h-8 w-8" />
            </div>

            <h3 className="mt-4 text-lg font-bold text-white">openBIM .ifc Dosyanızı Sürükleyin</h3>
            <p className="mt-2 text-xs text-muted-foreground max-w-sm">
              IFC2X3, IFC4 veya IFC4x3 formatındaki Allplan, Revit, Archicad yapı modellerinizi buraya bırakın.
            </p>

            <label className="mt-6 cursor-pointer">
              <input 
                type="file" 
                accept=".ifc" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                  // Allow the same file to be selected after verification or package activation.
                  e.target.value = '';
                }} 
              />
              <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-600 px-6 text-xs font-bold text-white shadow-lg shadow-orange-950/40 hover:bg-orange-700 transition-all">
                <FileCode className="w-4 h-4" />
                Bilgisayardan .IFC Dosyası Seç
              </span>
            </label>

            {fileName && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-card px-3 py-1.5 text-xs text-orange-400 border border-border">
                <FileCode className="w-4 h-4" />
                Yüklü Dosya: {fileName}
              </div>
            )}

            {quotaDenial && (
              <IfcQuotaDenialAlert denial={quotaDenial} email={user?.email} onDismiss={() => setQuotaDenial(null)} />
            )}
          </div>
          <div className="mt-4">
            <RevitPreUploadChecklistPanel selectedDetection={parsedData?.summary.authoringSoftware ?? null} />
          </div>
        </div>

        {/* Demo Datasets Picker */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-border bg-[#0c0c0e] p-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
              <Zap className="w-4 h-4" />
              HAZIR DEMO MODEL İLE TEST EDİN
            </div>
            <h4 className="text-base font-bold text-white mb-4">Örnek openBIM IFC Modelleri</h4>
            
            <div className="space-y-3">
              {DEMO_IFC_DATASETS.map((demo) => (
                <button
                  key={demo.id}
                  onClick={() => handleLoadDemo(demo.id)}
                  className="w-full text-left p-3.5 rounded-xl border border-border bg-card hover:bg-surface-elevated hover:border-orange-500/40 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors">{demo.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{demo.source} · {demo.elementCount} Nesne</div>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground bg-card px-2 py-1 rounded border border-border">
                    Test Et →
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border text-[11px] text-muted-foreground">
            💡 <em>İpucu:</em> Allplan &amp; Revit donatı ve hacim verileri istemci tarafında (client-side) anında parse edilip TS 708 donatı tablosuna dönüştürülür.
          </div>
        </div>
      </div>

      {/* PARSING SPINNER */}
      {isParsing && (
        <div className="flex flex-col items-center justify-center py-16 bg-[#0c0c0e] rounded-3xl border border-border">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-600 border-t-transparent mb-4" />
          <p className="text-sm font-bold text-white">openBIM .ifc Nesneleri Ön Analiz Ediliyor...</p>
          <p className="text-xs text-muted-foreground mt-1">Elemanlar okunuyor; miktar ve kural sonuçları review bekleyen tahmin olarak etiketlenir.</p>
        </div>
      )}

      {/* PARSED RESULTS & DASHBOARD */}
      {parsedData && !isParsing && (
        <div className="space-y-8">
          <CalmIfcWorkspace
            dataset={buildCalmIfcDatasetFromElements(
              parsedData.elements,
              parsedData.summary,
              fileName || undefined,
            )}
          />

          {parsedData.summary.parseStatus === 'failed' && (
            <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-5 text-sm text-red-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                <div>
                  <div className="font-bold">IFC Dosyası Güvenli Modda Durduruldu</div>
                  <div className="mt-1 text-xs leading-relaxed text-red-100/80">
                    Desteklenen taşıyıcı eleman bulunamadı veya mevcut ayrıştırıcı bu dışa aktarım biçimini okuyamadı. Sistem gerçek dosya yüklemesinde yapay demo metraj üretmez.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOP METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-5 backdrop-blur-sm">
              <div className="flex justify-between items-center text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                <span>Toplam Beton Hacmi</span>
                <Box className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-foreground">{parsedData.summary.totalVolumeM3.toLocaleString('tr-TR')} m³</div>
              <div className="mt-2 text-[11px] text-muted-foreground">Ön Tahmin - Teknik inceleme gerekli</div>
            </div>

            <div className="rounded-2xl border border-orange-500/30 bg-orange-950/10 p-5 backdrop-blur-sm">
              <div className="flex justify-between items-center text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
                <span>Toplam Donatı Tonajı</span>
                <Database className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-foreground">{parsedData.summary.totalRebarTon.toLocaleString('tr-TR')} Ton</div>
              <div className="mt-2 text-[11px] text-muted-foreground">({parsedData.summary.totalRebarKg.toLocaleString('tr-TR')} kg türetilmiş tahmin)</div>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-5 backdrop-blur-sm">
              <div className="flex justify-between items-center text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                <span>Toplam Kalıp Alanı</span>
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-foreground">{parsedData.summary.totalFormworkM2.toLocaleString('tr-TR')} m²</div>
              <div className="mt-2 text-[11px] text-muted-foreground">Ham Geometrik Kalıp Alanı (Askıda)</div>
            </div>

            <div className="rounded-2xl border border-blue-500/30 bg-blue-950/10 p-5 backdrop-blur-sm">
              <div className="flex justify-between items-center text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                <span>openBIM Nesne Sayısı</span>
                <Building className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-foreground">{parsedData.summary.totalElements} Adet</div>
              <div className="mt-2 text-[11px] text-muted-foreground">Ayrıştırılan Yapı Elemanı</div>
            </div>
          </div>

          {/* e-PYS / Tr_Pset_CSB COMPLIANCE SUMMARY */}
          <div className="rounded-2xl border border-border bg-[#0c0c0e] p-5">
            <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sky-400" />
                e-PYS Uyum Özeti
              </div>
              {epysResult && (
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-widest ${epysResult.score >= 80 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : epysResult.score >= 50 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                  SKOR: {epysResult.score}/100
                </div>
              )}
              <span className="ml-auto text-[10px] font-normal normal-case text-muted-foreground">01 Ekim 2026 ruhsat yönetmeliğine göre AI Otonom Denetimi</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-4">
              {([
                ['TAKS', parsedData.summary.trPsetCsb.taks],
                ['KAKS', parsedData.summary.trPsetCsb.kaks],
                ['Ön Çekme (m)', parsedData.summary.trPsetCsb.cekmeOn],
                ['Yan Çekme (m)', parsedData.summary.trPsetCsb.cekmeYan],
              ] as const).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border bg-background p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
                  <div className={value !== undefined ? 'mt-1 text-lg font-black text-white' : 'mt-1 text-xs font-bold text-red-400'}>
                    {value !== undefined ? value.toLocaleString('tr-TR') : 'Eksik'}
                  </div>
                </div>
              ))}
            </div>

            {epysResult && (epysResult.errors.length > 0 || epysResult.warnings.length > 0) && (
              <div className="space-y-2 border-t border-border pt-4">
                {epysResult.errors.map((err, i) => (
                  <div key={'err'+i} className="flex items-start gap-2 rounded bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">
                    <span className="font-bold shrink-0 mt-0.5">HATA:</span>
                    <span>{err}</span>
                  </div>
                ))}
                {epysResult.warnings.map((warn, i) => (
                  <div key={'warn'+i} className="flex items-start gap-2 rounded bg-amber-500/10 px-3 py-2 text-xs text-amber-400 border border-amber-500/20">
                    <span className="font-bold shrink-0 mt-0.5">UYARI:</span>
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">ÇŞB Poz No atanan eleman oranı (Ek-6)</span>
              <span className={parsedData.summary.elementsMissingPozNoCount > 0 ? 'font-bold text-amber-400' : 'font-bold text-emerald-400'}>
                {parsedData.summary.elementsWithPozNoCount} / {parsedData.summary.elementsWithPozNoCount + parsedData.summary.elementsMissingPozNoCount}
              </span>
            </div>
          </div>

          {/* OBJECT BREAKDOWN CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Beams */}
            <div className="rounded-2xl border border-border bg-[#0c0c0e] p-5">
              <div className="text-xs font-bold text-muted-foreground uppercase mb-1">IfcBeam (Kirişler)</div>
              <div className="text-2xl font-bold text-white">{parsedData.summary.beamVolumeM3} m³</div>
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>Adet: <strong className="text-foreground dark:text-muted-foreground">{parsedData.summary.beamCount}</strong></span>
                <span>Ort. Donatı: <strong className="text-orange-400">115 kg/m³</strong></span>
              </div>
            </div>

            {/* Columns */}
            <div className="rounded-2xl border border-border bg-[#0c0c0e] p-5">
              <div className="text-xs font-bold text-muted-foreground uppercase mb-1">IfcColumn (Kolonlar)</div>
              <div className="text-2xl font-bold text-white">{parsedData.summary.columnVolumeM3} m³</div>
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>Adet: <strong className="text-foreground dark:text-muted-foreground">{parsedData.summary.columnCount}</strong></span>
                <span>Ort. Donatı: <strong className="text-orange-400">140 kg/m³</strong></span>
              </div>
            </div>

            {/* Slabs */}
            <div className="rounded-2xl border border-border bg-[#0c0c0e] p-5">
              <div className="text-xs font-bold text-muted-foreground uppercase mb-1">IfcSlab (Döşemeler)</div>
              <div className="text-2xl font-bold text-white">{parsedData.summary.slabVolumeM3} m³</div>
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>Adet: <strong className="text-foreground dark:text-muted-foreground">{parsedData.summary.slabCount}</strong></span>
                <span>Ort. Donatı: <strong className="text-orange-400">85 kg/m³</strong></span>
              </div>
            </div>

            {/* Walls */}
            <div className="rounded-2xl border border-border bg-[#0c0c0e] p-5">
              <div className="text-xs font-bold text-muted-foreground uppercase mb-1">IfcWall (Perdeler)</div>
              <div className="text-2xl font-bold text-white">{parsedData.summary.wallVolumeM3} m³</div>
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>Adet: <strong className="text-foreground dark:text-muted-foreground">{parsedData.summary.wallCount}</strong></span>
                <span>Ort. Donatı: <strong className="text-orange-400">98 kg/m³</strong></span>
              </div>
            </div>
          </div>

          {evidencePolicySummary && (
            <div className="rounded-3xl border border-sky-500/20 bg-sky-950/10 p-6">
              <div className="mb-5 flex flex-col justify-between gap-2 md:flex-row md:items-end">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-400">SmartCheck Kanıt ve Denetim Politikası</p>
                  <h3 className="mt-1 text-lg font-black text-white">Kabul Edilen ve Askıya Alınan IFC Metraj Kaynakları</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Doğrulanmış metraj (QTO) ve özellikler inceleme kuyruğuna aktarılır; kaba tahmin, geometri ve donatı kanıtsız aktarılmaz.</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300">
                  {evidencePolicySummary.admissibleQuantityCount} satır İnceleme ve Onay Adayı
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Kabul Edilen Metraj (QTO)</div>
                  <div className="mt-2 text-2xl font-black text-white">{evidencePolicySummary.acceptedQtoCount}</div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Doğrulanmış Hacim</p>
                </div>
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-sky-400">Kabul Edilen Nitelik</div>
                  <div className="mt-2 text-2xl font-black text-white">{evidencePolicySummary.acceptedPropertyCount}</div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Onaylı Nitelik Seti</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Tahmini Metraj (Askıda)</div>
                  <div className="mt-2 text-2xl font-black text-white">{evidencePolicySummary.blockedEstimateCount}</div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Kural Öncesi Tahmin</p>
                </div>
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Geometri Uyumsuz (Askıda)</div>
                  <div className="mt-2 text-2xl font-black text-white">{evidencePolicySummary.blockedGeometryCount}</div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Geometrik Doğrulama Bekliyor</p>
                </div>
                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Donatı Kanıtı Eksik (Askıda)</div>
                  <div className="mt-2 text-2xl font-black text-white">{evidencePolicySummary.blockedRebarCount}</div>
                  <p className="mt-1 text-[10px] text-muted-foreground">TS 708 Donatı Kanıtı Bekliyor</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kalıp Kanıtı Eksik (Askıda)</div>
                  <div className="mt-2 text-2xl font-black text-white">{evidencePolicySummary.blockedFormworkEstimateCount}</div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Net/Brüt Kalıp Ayrımı Bekliyor</p>
                </div>
              </div>
            </div>
          )}

          {/* REBAR DIAMETER BREAKDOWN & SMARTCHECK QUALITY SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Rebar Diameter Table */}
            <div className="lg:col-span-7 rounded-3xl border border-border bg-[#0c0c0e] p-6">
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-400" />
                TS 708 Donatı Çap Dağılımı ve Metraj Tonajı
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Açık donatı, metraj (QTO) veya nitelik kanıtı olmadan doğrudan teklif kalemine aktarılmaz</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground dark:text-muted-foreground font-mono">
                  <thead className="bg-card text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Donatı Çapı</th>
                      <th className="p-3">Toplam Uzunluk (m)</th>
                      <th className="p-3">Teorik Ağırlık (kg)</th>
                      <th className="p-3">Tonaj (Ton)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.entries(parsedData.summary.rebarByDiameter).map(([diam, rawData]) => {
                      const data = rawData as { lengthM: number; weightKg: number };
                      return (
                        <tr key={diam} className="hover:bg-card">
                          <td className="p-3 font-bold text-orange-400">∅{diam} mm</td>
                          <td className="p-3">{data.lengthM.toLocaleString('tr-TR')} m</td>
                          <td className="p-3 font-bold">{data.weightKg.toLocaleString('tr-TR')} kg</td>
                          <td className="p-3 text-emerald-400 font-bold">{(data.weightKg / 1000).toFixed(2)} Ton</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SmartCheck Quality Status */}
            <div className="lg:col-span-5 rounded-3xl border border-border bg-[#0c0c0e] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                  <CheckCircle className="w-4 h-4" />
                  SMARTCHECK ÖN KONTROL
                </div>
                <h4 className="text-lg font-bold text-foreground mb-2">İnceleme ve Doğrulama Bekleyen Veri Kalitesi</h4>
                
                <div className="space-y-3 mt-4 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-300">Ön Analiz Tamamlandı</div>
                      <div className="text-muted-foreground mt-0.5">
                        Betonarme elemanlarda türetilmiş ortalama değer: <strong className="text-foreground">{(parsedData.summary.totalRebarKg / parsedData.summary.totalVolumeM3).toFixed(1)} kg/m³</strong>. Bu sonuç kesin onaylı metraj değildir (Teknik inceleme gerekir).
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-300">Teknik İnceleme ve Doğrulama Gerekli</div>
                      <div className="text-muted-foreground mt-0.5">
                        Donatı, kalıp ve net hacim kesinliği için açık IFC metrajı (QTO), onaylı nitelik seti veya uzman denetçi doğrulaması gereklidir.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleExportCsv}
                  variant="outline" 
                  className="flex-1 border-border bg-card text-foreground hover:bg-surface-elevated text-xs font-bold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV Raporu İndir
                </Button>
                <Button 
                  onClick={handleTransfer}
                  className="flex-1 bg-orange-700 hover:bg-orange-800 text-white text-xs font-bold shadow-lg shadow-orange-950/40"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Sunucu SmartCheck ile İşle
                </Button>
              </div>
            </div>
          </div>

          {/* DETAILED ELEMENT TABLE */}
          <div className="rounded-3xl border border-border bg-[#0c0c0e] p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Ayrıştırılan openBIM IFC Eleman Listesi</h3>
                <p className="text-xs text-muted-foreground">Eleman bazında net hacim, kalıp alanı ve donatı tonaj dökümü</p>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="GUID, Eleman adı ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-card border-border text-xs h-9 text-white placeholder:text-muted-foreground"
                  />
                </div>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-card border border-border text-xs h-9 rounded-md px-3 text-foreground dark:text-muted-foreground outline-none"
                >
                  <option value="all">Tüm Nesne Tipleri</option>
                  <option value="IfcBeam">IfcBeam (Kiriş)</option>
                  <option value="IfcColumn">IfcColumn (Kolon)</option>
                  <option value="IfcSlab">IfcSlab (Döşeme)</option>
                  <option value="IfcWall">IfcWall (Perde/Duvar)</option>
                  <option value="IfcReinforcingBar">IfcReinforcingBar (Donatı)</option>
                </select>

                <select
                  value={selectedStorey}
                  onChange={(e) => setSelectedStorey(e.target.value)}
                  className="bg-card border border-border text-xs h-9 rounded-md px-3 text-foreground dark:text-muted-foreground outline-none"
                >
                  <option value="all">Tüm Katlar</option>
                  {storeys.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Grouped summary — default review surface, replaces scanning 1000+ raw rows */}
            {!hasActiveFilter && groupedByType.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-xs text-foreground dark:text-muted-foreground">
                  <thead className="bg-card text-[11px] font-bold uppercase text-muted-foreground font-mono">
                    <tr>
                      <th className="p-3">Nesne Tipi</th>
                      <th className="p-3">Toplam</th>
                      <th className="p-3">Uyumlu</th>
                      <th className="p-3">Uyarı</th>
                      <th className="p-3">İncele</th>
                      <th className="p-3">SmartCheck'e Alınabilir</th>
                      <th className="p-3">Poz No Eksik</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {groupedByType.map((group) => (
                      <tr key={group.type} className="hover:bg-card transition-colors">
                        <td className="p-3 font-semibold text-foreground">{IFC_TYPE_LABELS[group.type]}</td>
                        <td className="p-3">{group.count}</td>
                        <td className="p-3 text-emerald-400">{group.byStatus.pass}</td>
                        <td className="p-3 text-amber-400">{group.byStatus.warning}</td>
                        <td className="p-3 text-rose-400">{group.byStatus.review}</td>
                        <td className="p-3">{group.admittedCount} / {group.count}</td>
                        <td className={group.missingPozNoCount > 0 ? 'p-3 text-rose-400 font-bold' : 'p-3 text-muted-foreground'}>{group.missingPozNoCount}</td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedType(expandedType === group.type ? null : group.type)}
                            className="h-7 border-border bg-card text-[10px] text-foreground dark:text-muted-foreground hover:bg-surface-elevated"
                          >
                            {expandedType === group.type ? 'Kapat' : 'Detayları Gör'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table — shown when a group is expanded, or when search/type/floor filters are active */}
            {(hasActiveFilter || expandedType) && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs text-foreground dark:text-muted-foreground">
                <thead className="bg-card text-[11px] font-bold uppercase text-muted-foreground font-mono">
                  <tr>
                    <th className="p-3">STEP ID</th>
                    <th className="p-3">GUID</th>
                    <th className="p-3">Nesne Tipi</th>
                    <th className="p-3">Eleman Adı</th>
                    <th className="p-3">Kat</th>
                    <th className="p-3">Kat Kaynağı</th>
                    <th className="p-3">Hacim (m³)</th>
                    <th className="p-3">Kalıp (m²)</th>
                    <th className="p-3">Donatı (kg)</th>
                    <th className="p-3">Kaynak</th>
                    <th className="p-3">Poz No</th>
                    <th className="p-3">SmartCheck Durumu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {(hasActiveFilter ? filteredElements : filteredElements.filter((el) => el.type === expandedType)).length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-muted-foreground">
                        Arama kriterlerine uygun IFC nesnesi bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    (hasActiveFilter ? filteredElements : filteredElements.filter((el) => el.type === expandedType)).map((el) => (
                      <tr key={el.id} className="hover:bg-card transition-colors">
                        <td className="p-3 text-muted-foreground">#{el.id}</td>
                        <td className="p-3 text-muted-foreground text-[11px]">{el.guid}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            el.type === 'IfcBeam' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            el.type === 'IfcColumn' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            el.type === 'IfcSlab' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            el.type === 'IfcWall' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          }`}>
                            {el.type}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-foreground">{el.name}</td>
                        <td className="p-3 text-muted-foreground">{el.storey}</td>
                        <td className="p-3 text-[11px] text-muted-foreground">{el.storeySource === 'ifc_spatial' ? 'IFC Katı' : 'Tahmini Kat'}</td>
                        <td className="p-3 font-bold text-emerald-400">{el.volumeM3} m³</td>
                        <td className="p-3">{el.formworkM2} m²</td>
                        <td className="p-3 font-bold text-orange-400">{el.rebarKg} kg</td>
                        <td className="p-3 text-[11px] text-muted-foreground">
                          {(() => {
                            const evidence = describeIfcQuantityEvidence(el);
                            const toneClass = evidence.tone === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : evidence.tone === 'sky' ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                              : evidence.tone === 'rose' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                              : evidence.tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                              : 'border-border bg-card text-muted-foreground';
                            return (
                              <span title={evidence.reason} className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-bold ${toneClass}`}>
                                {evidence.label}
                              </span>
                            );
                          })()}
                          {el.quantitySourcePath && <div className="mt-1 max-w-44 truncate text-[10px] text-muted-foreground" title={el.quantitySourcePath}>{el.quantitySourcePath.split(':')[1] ?? el.quantitySourcePath}</div>}
                        </td>
                        <td className="p-3">
                          {el.pozNo ? (
                            <span className="inline-flex rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-300" title={el.pozNoSourcePath}>
                              {el.pozNo}
                            </span>
                          ) : (
                            <span className="inline-flex rounded border border-red-800 bg-red-950 px-2 py-0.5 text-[10px] font-bold text-red-400">
                              Eksik
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                            el.smartCheckStatus === 'pass' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            el.smartCheckStatus === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            'bg-red-950 text-red-400 border border-red-800'
                          }`}>
                            {el.smartCheckStatus === 'pass' && <CheckCircle2 className="w-3 h-3" />}
                            {el.smartCheckStatus === 'warning' && <AlertTriangle className="w-3 h-3" />}
                            {el.smartCheckStatus === 'pass' ? 'Uyumlu' : 'İncele'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BimIfcParser;
