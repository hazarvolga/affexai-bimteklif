/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Info, Loader2, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Base UI shows the raw value in a closed Select unless `items` maps values to labels (marka.md M-12.3).
const INDUSTRY_FALLBACK_LABELS: Record<string, string> = { residential: "Konut" };

export interface AiQuoteDraftResult {
  assumptions?: string[];
  riskFlags?: string[];
  riskLevel?: string;
}

interface QuoteAiWizardProps {
  industries: ReadonlyArray<{ id: string; name: string }>;
  selectedIndustry: string;
  setSelectedIndustry: (industryId: string) => void;
  description: string;
  setDescription: (description: string) => void;
  aiLoading: boolean;
  aiResult: AiQuoteDraftResult | null;
  generateWithAi: () => void;
  aiConfigured?: boolean | null;
  collapsedByDefault?: boolean;
  existingItemCount?: number;
}

/** AI ile kalem ve açıklama taslağı; miktar ve fiyatlar kaynaklarıyla ayrıca incelenir (marka.md M-12.2). */
export function QuoteAiWizard({
  industries,
  selectedIndustry,
  setSelectedIndustry,
  description,
  setDescription,
  aiLoading,
  aiResult,
  generateWithAi,
  aiConfigured = null,
  collapsedByDefault = false,
  existingItemCount = 0,
}: QuoteAiWizardProps) {
  const [expanded, setExpanded] = useState(!collapsedByDefault);
  const [userToggled, setUserToggled] = useState(false);

  useEffect(() => {
    if (!userToggled) {
      setExpanded(!collapsedByDefault);
    }
  }, [collapsedByDefault, userToggled]);

  return (
    <Card className="border border-border bg-card shadow-none" data-testid="quote-ai-wizard">
      <CardHeader className={`${expanded ? 'pb-3 border-b border-border' : 'py-3'} flex flex-row flex-wrap items-center justify-between gap-2`}>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-foreground flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold">
            <Sparkles size={14} className="text-primary" />
            AI Teklif Sihirbazı (İsteğe Bağlı)
          </CardTitle>
          {aiConfigured === false && (
            <Badge
              variant="outline"
              data-testid="ai-status-badge"
              className="text-[10px] font-mono border-amber-500/40 bg-amber-500/10 text-amber-400"
            >
              API Anahtarı Tanımlı Değil · Excel & Şablon Modu Aktif
            </Badge>
          )}
          {aiConfigured === true && (
            <Badge
              variant="outline"
              data-testid="ai-status-badge"
              className="text-[10px] font-mono border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            >
              Canlı AI Sağlayıcısı Aktif
            </Badge>
          )}
          {existingItemCount > 0 && (
            <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">
              Tablodaki {existingItemCount} kalem korunur
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setUserToggled(true);
            setExpanded((prev) => !prev);
          }}
          className="h-7 px-2.5 text-[11px] font-mono text-muted-foreground hover:text-foreground gap-1"
        >
          {expanded ? (
            <>
              <ChevronUp size={13} /> Gizle
            </>
          ) : (
            <>
              <ChevronDown size={13} /> AI Sihirbazını Aç
            </>
          )}
        </Button>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-5 p-6">
          {aiConfigured === false && (
            <div className="border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
              <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-mono font-bold text-foreground">
                  Sunucuda harici AI API anahtarı (GEMINI_API_KEY / OPENAI_API_KEY) tanımlı değil
                </p>
                <p className="leading-relaxed">
                  Teklifinizi doğrudan aşağıdaki <strong>Excel / CSV'den Kalem Aktar</strong>, üst bardaki{' '}
                  <strong>Demo Şablon Yükle</strong> veya <strong>Firma Kataloğu / Onaylı Birim Fiyat</strong>{' '}
                  araçlarıyla hazırlayabilirsiniz. Yüklediğiniz Excel kalemleri asla silinmez.
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-48 shrink-0">
              <Label htmlFor="quote-industry" className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Sektör</Label>
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry} items={{ ...INDUSTRY_FALLBACK_LABELS, ...Object.fromEntries(industries.map(ind => [ind.id, ind.name])) }}>
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
                  disabled={aiLoading || aiConfigured === false}
                  title={aiConfigured === false ? 'Sunucuda AI API anahtarı tanımlı değil' : undefined}
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
              AI, kalem listesi ve başlangıç fiyat tahmini taslağı hazırlar. Bu tahminler piyasa verisi değildir; miktar ve fiyatları kaynaklarıyla inceleyip onaylayın.
            </p>
          </div>
        )}
        </CardContent>
      )}
    </Card>
  );
}
