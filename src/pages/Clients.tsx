/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Building2,
  User,
  TrendingUp,
  MessageSquare,
  FileText,
  Handshake,
  CheckCircle,
  XCircle,
  Briefcase,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Target,
  Edit3,
  ExternalLink,
  MapPin,
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
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Client, PipelineStage } from '@/types';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/data/StatCard';
import { ClientImportModal } from '@/components/clients/ClientImportModal';
import { ClientQuickDrawer } from '@/components/clients/ClientQuickDrawer';
import {
  appendClientStageNote,
  CLIENT_STAGE_MAP,
  getLatestClientStageNote,
  normalizeClientStageKey,
} from '@/lib/client-notes';
import { exportClientsToCsv } from '@/lib/client-excel-import';
import { exportClientsToXlsx } from '@/lib/client-xlsx';

export function Clients() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canMutate = !role || ['owner', 'admin', 'manager'].includes(role);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<PipelineStage | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [drawerClient, setDrawerClient] = useState<Client | null>(null);
  const [initialNote, setInitialNote] = useState('');
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    type: 'company',
    email: '',
    phone: '',
    address: '',
    pipelineStage: PipelineStage.NEW_LEAD,
  });

  const fetchClients = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchWithAuth('/api/clients');
      if (!res.ok) throw new Error('İstek başarısız');
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchClients();
  }, []);

  const filteredClients = clients.filter((client) => {
    if (selectedStage !== 'all' && normalizePipelineStage(client.pipelineStage) !== selectedStage) {
      return false;
    }
    const term = searchTerm.trim().toLocaleLowerCase('tr-TR');
    if (!term) return true;
    return (
      client.name.toLocaleLowerCase('tr-TR').includes(term) ||
      (client.email ?? '').toLocaleLowerCase('tr-TR').includes(term) ||
      (client.phone ?? '').toLocaleLowerCase('tr-TR').includes(term) ||
      (client.address ?? '').toLocaleLowerCase('tr-TR').includes(term)
    );
  });

  const getStageCount = (stage: PipelineStage) => {
    return clients.filter((c) => normalizePipelineStage(c.pipelineStage) === stage).length;
  };

  const handleCreate = async () => {
    if (!newClient.name?.trim()) return;
    const stage = (newClient.pipelineStage as PipelineStage) || PipelineStage.NEW_LEAD;
    const formattedNotes = initialNote.trim()
      ? appendClientStageNote(null, { stage, content: initialNote.trim() })
      : undefined;

    try {
      const res = await fetchWithAuth('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClient,
          name: newClient.name.trim(),
          notes: formattedNotes,
        }),
      });
      if (res.ok) {
        toast.success('Müşteri başarıyla eklendi.');
        setOpen(false);
        void fetchClients();
        setInitialNote('');
        setNewClient({
          name: '',
          type: 'company',
          email: '',
          phone: '',
          address: '',
          pipelineStage: PipelineStage.NEW_LEAD,
        });
      } else {
        toast.error('Müşteri oluşturulamadı.');
      }
    } catch {
      toast.error('Müşteri oluşturulamadı.');
    }
  };

  const handleExportXlsx = async () => {
    if (clients.length === 0) {
      toast.error('Dışa aktarılacak müşteri kaydı bulunmuyor.');
      return;
    }
    try {
      const bytes = await exportClientsToXlsx(filteredClients.length ? filteredClients : clients);
      const blob = new Blob([bytes as unknown as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bimmetraj-musteriler.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Müşteri listesi Excel (.xlsx) olarak indirildi.');
    } catch {
      toast.error('Excel dışa aktarma sırasında hata oluştu.');
    }
  };

  const handleExportCsv = () => {
    if (clients.length === 0) {
      toast.error('Dışa aktarılacak müşteri kaydı bulunmuyor.');
      return;
    }
    const csv = exportClientsToCsv(filteredClients.length ? filteredClients : clients);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bimmetraj-musteri-listesi.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('Müşteri listesi CSV olarak indirildi.');
  };

  const handleClientUpdated = (updated: Client) => {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setDrawerClient(updated);
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
        title="Müşteriler"
        description="Müşteri rehberinizi, 6 aşamalı görüşme notlarınızı ve Excel/CSV aktarımlarınızı yönetin."
        icon={Users}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/app/crm')}
              className="border-border bg-card hover:bg-surface-elevated text-foreground font-black text-[10px] uppercase tracking-widest h-10 px-4 gap-2"
            >
              <Target size={15} className="text-emerald-400" /> Müşteriler & Fırsatlar
            </Button>

            {canMutate && (
              <Button
                variant="outline"
                onClick={() => setImportOpen(true)}
                className="border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-black text-[10px] uppercase tracking-widest h-10 px-4 gap-2"
              >
                <FileSpreadsheet size={15} /> Excel / CSV İçe Aktar
              </Button>
            )}

            {clients.length > 0 && (
              <Button
                variant="outline"
                onClick={handleExportXlsx}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleExportCsv();
                }}
                title="Excel (.xlsx) olarak indir (CSV için sağ tıklayın)"
                className="border-border bg-card hover:bg-surface-elevated text-muted-foreground hover:text-foreground font-black text-[10px] uppercase tracking-widest h-10 px-3.5 gap-1.5"
              >
                <Download size={14} /> Dışa Aktar (.xlsx)
              </Button>
            )}

            {canMutate && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger
                  render={
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest h-10 px-5 gap-2" />
                  }
                >
                  <Plus size={16} /> Yeni Müşteri Ekle
                </DialogTrigger>
              <DialogContent className="bg-background border-border text-foreground sm:max-w-md p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b border-border bg-card">
                  <DialogTitle className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <User size={18} className="text-orange-500" /> Yeni Müşteri Kaydı
                  </DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-4 max-h-[75dvh] overflow-y-auto">
                  <Field
                    label="Müşteri Adı / Ünvan"
                    labelClassName="text-[10px] font-black text-muted-foreground uppercase tracking-widest"
                  >
                    <Input
                      placeholder="Örn: Aras Yapı Denetim Ltd."
                      value={newClient.name}
                      className="h-11 bg-card border-border focus:border-orange-500/50"
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="client-type"
                        className="text-[10px] font-black text-muted-foreground uppercase tracking-widest"
                      >
                        Tip
                      </Label>
                      <Select
                        value={newClient.type}
                        onValueChange={(v) => setNewClient({ ...newClient, type: v as any })}
                        items={{ company: 'Şirket', person: 'Bireysel' }}
                      >
                        <SelectTrigger id="client-type" className="h-11 bg-card border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="company" className="text-xs font-bold">
                            Şirket
                          </SelectItem>
                          <SelectItem value="person" className="text-xs font-bold">
                            Bireysel
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="client-pipeline-stage"
                        className="text-[10px] font-black text-muted-foreground uppercase tracking-widest"
                      >
                        Pipeline Durumu
                      </Label>
                      <Select
                        value={newClient.pipelineStage}
                        onValueChange={(v) =>
                          setNewClient({ ...newClient, pipelineStage: v as PipelineStage })
                        }
                        items={{
                          [PipelineStage.NEW_LEAD]: 'Potansiyel',
                          [PipelineStage.CONTACTED]: 'Görüşüldü',
                          [PipelineStage.PROPOSAL_SENT]: 'Teklifli',
                          [PipelineStage.NEGOTIATION]: 'Pazarlık',
                          [PipelineStage.WON]: 'Kazanıldı',
                          [PipelineStage.LOST]: 'Kaybedildi',
                        }}
                      >
                        <SelectTrigger
                          id="client-pipeline-stage"
                          className="h-11 bg-card border-border"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value={PipelineStage.NEW_LEAD} className="text-xs font-bold">
                            Potansiyel
                          </SelectItem>
                          <SelectItem value={PipelineStage.CONTACTED} className="text-xs font-bold">
                            Görüşüldü
                          </SelectItem>
                          <SelectItem
                            value={PipelineStage.PROPOSAL_SENT}
                            className="text-xs font-bold"
                          >
                            Teklifli
                          </SelectItem>
                          <SelectItem
                            value={PipelineStage.NEGOTIATION}
                            className="text-xs font-bold"
                          >
                            Pazarlık
                          </SelectItem>
                          <SelectItem value={PipelineStage.WON} className="text-xs font-bold">
                            Kazanıldı
                          </SelectItem>
                          <SelectItem value={PipelineStage.LOST} className="text-xs font-bold">
                            Kaybedildi
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Field
                    label="İletişim E-posta"
                    labelClassName="text-[10px] font-black text-muted-foreground uppercase tracking-widest"
                  >
                    <Input
                      type="email"
                      placeholder="info@sirket.com"
                      value={newClient.email}
                      className="h-11 bg-card border-border focus:border-orange-500/50"
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Telefon"
                    labelClassName="text-[10px] font-black text-muted-foreground uppercase tracking-widest"
                  >
                    <Input
                      placeholder="+90 5XX XXX XX XX"
                      value={newClient.phone}
                      className="h-11 bg-card border-border focus:border-orange-500/50"
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Adres / Şantiye Lokasyonu"
                    labelClassName="text-[10px] font-black text-muted-foreground uppercase tracking-widest"
                  >
                    <Input
                      placeholder="Örn: Kadıköy / İstanbul"
                      value={newClient.address}
                      className="h-11 bg-card border-border focus:border-orange-500/50"
                      onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="İlk Aşama / Görüşme Notu (İsteğe Bağlı)"
                    labelClassName="text-[10px] font-black text-muted-foreground uppercase tracking-widest"
                  >
                    <textarea
                      rows={2}
                      placeholder="Müşteri talebi, referans bilgisi veya ilk görüşme özeti..."
                      value={initialNote}
                      onChange={(e) => setInitialNote(e.target.value)}
                      className="w-full rounded-md border border-border bg-card p-2.5 text-xs text-foreground focus:outline-none focus:border-orange-500/50"
                    />
                  </Field>
                </div>
                <DialogFooter className="p-6 bg-card border-t border-border">
                  <Button
                    variant="outline"
                    className="border-border hover:bg-surface-elevated text-muted-foreground font-black text-[10px] uppercase tracking-widest h-11 px-6"
                    onClick={() => setOpen(false)}
                  >
                    İptal
                  </Button>
                  <Button
                    className="bg-orange-700 hover:bg-orange-800 text-white font-black text-[10px] uppercase tracking-widest h-11 px-8 shadow-lg shadow-orange-900/20"
                    onClick={handleCreate}
                  >
                    Müşteriyi Kaydet
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
          </div>
        }
      />

      {/* Interactive 6-Stage Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {pipelineStages.map((stage) => {
          const count = getStageCount(stage.id);
          const isSelected = selectedStage === stage.id;
          return (
            <div
              key={stage.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedStage(isSelected ? 'all' : stage.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedStage(isSelected ? 'all' : stage.id);
                }
              }}
              className={cn(
                'rounded-2xl transition-all cursor-pointer',
                isSelected ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-background' : '',
              )}
            >
              <StatCard
                title={stage.label}
                value={count.toString()}
                icon={stage.icon}
                color={stage.color as any}
              />
            </div>
          );
        })}
      </div>

      <Card className="bg-card border-border shadow-none overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-4 bg-card">
            <div className="relative flex-1 max-w-sm">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Müşteri adı, e-posta, telefon veya adrese göre ara..."
                className="pl-10 h-10 bg-background border-border focus:border-orange-500/50 transition-all text-sm font-medium"
              />
            </div>

            {selectedStage !== 'all' && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-black uppercase">
                  Filtre: {CLIENT_STAGE_MAP[normalizeClientStageKey(selectedStage)].label}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedStage('all')}
                  className="h-7 px-2 text-xs text-muted-foreground"
                >
                  Filtreyi Temizle
                </Button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-background">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="py-4 text-muted-foreground font-black text-[10px] uppercase tracking-widest pl-6">
                    MÜŞTERİ BİLGİSİ
                  </TableHead>
                  <TableHead className="py-4 text-muted-foreground font-black text-[10px] uppercase tracking-widest">
                    İLETİŞİM & LOKASYON
                  </TableHead>
                  <TableHead className="py-4 text-muted-foreground font-black text-[10px] uppercase tracking-widest text-center">
                    PIPELINE ADIMI
                  </TableHead>
                  <TableHead className="py-4 text-muted-foreground font-black text-[10px] uppercase tracking-widest">
                    SON AŞAMA NOTU
                  </TableHead>
                  <TableHead className="py-4 text-muted-foreground font-black text-[10px] uppercase tracking-widest text-right pr-6">
                    İŞLEMLER
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="border-border bg-card">
                    <TableCell colSpan={5} className="text-center py-24">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          Müşteri Verileri Çekiliyor...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow className="border-border hover:bg-transparent">
                    <TableCell colSpan={5} className="text-center py-24">
                      <div className="flex flex-col items-center gap-4">
                        <AlertTriangle className="text-red-500" size={28} />
                        <div>
                          <p className="text-xs font-black text-foreground uppercase tracking-widest">
                            Müşteriler yüklenemedi
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Sunucuya ulaşılamadı; bağlantınızı kontrol edip tekrar deneyin.
                          </p>
                        </div>
                        <Button
                          onClick={fetchClients}
                          variant="outline"
                          size="sm"
                          className="border-border bg-card text-foreground gap-2 font-black text-[10px] uppercase tracking-widest h-9 px-4"
                        >
                          <RefreshCw size={14} /> Tekrar Dene
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : clients.length === 0 ? (
                  <TableRow className="border-border hover:bg-transparent">
                    <TableCell colSpan={5} className="text-center py-24 px-8">
                      <EmptyState
                        icon={Users}
                        title="Müşteri Kaydı Bulunmuyor"
                        description="Satış sürecini başlatmak için ilk müşterinizi ekleyin veya mevcut Excel/CSV müşteri listenizi içe aktarın."
                        actionText="YENİ MÜŞTERİ EKLE"
                        onAction={() => setOpen(true)}
                      />
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow className="border-border hover:bg-transparent">
                    <TableCell colSpan={5} className="text-center py-16 text-xs text-muted-foreground">
                      Seçili filtre veya "{searchTerm}" araması için sonuç bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client, idx) => {
                    const latestNote = getLatestClientStageNote(
                      client.notes,
                      client.pipelineStage,
                    );
                    return (
                      <TableRow
                        key={client.id}
                        className={cn(
                          'border-border hover:bg-surface-elevated transition-all group',
                          idx % 2 === 0 ? 'bg-transparent' : 'bg-card',
                        )}
                      >
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0 group-hover:bg-orange-600/20 transition-colors">
                              {client.type === 'company' ? (
                                <Building2 size={18} />
                              ) : (
                                <User size={18} />
                              )}
                            </div>
                            <div>
                              <Link
                                to={`/app/clients/${client.id}`}
                                className="font-black text-xs text-foreground uppercase tracking-tight hover:text-orange-400 transition-colors flex items-center gap-1.5"
                              >
                                {client.name}
                              </Link>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Briefcase size={10} className="text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                  {client.type === 'company' ? 'KURUMSAL' : 'BİREYSEL'}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  • {new Date(client.createdAt).toLocaleDateString('tr-TR')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                              <Mail size={12} className="text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[200px]">{client.email || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                              <Phone size={12} className="text-muted-foreground shrink-0" />
                              <span>{client.phone || '-'}</span>
                            </div>
                            {client.address && (
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <MapPin size={11} className="shrink-0" />
                                <span className="truncate max-w-[200px]">{client.address}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-4 text-center">
                          <StageBadge stage={client.pipelineStage} />
                        </TableCell>

                        <TableCell className="py-4 max-w-[240px]">
                          {latestNote ? (
                            <button
                              type="button"
                              onClick={() => setDrawerClient(client)}
                              className="text-left group/note block w-full"
                            >
                              <p className="text-[11px] text-foreground line-clamp-2 group-hover/note:text-orange-400 transition-colors">
                                {latestNote.content}
                              </p>
                              <span className="text-[9px] font-mono uppercase text-muted-foreground">
                                {CLIENT_STAGE_MAP[latestNote.stage].shortLabel} notu
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDrawerClient(client)}
                              className="text-[11px] text-muted-foreground hover:text-orange-400 transition-colors"
                            >
                              + Görüşme notu ekle
                            </button>
                          )}
                        </TableCell>

                        <TableCell className="py-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDrawerClient(client)}
                              className="h-8 px-2.5 text-[10px] font-black uppercase tracking-wider gap-1 border-border"
                            >
                              <Edit3 size={12} /> Düzenle / Not
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/app/clients/${client.id}`)}
                              className="h-8 px-2.5 text-[10px] font-black uppercase tracking-wider gap-1 border-border"
                            >
                              <ExternalLink size={12} /> Kart
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/app/quotes/new?clientId=${client.id}`)}
                              className="h-8 px-2.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase tracking-wider gap-1"
                            >
                              <FileText size={12} /> Teklif
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ClientImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={fetchClients}
      />

      <ClientQuickDrawer
        client={drawerClient}
        open={Boolean(drawerClient)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDrawerClient(null);
        }}
        onUpdated={handleClientUpdated}
      />
    </PageContainer>
  );
}

export function normalizePipelineStage(stage: string): PipelineStage | null {
  const aliases: Record<string, PipelineStage> = {
    new_lead: PipelineStage.NEW_LEAD,
    proposal_sent: PipelineStage.PROPOSAL_SENT,
  };
  const normalized = aliases[stage] ?? stage;
  return Object.values(PipelineStage).includes(normalized as PipelineStage)
    ? (normalized as PipelineStage)
    : null;
}

function StageBadge({ stage }: { stage: PipelineStage | string }) {
  const configs: Record<PipelineStage, { label: string; color: string }> = {
    [PipelineStage.NEW_LEAD]: {
      label: 'POTANSİYEL',
      color: 'bg-surface-elevated text-muted-foreground border-border',
    },
    [PipelineStage.CONTACTED]: {
      label: 'GÖRÜŞÜLDÜ',
      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    },
    [PipelineStage.PROPOSAL_SENT]: {
      label: 'TEKLİF HAZIR',
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    [PipelineStage.NEGOTIATION]: {
      label: 'PAZARLIK',
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    [PipelineStage.WON]: {
      label: 'KAZANILDI',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    [PipelineStage.LOST]: {
      label: 'KAYBEDİLDİ',
      color: 'bg-red-500/10 text-red-500 border-red-500/20',
    },
  };
  const normalizedStage = normalizePipelineStage(stage);
  const config = normalizedStage
    ? configs[normalizedStage]
    : {
        label: 'BİLİNMEYEN',
        color: 'bg-surface-elevated text-foreground dark:text-muted-foreground border-border',
      };
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] px-2 py-0.5 font-black tracking-widest rounded-md uppercase border transition-all',
        config.color,
      )}
    >
      {config.label}
    </Badge>
  );
}
