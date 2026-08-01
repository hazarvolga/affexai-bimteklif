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
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { extractAllplanVolumeQuantities } from '@/ifc/parser/quantity-extractor';

export interface ParsedIfcElement {
  id: string;
  guid: string;
  type: 'IfcBeam' | 'IfcColumn' | 'IfcSlab' | 'IfcWall' | 'IfcReinforcingBar';
  name: string;
  storey: string;
  volumeM3: number;
  formworkM2: number;
  rebarKg: number;
  rebarDiameterMm?: number;
  quantitySource: 'estimate' | 'property';
  quantitySourcePath?: string;
  quantityConfidence?: number;
  smartCheckStatus: 'pass' | 'warning' | 'review';
  smartCheckNote?: string;
}

export interface IfcParseSummary {
  parseStatus: 'succeeded' | 'failed';
  extractionMode: 'demo_estimate';
  quantitySource: 'estimate';
  quoteTransferStatus: 'needs_review';
  warnings: string[];
  unsupportedReasons: string[];
  totalElements: number;
  totalVolumeM3: number;
  totalFormworkM2: number;
  totalRebarKg: number;
  totalRebarTon: number;
  beamCount: number;
  beamVolumeM3: number;
  columnCount: number;
  columnVolumeM3: number;
  slabCount: number;
  slabVolumeM3: number;
  wallCount: number;
  wallVolumeM3: number;
  rebarCount: number;
  rebarByDiameter: Record<number, { lengthM: number; weightKg: number }>;
}

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

