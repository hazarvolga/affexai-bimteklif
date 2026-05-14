import { useState } from 'react';
import { 
  Zap, 
  Plus, 
  Trash2, 
  Calculator, 
  Save, 
  FileText, 
  Download,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuoteItem } from '@/types';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

export function QuoteEditor({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<Partial<QuoteItem>[]>([
    { id: '1', description: '', unit: 'm2', quantity: 0, unitPrice: 0, discountPercent: 0, vatPercent: 20, total: 0 }
  ]);
  const [projectName, setProjectName] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), description: '', unit: 'm2', quantity: 0, unitPrice: 0, discountPercent: 0, vatPercent: 20, total: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        const qty = field === 'quantity' ? Number(value) : Number(item.quantity || 0);
        const price = field === 'unitPrice' ? Number(value) : Number(item.unitPrice || 0);
        const disc = field === 'discountPercent' ? Number(value) : Number(item.discountPercent || 0);
        const vat = field === 'vatPercent' ? Number(value) : Number(item.vatPercent || 0);
        
        const sub = qty * price;
        const discounted = sub * (1 - disc / 100);
        updated.total = Number((discounted * (1 + vat / 100)).toFixed(2));
        return updated;
      }
      return item;
    }));
  };

  const generateWithAi = async () => {
    if (!projectName) {
      toast.error("Lütfen önce bir proje adı veya açıklaması yazın.");
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/generate-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: projectName })
      });
      const data = await res.json();
      
      const itemsToMap = Array.isArray(data) ? data : [];
      const newItems = itemsToMap.map((d: any) => ({
        id: Math.random().toString(),
        description: d.description,
        unit: d.unit,
        quantity: d.quantity,
        unitPrice: 0,
        discountPercent: 0,
        vatPercent: 20,
        total: 0
      }));

      setItems(newItems);
      toast.success("AI kalemleri başarıyla oluşturdu!");
    } catch (err) {
      toast.error("AI teklifi oluştururken bir hata oluştu.");
    } finally {
      setAiLoading(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
    const grandTotal = items.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
    return { subtotal, grandTotal };
  };

  const { subtotal, grandTotal } = calculateTotals();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Teklif Düzenleyici</h1>
        <div className="flex gap-3">
          <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={onClose}>İptal</Button>
          <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-2 shadow-lg shadow-orange-900/20">
            <Save size={18} />
            Teklifi Kaydet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 bg-zinc-900/30 border-zinc-800 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 px-6 py-4">
            <CardTitle className="text-sm font-medium text-zinc-300">Proje Detayları</CardTitle>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-orange-500 gap-2 border-orange-500/20 bg-orange-600/5 hover:bg-orange-600/10 hover:border-orange-500/40"
              onClick={generateWithAi}
              disabled={aiLoading}
            >
              <Zap size={16} fill={aiLoading ? "none" : "currentColor"} className={aiLoading ? "animate-pulse" : ""} />
              {aiLoading ? "AI Oluşturuyor..." : "AI ile Kalemleri Oluştur"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6 px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Proje Adı / Tanımı</label>
                <Input 
                  placeholder="Örn: 500m2 Villa Kaba İnşaat" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-orange-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Müşteri</label>
                <Input 
                  placeholder="Müşteri Seçin..." 
                  className="bg-zinc-950 border-zinc-800 text-zinc-200"
                />
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900/50">
                    <TableHead className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Açıklama</TableHead>
                    <TableHead className="w-20 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Birim</TableHead>
                    <TableHead className="w-24 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Miktar</TableHead>
                    <TableHead className="w-28 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Fiyat</TableHead>
                    <TableHead className="w-20 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">KDV%</TableHead>
                    <TableHead className="w-32 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Toplam</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="border-zinc-800 hover:bg-zinc-800/20 group">
                      <TableCell>
                        <Input 
                          value={item.description} 
                          onChange={(e) => updateItem(item.id!, 'description', e.target.value)}
                          className="border-none focus-visible:ring-0 px-0 h-8 bg-transparent text-zinc-200"
                          placeholder="İş kalemi açıklaması..."
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={item.unit} 
                          onChange={(e) => updateItem(item.id!, 'unit', e.target.value)}
                          className="border-none focus-visible:ring-0 px-0 h-8 bg-transparent text-center text-zinc-400"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          value={item.quantity} 
                          onChange={(e) => updateItem(item.id!, 'quantity', e.target.value)}
                          className="border-none focus-visible:ring-0 px-0 h-8 bg-transparent text-center font-mono text-zinc-300"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          value={item.unitPrice} 
                          onChange={(e) => updateItem(item.id!, 'unitPrice', e.target.value)}
                          className="border-none focus-visible:ring-0 px-0 h-8 bg-transparent text-right font-mono text-white font-bold"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          value={item.vatPercent} 
                          onChange={(e) => updateItem(item.id!, 'vatPercent', e.target.value)}
                          className="border-none focus-visible:ring-0 px-0 h-8 bg-transparent text-center text-zinc-500"
                        />
                      </TableCell>
                      <TableCell className="text-right font-bold text-zinc-200 font-mono">
                        ₺{item.total?.toLocaleString('tr-TR')}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeItem(item.id!)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-3 border-t border-zinc-800 bg-zinc-900/20">
                <Button variant="ghost" size="sm" className="w-full gap-2 text-zinc-500 font-medium hover:text-zinc-300 hover:bg-zinc-800" onClick={addItem}>
                  <Plus size={16} /> Yeni Satır Ekle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800 shadow-none">
            <CardHeader className="border-b border-zinc-800 pb-4">
              <CardTitle className="text-sm font-medium text-zinc-300">Özet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span>Ara Toplam</span>
                <span className="font-mono text-zinc-300">₺{subtotal.toLocaleString('tr-TR')}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span>KDV Toplam</span>
                <span className="font-mono text-zinc-300">₺{(grandTotal - subtotal).toLocaleString('tr-TR')}</span>
              </div>
              <Separator className="bg-zinc-800" />
              <div className="flex justify-between items-center py-2">
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Genel Toplam</span>
                <span className="text-xl font-bold text-orange-500 font-mono">₺{grandTotal.toLocaleString('tr-TR')}</span>
              </div>
              <Button className="w-full bg-zinc-100 text-zinc-950 hover:bg-white gap-2 h-12 font-bold font-heading">
                <Download size={18} />
                PDF İndir
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
