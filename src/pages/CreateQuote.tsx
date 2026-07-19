/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Users
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

export function CreateQuote() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('residential');
  const [industries, setIndustries] = useState<any[]>([]);
  const [aiResult, setAiResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    clientId: '',
    projectName: '',
    quoteNumber: `TKF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: Currency.TRY,
    notes: '',
  });

  const [items, setItems] = useState<Partial<QuoteItem>[]>([
    { id: crypto.randomUUID(), description: '', unit: 'm2', quantity: 0, unitPrice: 0, costUnitPrice: null, wastePercent: 0, costCategory: 'material', discountPercent: 0, vatPercent: 20, total: 0 }
  ]);

  useEffect(() => {
    fetchWithAuth('/api/clients')
      .then(res => res.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetchWithAuth('/api/ai/industries')
      .then(res => res.json())
      .then(async (allIndustries) => {
        const settingsRes = await fetchWithAuth(`/api/company/industry-settings`);
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          const filtered = allIndustries.filter((ind: any) => {
            const setting = settingsData.find((s: any) => s.industryId === ind.id);
            return setting ? setting.isEnabled : true;
          });
          setIndustries(filtered);
        } else {
          setIndustries(allIndustries);
        }
      })
      .catch(console.error);
  }, []);

  const calculateItemTotal = (item: Partial<QuoteItem>) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const discount = Number(item.discountPercent) || 0;
    const vat = Number(item.vatPercent) || 0;

    const sub = qty * price;
    const afterDiscount = sub * (1 - discount / 100);
    return Number(afterDiscount.toFixed(2));
  };

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

  const totals = items.reduce((acc, item) => {
    const sub = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    const disc = sub * ((Number(item.discountPercent) || 0) / 100);
    const vat = (sub - disc) * ((Number(item.vatPercent) || 0) / 100);
    
    acc.subtotal += sub;
    acc.discountTotal += disc;
    acc.vatTotal += vat;
    acc.grandTotal += (sub - disc + vat);
    return acc;
  }, { subtotal: 0, discountTotal: 0, vatTotal: 0, grandTotal: 0 });

  const costInputsComplete = items.length > 0 && items.every((item) => Number.isFinite(Number(item.costUnitPrice)) && Number(item.costUnitPrice) >= 0);
  const estimatedCost = costInputsComplete ? items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.costUnitPrice) || 0) * (1 + (Number(item.wastePercent) || 0) / 100), 0) : 0;
  const estimatedMargin = costInputsComplete && totals.subtotal - totals.discountTotal > 0
    ? ((totals.subtotal - totals.discountTotal - estimatedCost) / (totals.subtotal - totals.discountTotal)) * 100
    : 0;

  const handleSave = async (status: QuoteStatus = QuoteStatus.DRAFT) => {
    if (!formData.clientId || !formData.projectName) {
      toast.error('Lütfen zorunlu alanları doldurun.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...totals,
          status,
          industryId: selectedIndustry,
          items: items.map(({ id, ...i }) => i)
        }),
      });

      if (res.ok) {
        const newQuote = await res.json();
        toast.success('Teklif başarıyla kaydedildi.');
        navigate(`/app/quotes/${newQuote.id}`);
      } else {
        throw new Error('Kayıt başarısız');
      }
    } catch (error) {
      toast.error('Teklif kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Yeni Teklif Oluştur" 
        description="AI destekli kalem sihirbazı ile saniyeler içinde profesyonel teklifler hazırlayın."
        icon={Plus}
        backButton={{
          label: "Tekliflere Dön",
          onClick: () => navigate('/app/quotes')
        }}
        actions={
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleSave(QuoteStatus.DRAFT)} 
              disabled={loading}
              className="border-zinc-800 bg-zinc-900/50 text-zinc-400 font-black text-[10px] uppercase tracking-widest h-10 px-6 gap-2"
            >
              <Save size={16} /> Taslak Kaydet
            </Button>
            <Button 
              className="bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] uppercase tracking-widest h-10 px-8 gap-2 shadow-lg shadow-orange-900/20" 
              onClick={() => handleSave(QuoteStatus.SENT)} 
              disabled={loading}
            >
              Yayınla & Gönder
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* AI Wizard Section */}
          <Card className="border-orange-500/20 bg-orange-600/5 overflow-hidden shadow-none transition-all hover:bg-orange-600/10 group relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 blur-3xl -mr-16 -mt-16 group-hover:bg-orange-600/20 transition-all duration-700"></div>
            <CardHeader className="pb-3 border-b border-orange-500/10">
              <CardTitle className="text-orange-500 flex items-center gap-3 text-[10px] uppercase tracking-widest font-black">
                <div className="p-1.5 bg-orange-600/20 rounded-lg">
                  <Sparkles size={16} className="text-orange-500 animate-pulse" />
                </div>
                AI Teklif Sihirbazı
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-48 shrink-0">
                  <Label className="text-[10px] font-black text-orange-600/70 uppercase tracking-widest mb-1.5 block">Sektör</Label>
                  <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-300 h-12">
                      <SelectValue placeholder="Sektör" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                      {industries.map(ind => (
                        <SelectItem key={ind.id} value={ind.id} className="text-xs font-bold">{ind.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] font-black text-orange-600/70 uppercase tracking-widest mb-1.5 block">Proje Detayları</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Proje tipini anlatın... (Örn: 200m2 villa kaba inşaat)" 
                      className="bg-zinc-950 border-zinc-800 focus:border-orange-500/50 text-zinc-200 h-12 font-medium"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && generateWithAi()}
                    />
                    <Button 
                      onClick={generateWithAi} 
                      disabled={aiLoading}
                      className="bg-orange-600 hover:bg-orange-700 text-white shrink-0 font-black text-[10px] uppercase tracking-widest h-12 px-8"
                    >
                      {aiLoading ? <Loader2 className="animate-spin" size={18} /> : 'Oluştur'}
                    </Button>
                  </div>
                </div>
              </div>

              {aiResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top duration-500">
                  <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Zap size={12} /> AI Kalem Varsayımları
                    </p>
                    <p className="mb-3 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-[10px] font-bold leading-relaxed text-amber-300">
                      AI çıktısı doğrulanmış metraj veya maliyet kaynağı değildir. Miktarı, satış fiyatını ve gerçek maliyeti kontrol edin.
                    </p>
                    <ul className="space-y-2">
                      {aiResult.assumptions?.map((a: string, i: number) => (
                        <li key={i} className="text-[11px] text-zinc-400 flex items-start gap-2.5 font-medium">
                          <span className="w-1 h-1 rounded-full bg-orange-500/50 mt-1.5" /> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={12} /> Risk Analizi
                      </p>
                      <Badge className={cn(
                        "text-[8px] font-black tracking-widest px-2 py-0.5 uppercase border",
                        aiResult.riskLevel === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                        aiResult.riskLevel === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                        'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      )}>
                        {aiResult.riskLevel} IMPACT
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {aiResult.riskFlags?.map((f: string, i: number) => (
                        <span key={i} className="text-[9px] bg-zinc-900 px-2 py-1 rounded border border-zinc-800 text-zinc-500 font-black uppercase tracking-widest">
                          #{f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {!aiResult && (
                <div className="flex items-center gap-2 px-1">
                  <div className="p-1 bg-orange-500/10 rounded">
                    <Info size={12} className="text-orange-500" />
                  </div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">
                    Birim fiyatlar piyasa verilerine göre AI asistanı tarafından hesaplanır.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items Table */}
          <SectionWrapper title="Teklif Kalemleri" description="Proje kapsamında sunacağınız iş kalemleri ve birim fiyatlar.">
            <Card className="bg-zinc-900/30 border-zinc-800 shadow-none overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-950/50">
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="w-[45%] text-zinc-500 font-black text-[10px] uppercase tracking-widest pl-6 py-4">DETAY / İŞ KALEMİ</TableHead>
                        <TableHead className="text-zinc-500 font-black text-[10px] uppercase tracking-widest text-center py-4">BİRİM</TableHead>
                        <TableHead className="text-zinc-500 font-black text-[10px] uppercase tracking-widest text-center py-4">MİKTAR</TableHead>
                        <TableHead className="text-zinc-500 font-black text-[10px] uppercase tracking-widest text-right py-4">SATIŞ BİRİM</TableHead>
                        <TableHead className="text-zinc-500 font-black text-[10px] uppercase tracking-widest text-right py-4">MALİYET BİRİM</TableHead>
                        <TableHead className="text-zinc-500 font-black text-[10px] uppercase tracking-widest text-right py-4">ZAYİAT %</TableHead>
                        <TableHead className="text-zinc-500 font-black text-[10px] uppercase tracking-widest text-right pr-6 py-4">TOPLAM</TableHead>
                        <TableHead className="w-[50px] py-4"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow 
                          key={item.id} 
                          className={cn(
                            "border-zinc-800 group hover:bg-zinc-800/20 transition-all",
                            idx % 2 === 0 ? "bg-transparent" : "bg-zinc-900/10"
                          )}
                        >
                          <TableCell className="pl-6 py-4">
                            <Input 
                              value={item.description} 
                              onChange={(e) => updateItem(item.id!, { description: e.target.value })}
                              className="bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-sm text-zinc-200 placeholder:text-zinc-800 font-bold"
                              placeholder="Burada yeni bir iş kalemi oluşturun..."
                            />
                          </TableCell>
                          <TableCell className="text-center py-4">
                            <Input 
                              value={item.unit} 
                              onChange={(e) => updateItem(item.id!, { unit: e.target.value })}
                              className="bg-transparent border-none text-center p-0 h-auto focus-visible:ring-0 text-[11px] font-black text-zinc-500 uppercase tracking-widest"
                            />
                          </TableCell>
                          <TableCell className="text-center py-4">
                            <Input 
                              type="number"
                              value={item.quantity} 
                              onChange={(e) => updateItem(item.id!, { quantity: Number(e.target.value) })}
                              className="bg-transparent border-none text-center p-0 h-auto focus-visible:ring-0 font-mono text-zinc-300 font-bold text-sm"
                            />
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <Input 
                              type="number"
                              value={item.unitPrice} 
                              onChange={(e) => updateItem(item.id!, { unitPrice: Number(e.target.value) })}
                              className="bg-transparent border-none text-right p-0 h-auto focus-visible:ring-0 font-mono text-white font-black text-sm"
                            />
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <Input type="number" min="0" placeholder="Gerekli" value={item.costUnitPrice ?? ''} onChange={(e) => updateItem(item.id!, { costUnitPrice: e.target.value === '' ? null : Number(e.target.value) })} className="bg-transparent border-none text-right p-0 h-auto focus-visible:ring-0 font-mono text-amber-300 font-black text-sm placeholder:text-zinc-700" />
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <Input type="number" min="0" value={item.wastePercent ?? 0} onChange={(e) => updateItem(item.id!, { wastePercent: Number(e.target.value) })} className="bg-transparent border-none text-right p-0 h-auto focus-visible:ring-0 font-mono text-zinc-400 text-sm" />
                          </TableCell>
                          <TableCell className="text-right font-black text-white pr-6 py-4 font-mono text-sm">
                            ₺{(item.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="py-4">
                            <Button variant="ghost" size="icon" onClick={() => removeItem(item.id!)} className="text-zinc-700 hover:text-red-500 hover:bg-red-500/5 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-center">
                  <Button variant="ghost" onClick={addItem} className="text-orange-500 hover:bg-orange-500/10 font-black text-[10px] uppercase tracking-widest h-10 px-8 gap-2">
                    <Plus size={16} /> Yeni Kalem Ekle
                  </Button>
                </div>
              </CardContent>
            </Card>
          </SectionWrapper>
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-8">
          <SectionWrapper title="Genel Taslak Bilgileri" description="Teklifin temel parametrelerini belirleyin.">
            <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Users size={12} className="text-orange-500" /> Müşteri İlişkilendirme
                  </Label>
                  <Select value={formData.clientId} onValueChange={(v) => setFormData({...formData, clientId: v})}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 focus:ring-orange-500 h-12 text-sm font-bold">
                      <SelectValue placeholder="Bir müşteri atayın..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-bold">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Calculator size={12} className="text-orange-500" /> Proje Başlığı
                  </Label>
                  <Input 
                    value={formData.projectName} 
                    onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 focus:border-orange-500 h-12 text-sm font-bold"
                    placeholder="Örn: Villa Restorasyonu Faz 1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Para Birimi</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v as Currency})}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value={Currency.TRY} className="text-xs font-bold">Türk Lirası (₺)</SelectItem>
                        <SelectItem value={Currency.USD} className="text-xs font-bold">Dolar ($)</SelectItem>
                        <SelectItem value={Currency.EUR} className="text-xs font-bold">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">KDV Oranı</Label>
                    <div className="h-12 flex items-center px-4 bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-bold text-zinc-400">
                      %20 (Standart)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SectionWrapper>

          {/* Pricing Summary Card */}
          <Card className="bg-zinc-100 text-zinc-950 border-none shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/10 blur-3xl -mr-24 -mt-24 group-hover:bg-orange-600/20 transition-all duration-700"></div>
            <CardContent className="p-8">
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ara Toplam</span>
                  <span className="font-mono font-black text-sm">{totals.subtotal.toLocaleString('tr-TR')} {formData.currency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">İndirimler</span>
                  <span className="font-mono font-black text-sm text-red-600">-{totals.discountTotal.toLocaleString('tr-TR')} {formData.currency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Yasal Vergi (KDV)</span>
                  <span className="font-mono font-black text-sm text-zinc-600">+{totals.vatTotal.toLocaleString('tr-TR')} {formData.currency}</span>
                </div>
              </div>

              <div className="pt-8 border-t border-zinc-200">
                  <p className="text-[11px] font-black text-orange-600 uppercase tracking-[0.4em] mb-3 leading-none">Net Teklif Toplamı</p>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-5xl font-black tracking-tighter text-zinc-950">
                    {totals.grandTotal.toLocaleString('tr-TR')}
                  </h2>
                  <span className="text-2xl font-black text-zinc-400 font-mono">{formData.currency}</span>
                </div>
              </div>

              <div className={cn("mt-8 flex items-center gap-3 p-4 backdrop-blur-sm rounded-2xl border font-black text-[10px] uppercase tracking-widest shadow-lg", costInputsComplete ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-amber-50 border-amber-100 text-amber-700")}>
                <div className={cn("p-1.5 rounded-lg", costInputsComplete ? "bg-emerald-100" : "bg-amber-100")}>
                  {costInputsComplete ? <TrendingUp size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-amber-600" />}
                </div>
                {costInputsComplete ? `Gerçek maliyet bazlı marj: %${estimatedMargin.toFixed(1)}` : 'Maliyet birim fiyatlarını girin; marj hesaplanmaz.'}
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex gap-4 items-start group">
            <div className="p-2 bg-orange-600/20 rounded-xl shrink-0 group-hover:bg-orange-600/30 transition-colors">
              <ShieldCheck size={20} className="text-orange-500" />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-widest mb-1.5">Profesyonel İpucu</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                Pazarlık payı için %5-8 arası indirim kalemini AI asistanınıza eklemesini söyleyebilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

import { Loader2, Info, User } from 'lucide-react';