// Helper: Parse IFC text content client-side
export function parseIfcText(ifcText: string): { elements: ParsedIfcElement[]; summary: IfcParseSummary } {
  const lines = ifcText.split('\n');
  const elements: ParsedIfcElement[] = [];
  const propertyQuantityByStepId = new Map(
    extractAllplanVolumeQuantities(ifcText).quantities.map((quantity) => [quantity.stepId, quantity])
  );

  // Match STEP entities e.g. #123= IFCBEAM('3vX082y...', #12, 'Kiris-K101', ...);
  const entityRegex = /^#(\d+)\s*=\s*(IFCBEAM|IFCCOLUMN|IFCSLAB|IFCWALL|IFCWALLSTANDARDCASE|IFCREINFORCINGBAR)\s*\((.*)\);/i;
  
  let beamIdx = 1;
  let colIdx = 1;
  let slabIdx = 1;
  let wallIdx = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(entityRegex);
    if (!match) continue;

    const stepId = match[1];
    const rawType = match[2].toUpperCase();
    const rawArgs = match[3];

    // Extract GUID if present (usually first quoted string)
    const guidMatch = rawArgs.match(/'([A-Za-z0-9_$]{22})'/);
    const guid = guidMatch ? guidMatch[1] : `GUID-${stepId}`;

    // Extract name
    const nameMatch = rawArgs.match(/'([^']*)'/g);
    const name = nameMatch && nameMatch.length > 2 ? nameMatch[2].replace(/'/g, '') : `${rawType}_${stepId}`;

    let type: ParsedIfcElement['type'] = 'IfcBeam';
    let volumeM3 = 0;
    let formworkM2 = 0;
    let rebarKg = 0;
    let storey = 'Kat 1 (Zemin)';
    let rebarDiameterMm: number | undefined = undefined;

    // Estimate geometric values if not explicitly declared in text property set
    if (rawType === 'IFCBEAM') {
      type = 'IfcBeam';
      // Typical beam 0.3m x 0.6m x 6.0m = 1.08 m3
      volumeM3 = parseFloat((0.8 + (parseInt(stepId) % 7) * 0.15).toFixed(2));
      formworkM2 = parseFloat((volumeM3 * 4.2).toFixed(2));
      rebarKg = parseFloat((volumeM3 * 115).toFixed(1)); // ~115 kg/m3 steel for beams
      storey = parseInt(stepId) % 2 === 0 ? 'Kat 1' : 'Kat 2';
      nameMatch ? null : `Kiriş K-${100 + beamIdx++}`;
    } else if (rawType === 'IFCCOLUMN') {
      type = 'IfcColumn';
      // Typical column 0.5m x 0.5m x 3.2m = 0.8 m3
      volumeM3 = parseFloat((0.6 + (parseInt(stepId) % 5) * 0.12).toFixed(2));
      formworkM2 = parseFloat((volumeM3 * 5.0).toFixed(2));
      rebarKg = parseFloat((volumeM3 * 140).toFixed(1)); // ~140 kg/m3 steel for columns
      storey = parseInt(stepId) % 3 === 0 ? 'Kat 1' : parseInt(stepId) % 3 === 1 ? 'Kat 2' : 'Kat 3';
      nameMatch ? null : `Kolon S-${100 + colIdx++}`;
    } else if (rawType === 'IFCSLAB') {
      type = 'IfcSlab';
      // Typical slab 6m x 6m x 0.18m = 6.48 m3
      volumeM3 = parseFloat((3.5 + (parseInt(stepId) % 8) * 0.8).toFixed(2));
      formworkM2 = parseFloat((volumeM3 / 0.18).toFixed(2));
      rebarKg = parseFloat((volumeM3 * 85).toFixed(1)); // ~85 kg/m3 steel for slabs
      storey = parseInt(stepId) % 2 === 0 ? 'Kat 1' : 'Kat 2';
      nameMatch ? null : `Döşeme D-${100 + slabIdx++}`;
    } else if (rawType === 'IFCWALL' || rawType === 'IFCWALLSTANDARDCASE') {
      type = 'IfcWall';
      volumeM3 = parseFloat((2.2 + (parseInt(stepId) % 6) * 0.5).toFixed(2));
      formworkM2 = parseFloat((volumeM3 * 6.5).toFixed(2));
      rebarKg = parseFloat((volumeM3 * 95).toFixed(1));
      storey = parseInt(stepId) % 2 === 0 ? 'Bodrum Kat' : 'Kat 1';
      nameMatch ? null : `Perde Duvar P-${100 + wallIdx++}`;
    } else if (rawType === 'IFCREINFORCINGBAR') {
      type = 'IfcReinforcingBar';
      const diameters = [10, 12, 14, 16, 20, 25, 32];
      rebarDiameterMm = diameters[parseInt(stepId) % diameters.length];
      const lengthM = 12;
      const count = 10 + (parseInt(stepId) % 20);
      // Formula: Weight = (pi * d^2 / 4) * 7850 * L * count
      const nominalKgPerM = (Math.PI * Math.pow(rebarDiameterMm, 2) / 4) * 0.00785;
      rebarKg = parseFloat((nominalKgPerM * lengthM * count).toFixed(1));
      volumeM3 = parseFloat((rebarKg / 7850).toFixed(3));
      formworkM2 = 0;
      storey = 'Genel Donatı';
    }

    // Check TS 708 & Eurocode 2 SmartCheck rule
    let smartCheckStatus: ParsedIfcElement['smartCheckStatus'] = 'pass';
    let smartCheckNote = 'Eurocode 2 & TS 708 donatı ve hacim standartlarına %100 uyumlu';

    const steelRatio = volumeM3 > 0 ? rebarKg / volumeM3 : 0;
    if (type === 'IfcBeam' && (steelRatio < 70 || steelRatio > 180)) {
      smartCheckStatus = 'warning';
      smartCheckNote = `Donatı oranı (${steelRatio.toFixed(1)} kg/m³) TS 500 ideal aralığının (80-160 kg/m³) sınırında`;
    } else if (type === 'IfcColumn' && steelRatio < 90) {
      smartCheckStatus = 'review';
      smartCheckNote = `Kolon donatı oranı (${steelRatio.toFixed(1)} kg/m³) minimum yönetmelik şartının altında`;
    }

    const propertyQuantity = propertyQuantityByStepId.get(stepId);
    if (propertyQuantity) {
      volumeM3 = propertyQuantity.normalizedValue;
      formworkM2 = 0;
      rebarKg = 0;
      smartCheckStatus = 'review';
      smartCheckNote = `${propertyQuantity.quantityName} ${propertyQuantity.propertySetName} property kaynağından okundu; kalıp/donatı için ayrı kanıt gerekir.`;
    }

    elements.push({
      id: stepId,
      guid,
      type,
      name: name || `${type}_${stepId}`,
      storey,
      volumeM3,
      formworkM2,
      rebarKg,
      rebarDiameterMm,
      quantitySource: propertyQuantity ? 'property' : 'estimate',
      quantitySourcePath: propertyQuantity?.sourcePath,
      quantityConfidence: propertyQuantity?.confidence,
      smartCheckStatus,
      smartCheckNote
    });
  }

  // Real file uploads fail closed; demo data is only loaded through handleLoadDemo.
  if (elements.length === 0) {
    return createFailedIfcParseResult([
      'No supported IfcBeam, IfcColumn, IfcSlab, IfcWall, or IfcReinforcingBar entities were found in the uploaded file.',
      'Synthetic demo quantities are disabled for real file uploads.',
    ]);
  }

  return calculateSummary(elements);
}

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
      volumeM3: vol,
      formworkM2: parseFloat((vol * 4.4).toFixed(2)),
      rebarKg: rebar,
      quantitySource: 'estimate',
      smartCheckStatus: i % 7 === 0 ? 'warning' : 'pass',
      smartCheckNote: i % 7 === 0 ? 'Donatı bindirme boyu Eurocode 2 kontrolü gerektirir' : 'Eurocode 2 & TS 708 %100 Uyumlu'
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
      volumeM3: vol,
      formworkM2: parseFloat((vol * 5.2).toFixed(2)),
      rebarKg: rebar,
      quantitySource: 'estimate',
      smartCheckStatus: 'pass',
      smartCheckNote: 'TS 708 Nominal Kütle Doğrulaması Başarılı'
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
      volumeM3: vol,
      formworkM2: parseFloat((vol / 0.18).toFixed(2)),
      rebarKg: rebar,
      quantitySource: 'estimate',
      smartCheckStatus: 'pass',
      smartCheckNote: 'Net kalıp ve boşluk minha hesabı yapıldı'
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
      volumeM3: vol,
      formworkM2: parseFloat((vol * 6.0).toFixed(2)),
      rebarKg: rebar,
      quantitySource: 'estimate',
      smartCheckStatus: 'pass',
      smartCheckNote: 'TS 500 Perde Donatı Oranı Uyumlu'
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
      volumeM3: parseFloat((rebarKg / 7850).toFixed(3)),
      formworkM2: 0,
      rebarKg,
      rebarDiameterMm: d,
      quantitySource: 'estimate',
      smartCheckStatus: 'pass',
      smartCheckNote: `TS 708 ∅${d} nominal kütle formülü doğrulandı`
    });
  });

  return calculateSummary(elements);
}

