/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { 
  Users,
  Plus, 
  Search, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  MapPin,
  Building2,
  User,
  Filter,
  TrendingUp,
  MessageSquare,
  FileText,
  Handshake,
  CheckCircle,
  XCircle,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectValue,
  SelectTrigger
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Client, PipelineStage } from '@/types';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionWrapper } from '@/components/layout/SectionWrapper';
import { StatCard } from '@/components/data/StatCard';

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    type: 'company',
    email: '',
    phone: '',
    address: '',
    pipelineStage: PipelineStage.NEW_LEAD
  });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/clients');
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Müşteriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const getStageCount = (stage: PipelineStage) => {
    return clients.filter(c => c.pipelineStage === stage).length;
  };

  const handleCreate = async () => {
    if (!newClient.name) return;
    
    try {
      const res = await fetchWithAuth('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });
      if (res.ok) {
        toast.success('Müşteri başarıyla eklendi.');
        setOpen(false);
        fetchClients();
        setNewClient({ name: '', type: 'company', email: '', phone: '', address: '', pipelineStage: PipelineStage.NEW_LEAD });
      }
    } catch (error) {
      toast.error('Müşteri oluşturulamadı.');
    }
  };

  const pipelineStages = [
    { id: PipelineStage.NEW_LEAD, label: 'Potansiyel', icon: TrendingUp, color: 'zinc' },
    { id: PipelineStage.CONTACTED, label: 'Görüşüldü', icon: MessageSquare, color: 'orange' },
    { id: PipelineStage.PROPOSAL_SENT, label: 'Teklifli', icon: FileText, color: 'emerald' },
    { id: PipelineStage.NEGOTIATION, label: 'Pazarlık', icon: Handshake, color: 'orange' },
    { id: PipelineStage.WON, label: 'Kazanıldı', icon: CheckCircle, color: 'emerald' },
    { id: PipelineStage.LOST, label: 'Kaybedildi', icon: XCircle, color: 'zinc' },
  ];

  return (
    <PageContainer>
      <PageHeader 
        title="Müşteriler & CRM" 
        description="Müşteri portföyünüzü ve satış pipeline sürecini yönetin."
        icon={Users}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest h-10 px-6 gap-2">
                <Plus size={16} /> Yeni Müşteri Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-md p-0 overflow-hidden">
              <DialogHeader className="p-6 border-b border-zinc-900 bg-zinc-900/50">
                <DialogTitle className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <User size={18} className="text-orange-500" /> Yeni Müşteri Kaydı
                </DialogTitle>
              </DialogHeader>
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Müşteri Adı / Ünvan</Label>
                  <Input 
                    placeholder="Örn: Aras Yapı Denetim Ltd." 
                    value={newClient.name}
                    className="h-12 bg-zinc-900 border-zinc-800 focus:border-orange-500/50"
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tip</Label>
                    <Select 
                      value={newClient.type} 
                      onValueChange={(v) => setNewClient({...newClient, type: v as any})}
                    >
                      <SelectTrigger className="h-12 bg-zinc-900 border-zinc-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="company" className="text-xs font-bold">Şirket</SelectItem>
                        <SelectItem value="person" className="text-xs font-bold">Bireysel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pipeline Durumu</Label>
                    <Select 
                      value={newClient.pipelineStage} 
                      onValueChange={(v) => setNewClient({...newClient, pipelineStage: v as PipelineStage})}
                    >
                      <SelectTrigger className="h-12 bg-zinc-900 border-zinc-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value={PipelineStage.NEW_LEAD} className="text-xs font-bold">Yeni Potansiyel</SelectItem>
                        <SelectItem value={PipelineStage.CONTACTED} className="text-xs font-bold">Görüşüldü</SelectItem>
                        <SelectItem value={PipelineStage.PROPOSAL_SENT} className="text-xs font-bold">Teklif Hazır</SelectItem>
                        <SelectItem value={PipelineStage.NEGOTIATION} className="text-xs font-bold">Pazarlık</SelectItem>
                        <SelectItem value={PipelineStage.WON} className="text-xs font-bold">Kazanıldı</SelectItem>
                        <SelectItem value={PipelineStage.LOST} className="text-xs font-bold">Kaybedildi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">İletişim E-posta</Label>
                  <Input 
                    type="email" 
                    placeholder="info@sirket.com" 
                    value={newClient.email}
                    className="h-12 bg-zinc-900 border-zinc-800 focus:border-orange-500/50"
                    onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Telefon</Label>
                  <Input 
                    placeholder="+90 5XX XXX XX XX" 
                    value={newClient.phone}
                    className="h-12 bg-zinc-900 border-zinc-800 focus:border-orange-500/50"
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter className="p-6 bg-zinc-900/50 border-t border-zinc-900">
                <Button variant="outline" className="border-zinc-800 hover:bg-zinc-800 text-zinc-400 font-black text-[10px] uppercase tracking-widest h-11 px-6" onClick={() => setOpen(false)}>İptal</Button>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] uppercase tracking-widest h-11 px-8 shadow-lg shadow-orange-900/20" onClick={handleCreate}>Müşteriyi Kaydet</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Visual Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {pipelineStages.map((stage) => {
          const count = getStageCount(stage.id);
          return (
            <StatCard 
              key={stage.id}
              title={stage.label}
              value={count.toString()}
              icon={stage.icon}
              color={stage.color as any}
            />
          );
        })}
      </div>

      <Card className="bg-zinc-900/30 border-zinc-800 shadow-none overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-4 bg-zinc-900/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
              <Input 
                placeholder="Müşteri listesinde ara..." 
                className="pl-10 h-10 bg-zinc-950/50 border-zinc-800 focus:border-orange-500/50 transition-all text-sm font-medium" 
              />
            </div>
            <Button variant="outline" size="sm" className="border-zinc-800 bg-zinc-900 text-zinc-400 gap-2 font-black text-[10px] uppercase tracking-widest h-10 px-4">
              <Filter size={16} /> Filtrele
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-950/30">
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="py-4 text-zinc-500 font-black text-[10px] uppercase tracking-widest pl-6">MÜŞTERİ BİLGİSİ</TableHead>
                  <TableHead className="py-4 text-zinc-500 font-black text-[10px] uppercase tracking-widest text-center">İLETİŞİM KANALLARI</TableHead>
                  <TableHead className="py-4 text-zinc-500 font-black text-[10px] uppercase tracking-widest text-center">PIPELINE ADIMI</TableHead>
                  <TableHead className="py-4 text-zinc-500 font-black text-[10px] uppercase tracking-widest text-center">KAYIT TARİHİ</TableHead>
                  <TableHead className="py-4 text-right text-zinc-500 font-black text-[10px] uppercase tracking-widest pr-6">İŞLEM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="border-zinc-800 bg-zinc-900/10">
                    <TableCell colSpan={5} className="text-center py-24">
                       <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Müşteri Verileri Çekiliyor...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : clients.length === 0 ? (
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableCell colSpan={5} className="text-center py-24 px-8">
                      <EmptyState 
                        icon={Users}
                        title="Müşteri Kaydı Bulunmuyor"
                        description="Satış sürecini başlatmak için ilk müşterinizi veya potansiyel fırsatınızı ekleyin."
                        actionText="YENİ MÜŞTERİ EKLE"
                        onAction={() => setOpen(true)}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client, idx) => (
                    <TableRow 
                      key={client.id} 
                      className={cn(
                        "border-zinc-800 hover:bg-zinc-800/20 transition-all group",
                        idx % 2 === 0 ? "bg-transparent" : "bg-zinc-900/10"
                      )}
                    >
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0 group-hover:bg-orange-600/20 transition-colors">
                            {client.type === 'company' ? <Building2 size={18} /> : <User size={18} />}
                          </div>
                          <div>
                            <p className="font-black text-xs text-white uppercase tracking-tight">{client.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Briefcase size={10} className="text-zinc-600" />
                              <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">
                                {client.type === 'company' ? 'KURUMSAL' : 'BİREYSEL'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer">
                            <Mail size={12} className="text-zinc-600" />
                            {client.email || '-'}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer">
                            <Phone size={12} className="text-zinc-600" />
                            {client.phone || '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <StageBadge stage={client.pipelineStage} />
                      </TableCell>
                      <TableCell className="py-4 text-zinc-500 text-[10px] text-center font-black uppercase tracking-widest font-mono">
                        {new Date(client.createdAt).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6">
                        <Button variant="ghost" size="icon" className="hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
                          <MoreHorizontal size={18} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function StageBadge({ stage }: { stage: PipelineStage }) {
  const configs: Record<PipelineStage, { label: string, color: string }> = {
    [PipelineStage.NEW_LEAD]: { label: 'POTANSİYEL', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
    [PipelineStage.CONTACTED]: { label: 'GÖRÜŞÜLDÜ', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    [PipelineStage.PROPOSAL_SENT]: { label: 'TEKLİF HAZIR', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    [PipelineStage.NEGOTIATION]: { label: 'PAZARLIK', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    [PipelineStage.WON]: { label: 'KAZANILDI', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    [PipelineStage.LOST]: { label: 'KAYBEDİLDİ', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  };
  const config = configs[stage];
  return (
    <Badge variant="outline" className={cn("text-[9px] px-2 py-0.5 font-black tracking-widest rounded-md uppercase border transition-all", config.color)}>
      {config.label}
    </Badge>
  );
}