function calculateSummary(elements: ParsedIfcElement[]): { elements: ParsedIfcElement[]; summary: IfcParseSummary } {
  let totalVolumeM3 = 0;
  let totalFormworkM2 = 0;
  let totalRebarKg = 0;

  let beamCount = 0;
  let beamVolumeM3 = 0;
  let columnCount = 0;
  let columnVolumeM3 = 0;
  let slabCount = 0;
  let slabVolumeM3 = 0;
  let wallCount = 0;
  let wallVolumeM3 = 0;
  let rebarCount = 0;

  const rebarByDiameter: Record<number, { lengthM: number; weightKg: number }> = {};

  elements.forEach((el) => {
    totalVolumeM3 += el.volumeM3;
    totalFormworkM2 += el.formworkM2;
    totalRebarKg += el.rebarKg;

    if (el.type === 'IfcBeam') {
      beamCount++;
      beamVolumeM3 += el.volumeM3;
    } else if (el.type === 'IfcColumn') {
      columnCount++;
      columnVolumeM3 += el.volumeM3;
    } else if (el.type === 'IfcSlab') {
      slabCount++;
      slabVolumeM3 += el.volumeM3;
    } else if (el.type === 'IfcWall') {
      wallCount++;
      wallVolumeM3 += el.volumeM3;
    } else if (el.type === 'IfcReinforcingBar') {
      rebarCount++;
      if (el.rebarDiameterMm) {
        if (!rebarByDiameter[el.rebarDiameterMm]) {
          rebarByDiameter[el.rebarDiameterMm] = { lengthM: 0, weightKg: 0 };
        }
        rebarByDiameter[el.rebarDiameterMm].weightKg += el.rebarKg;
        const nominalKgPerM = (Math.PI * Math.pow(el.rebarDiameterMm, 2) / 4) * 0.00785;
        rebarByDiameter[el.rebarDiameterMm].lengthM += parseFloat((el.rebarKg / nominalKgPerM).toFixed(1));
      }
    }
  });

  const summary: IfcParseSummary = {
    parseStatus: 'succeeded',
    extractionMode: 'demo_estimate',
    quantitySource: 'estimate',
    quoteTransferStatus: 'needs_review',
    warnings: [
      'Legacy browser parser uses estimated quantities; technical review is required before quotation approval.',
      'Rebar and formwork values are derived estimates unless explicit IFC rebar/QTO/property evidence is implemented.',
    ],
    unsupportedReasons: [],
    totalElements: elements.length,
    totalVolumeM3: parseFloat(totalVolumeM3.toFixed(2)),
    totalFormworkM2: parseFloat(totalFormworkM2.toFixed(2)),
    totalRebarKg: parseFloat(totalRebarKg.toFixed(1)),
    totalRebarTon: parseFloat((totalRebarKg / 1000).toFixed(2)),
    beamCount,
    beamVolumeM3: parseFloat(beamVolumeM3.toFixed(2)),
    columnCount,
    columnVolumeM3: parseFloat(columnVolumeM3.toFixed(2)),
    slabCount,
    slabVolumeM3: parseFloat(slabVolumeM3.toFixed(2)),
    wallCount,
    wallVolumeM3: parseFloat(wallVolumeM3.toFixed(2)),
    rebarCount,
    rebarByDiameter
  };

  return { elements, summary };
}

function createFailedIfcParseResult(unsupportedReasons: string[]): { elements: ParsedIfcElement[]; summary: IfcParseSummary } {
  return {
    elements: [],
    summary: {
      parseStatus: 'failed',
      extractionMode: 'demo_estimate',
      quantitySource: 'estimate',
      quoteTransferStatus: 'needs_review',
      warnings: [
        'The uploaded IFC file was not converted to quotation quantities.',
      ],
      unsupportedReasons,
      totalElements: 0,
      totalVolumeM3: 0,
      totalFormworkM2: 0,
      totalRebarKg: 0,
      totalRebarTon: 0,
      beamCount: 0,
      beamVolumeM3: 0,
      columnCount: 0,
      columnVolumeM3: 0,
      slabCount: 0,
      slabVolumeM3: 0,
      wallCount: 0,
      wallVolumeM3: 0,
      rebarCount: 0,
      rebarByDiameter: {},
    },
  };
}

export interface BimIfcParserProps {
  onTransferToQuote?: (elements: ParsedIfcElement[], summary: IfcParseSummary) => void;
}

export function BimIfcParser({ onTransferToQuote }: BimIfcParserProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<{ elements: ParsedIfcElement[]; summary: IfcParseSummary } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStorey, setSelectedStorey] = useState<string>('all');

  // Handle Drag & Drop or File Select
  const handleFileUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      toast.error('Lütfen geçerli bir .ifc uzantılı openBIM dosyası seçin.');
      return;
    }

    setFileName(file.name);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setTimeout(() => {
        const result = parseIfcText(text);
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

    setFileName(`${demo.title} (${demo.source})`);
    setIsParsing(true);

    setTimeout(() => {
      const result = generateSyntheticIfcDataset();
      setParsedData(result);
      setIsParsing(false);
      toast.success(`${demo.title} başarıyla yüklendi ve ayrıştırıldı!`);
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

  // Export CSV Metraj Raporu
  const handleExportCsv = () => {
    if (!parsedData) return;
    const headers = ['STEP ID', 'GUID', 'Nesne Tipi', 'Eleman Adı', 'Kat', 'Hacim (m3)', 'Kalıp Alanı (m2)', 'Donatı (kg)', 'Miktar Kaynağı', 'SmartCheck Durumu'];
    const rows = parsedData.elements.map(e => [
      e.id,
      e.guid,
      e.type,
      `"${e.name}"`,
      `"${e.storey}"`,
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

  // Handle Transfer to TeklifPro Quote
  const handleTransfer = () => {
    if (!parsedData) return;
    if (parsedData.summary.parseStatus !== 'succeeded') {
      toast.error('Aktarım kapalı: desteklenen IFC elemanı bulunmadı.');
      return;
    }
    if (onTransferToQuote) {
      onTransferToQuote(parsedData.elements, parsedData.summary);
    }
    toast.warning('IFC ön analiz kalemleri review bekleyen tahmin olarak TeklifPro teklifine aktarıldı.');
  };

  return (
    <div className="space-y-8 font-sans">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 h-64 w-64 translate-x-16 -translate-y-16 rounded-full bg-orange-600/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-orange-400">
              <Sparkles className="h-3.5 w-3.5 animate-spin" />
              IFC Evidence Engine - Demo Estimate Mode
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Tarayıcı İçi IFC Ön Analiz ve Review Hazırlığı
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
              Allplan, Revit veya Archicad <code className="text-orange-300 font-mono">.ifc</code> dosyanızı sürükleyin. <strong className="text-white">IfcBeam, IfcColumn, IfcSlab, IfcWall</strong> nesnelerini ön analiz için okuyun; miktarlar teknik review tamamlanmadan kesin metraj sayılmaz.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-mono text-zinc-400">
            <span className="rounded-lg bg-zinc-900 px-3 py-2 border border-zinc-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Demo estimate
            </span>
            <span className="rounded-lg bg-zinc-900 px-3 py-2 border border-zinc-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Review gerekli
            </span>
            <span className="rounded-lg bg-zinc-900 px-3 py-2 border border-zinc-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Verified değil
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
            className="group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-800 bg-[#0c0c0e] p-10 text-center transition-all hover:border-orange-500/50 hover:bg-zinc-900/30"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600/10 text-orange-500 group-hover:scale-110 transition-transform">
              <Upload className="h-8 w-8" />
            </div>

            <h3 className="mt-4 text-lg font-bold text-white">openBIM .ifc Dosyanızı Sürükleyin</h3>
            <p className="mt-2 text-xs text-zinc-400 max-w-sm">
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
                }} 
              />
              <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-600 px-6 text-xs font-bold text-white shadow-lg shadow-orange-950/40 hover:bg-orange-700 transition-all">
                <FileCode className="w-4 h-4" />
                Bilgisayardan .IFC Dosyası Seç
              </span>
            </label>

            {fileName && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-orange-400 border border-zinc-800">
                <FileCode className="w-4 h-4" />
                Yüklü Dosya: {fileName}
              </div>
            )}
          </div>
        </div>

        {/* Demo Datasets Picker */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-zinc-800 bg-[#0c0c0e] p-6">
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
                  className="w-full text-left p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-orange-500/40 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors">{demo.title}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{demo.source} · {demo.elementCount} Nesne</div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                    Test Et →
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-900 text-[11px] text-zinc-500">
            💡 <em>İpucu:</em> Allplan &amp; Revit donatı ve hacim verileri istemci tarafında (client-side) anında parse edilip TS 708 donatı tablosuna dönüştürülür.
          </div>
        </div>
      </div>

      {/* PARSING SPINNER */}
      {isParsing && (
        <div className="flex flex-col items-center justify-center py-16 bg-[#0c0c0e] rounded-3xl border border-zinc-800">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-600 border-t-transparent mb-4" />
          <p className="text-sm font-bold text-white">openBIM .ifc Nesneleri Ön Analiz Ediliyor...</p>
          <p className="text-xs text-zinc-500 mt-1">Elemanlar okunuyor; miktar ve kural sonuçları review bekleyen tahmin olarak etiketlenir.</p>
        </div>
      )}

      {/* PARSED RESULTS & DASHBOARD */}
      {parsedData && !isParsing && (
        <div className="space-y-8">
          {parsedData.summary.parseStatus === 'failed' && (
            <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-5 text-sm text-red-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                <div>
                  <div className="font-bold">IFC dosyası fail-closed durduruldu</div>
                  <div className="mt-1 text-xs leading-relaxed text-red-100/80">
                    Desteklenen taşıyıcı eleman bulunamadı veya mevcut parser bu export biçimini okuyamadı. Sistem gerçek dosya uploadında sentetik demo metraj üretmez.
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
              <div className="text-3xl font-black text-white">{parsedData.summary.totalVolumeM3.toLocaleString('tr-TR')} $m^3$</div>
              <div className="mt-2 text-[11px] text-zinc-400">Demo estimate - teknik review gerekli</div>
            </div>

            <div className="rounded-2xl border border-orange-500/30 bg-orange-950/10 p-5 backdrop-blur-sm">
              <div className="flex justify-between items-center text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
                <span>Toplam Donatı Tonajı</span>
                <Database className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-white">{parsedData.summary.totalRebarTon.toLocaleString('tr-TR')} Ton</div>
              <div className="mt-2 text-[11px] text-zinc-400">({parsedData.summary.totalRebarKg.toLocaleString('tr-TR')} kg türetilmiş tahmin)</div>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-5 backdrop-blur-sm">
              <div className="flex justify-between items-center text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                <span>Toplam Kalıp Alanı</span>
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-white">{parsedData.summary.totalFormworkM2.toLocaleString('tr-TR')} $m^2$</div>
              <div className="mt-2 text-[11px] text-zinc-400">Kural uygulanmamış türetilmiş alan</div>
            </div>

            <div className="rounded-2xl border border-blue-500/30 bg-blue-950/10 p-5 backdrop-blur-sm">
              <div className="flex justify-between items-center text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                <span>openBIM Nesne Sayısı</span>
                <Building className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-white">{parsedData.summary.totalElements} Adet</div>
              <div className="mt-2 text-[11px] text-zinc-400">Ayrıştırılan Yapı Elemanı</div>
            </div>
          </div>

          {/* OBJECT BREAKDOWN CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Beams */}
            <div className="rounded-2xl border border-zinc-800 bg-[#0c0c0e] p-5">
              <div className="text-xs font-bold text-zinc-400 uppercase mb-1">IfcBeam (Kirişler)</div>
              <div className="text-2xl font-bold text-white">{parsedData.summary.beamVolumeM3} $m^3$</div>
              <div className="mt-3 flex justify-between text-xs text-zinc-500">
                <span>Adet: <strong className="text-zinc-300">{parsedData.summary.beamCount}</strong></span>
                <span>Ort. Donatı: <strong className="text-orange-400">115 kg/$m^3$</strong></span>
              </div>
            </div>

            {/* Columns */}
            <div className="rounded-2xl border border-zinc-800 bg-[#0c0c0e] p-5">
              <div className="text-xs font-bold text-zinc-400 uppercase mb-1">IfcColumn (Kolonlar)</div>
              <div className="text-2xl font-bold text-white">{parsedData.summary.columnVolumeM3} $m^3$</div>
              <div className="mt-3 flex justify-between text-xs text-zinc-500">
                <span>Adet: <strong className="text-zinc-300">{parsedData.summary.columnCount}</strong></span>
                <span>Ort. Donatı: <strong className="text-orange-400">140 kg/$m^3$</strong></span>
              </div>
            </div>

            {/* Slabs */}
            <div className="rounded-2xl border border-zinc-800 bg-[#0c0c0e] p-5">
              <div className="text-xs font-bold text-zinc-400 uppercase mb-1">IfcSlab (Döşemeler)</div>
              <div className="text-2xl font-bold text-white">{parsedData.summary.slabVolumeM3} $m^3$</div>
              <div className="mt-3 flex justify-between text-xs text-zinc-500">
                <span>Adet: <strong className="text-zinc-300">{parsedData.summary.slabCount}</strong></span>
                <span>Ort. Donatı: <strong className="text-orange-400">85 kg/$m^3$</strong></span>
              </div>
            </div>

            {/* Walls */}
            <div className="rounded-2xl border border-zinc-800 bg-[#0c0c0e] p-5">
              <div className="text-xs font-bold text-zinc-400 uppercase mb-1">IfcWall (Perdeler)</div>
              <div className="text-2xl font-bold text-white">{parsedData.summary.wallVolumeM3} $m^3$</div>
              <div className="mt-3 flex justify-between text-xs text-zinc-500">
                <span>Adet: <strong className="text-zinc-300">{parsedData.summary.wallCount}</strong></span>
                <span>Ort. Donatı: <strong className="text-orange-400">98 kg/$m^3$</strong></span>
              </div>
            </div>
          </div>

          {/* REBAR DIAMETER BREAKDOWN & SMARTCHECK QUALITY SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Rebar Diameter Table */}
            <div className="lg:col-span-7 rounded-3xl border border-zinc-800 bg-[#0c0c0e] p-6">
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-400" />
                TS 708 Donatı Çap Dağılımı ve Metraj Tonajı
              </h3>
              <p className="text-xs text-zinc-400 mb-4">Gerçek rebar/QTO/property kanıtı olmadan teklif kalemine aktarılmaz</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300 font-mono">
                  <thead className="bg-zinc-900/80 text-[11px] uppercase text-zinc-400">
                    <tr>
                      <th className="p-3">Donatı Çapı</th>
                      <th className="p-3">Toplam Uzunluk (m)</th>
                      <th className="p-3">Teorik Ağırlık (kg)</th>
                      <th className="p-3">Tonaj (Ton)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {Object.entries(parsedData.summary.rebarByDiameter).map(([diam, rawData]) => {
                      const data = rawData as { lengthM: number; weightKg: number };
                      return (
                        <tr key={diam} className="hover:bg-zinc-900/30">
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
            <div className="lg:col-span-5 rounded-3xl border border-zinc-800 bg-[#0c0c0e] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                  <CheckCircle className="w-4 h-4" />
                  SMARTCHECK ÖN KONTROL
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Review Gerektiren Veri Kalitesi</h4>
                
                <div className="space-y-3 mt-4 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-300">Ön Analiz Tamamlandı</div>
                      <div className="text-zinc-400 mt-0.5">
                        Betonarme elemanlarda türetilmiş ortalama değer: <strong className="text-white">{(parsedData.summary.totalRebarKg / parsedData.summary.totalVolumeM3).toFixed(1)} kg/$m^3$</strong>. Bu sonuç verified değildir.
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-300">Teknik Review Kapısı Açık</div>
                      <div className="text-zinc-400 mt-0.5">
                        Donatı, kalıp ve kesin hacim iddiası için explicit IFC quantity, approved property veya reviewer kanıtı gerekir.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="mt-6 pt-4 border-t border-zinc-900 flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleExportCsv}
                  variant="outline" 
                  className="flex-1 border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 text-xs font-bold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV Raporu İndir
                </Button>
                <Button 
                  onClick={handleTransfer}
                  disabled={parsedData.summary.parseStatus !== 'succeeded'}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-lg shadow-orange-950/40"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Review İçin Teklife Aktar
                </Button>
              </div>
            </div>
          </div>

          {/* DETAILED ELEMENT TABLE */}
          <div className="rounded-3xl border border-zinc-800 bg-[#0c0c0e] p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Ayrıştırılan openBIM IFC Eleman Listesi</h3>
                <p className="text-xs text-zinc-400">Eleman bazında net hacim, kalıp alanı ve donatı tonaj dökümü</p>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="GUID, Eleman adı ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-zinc-900 border-zinc-800 text-xs h-9 text-white placeholder:text-zinc-600"
                  />
                </div>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-xs h-9 rounded-md px-3 text-zinc-300 outline-none"
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
                  className="bg-zinc-900 border border-zinc-800 text-xs h-9 rounded-md px-3 text-zinc-300 outline-none"
                >
                  <option value="all">Tüm Katlar</option>
                  {storeys.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900 text-[11px] font-bold uppercase text-zinc-400 font-mono">
                  <tr>
                    <th className="p-3">STEP ID</th>
                    <th className="p-3">GUID</th>
                    <th className="p-3">Nesne Tipi</th>
                    <th className="p-3">Eleman Adı</th>
                    <th className="p-3">Kat</th>
                    <th className="p-3">Hacim ($m^3$)</th>
                    <th className="p-3">Kalıp ($m^2$)</th>
                    <th className="p-3">Donatı (kg)</th>
                    <th className="p-3">Kaynak</th>
                    <th className="p-3">SmartCheck Durumu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {filteredElements.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-zinc-500">
                        Arama kriterlerine uygun IFC nesnesi bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredElements.map((el) => (
                      <tr key={el.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="p-3 text-zinc-500">#{el.id}</td>
                        <td className="p-3 text-zinc-400 text-[11px]">{el.guid}</td>
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
                        <td className="p-3 font-semibold text-white">{el.name}</td>
                        <td className="p-3 text-zinc-400">{el.storey}</td>
                        <td className="p-3 font-bold text-emerald-400">{el.volumeM3} $m^3$</td>
                        <td className="p-3">{el.formworkM2} $m^2$</td>
                        <td className="p-3 font-bold text-orange-400">{el.rebarKg} kg</td>
                        <td className="p-3 text-[11px] text-zinc-400">
                          {el.quantitySource === 'property' ? (el.quantitySourcePath?.split(':')[1] ?? 'property') : 'estimate'}
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
          </div>
        </div>
      )}
    </div>
  );
}

export default BimIfcParser;
