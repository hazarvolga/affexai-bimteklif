import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  MapPin, 
  Globe, 
  Mail, 
  Phone, 
  CreditCard, 
  ShieldCheck,
  Save,
  UserPlus,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layout,
  Settings as SettingsIcon,
  Zap,
  TrendingUp,
  Briefcase
} from 'lucide-react';
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionWrapper } from "@/components/layout/SectionWrapper";

export function Settings() {
  const { company, role } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteDelivery, setInviteDelivery] = useState<{ status: string; devInvitationUrl?: string } | null>(null);
  const canInvite = role === 'owner' || role === 'admin';
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [industriesList, setIndustriesList] = useState<any[]>([]);
  const [companyIndustrySettings, setCompanyIndustrySettings] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any[]>([]);
  const [riskSettings, setRiskSettings] = useState({ escalationVolatilityPercent: 0, carbonRiskPremiumPercent: 0, informationDeliveryCostPercent: 0 });
  const [calibration, setCalibration] = useState<any>(null);
  const [calibrationReport, setCalibrationReport] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [role]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    try {
      const [invRes, indRes, setRes, subRes, usageRes, riskRes, calibrationRes, reportRes] = await Promise.all([
        canInvite ? fetch("/api/invitations", { headers }) : Promise.resolve(null),
        fetch("/api/ai/industries", { headers }),
        fetch("/api/company/industry-settings", { headers }),
        fetch("/api/billing/subscription", { headers }),
        fetch("/api/usage/report", { headers }),
        fetch("/api/company/risk-settings", { headers }),
        fetch("/api/company/risk-calibration", { headers }),
        fetch("/api/company/risk-calibration/report", { headers })
      ]);

      if (invRes?.ok) setInvites(await invRes.json());
      else setInvites([]);
      if (indRes.ok) setIndustriesList(await indRes.json());
      if (setRes.ok) setCompanyIndustrySettings(await setRes.json());
      if (subRes.ok) setSubscription(await subRes.json());
      if (usageRes.ok) setUsage(await usageRes.json());
      if (riskRes.ok) setRiskSettings(await riskRes.json());
      if (calibrationRes.ok) setCalibration(await calibrationRes.json());
      if (reportRes.ok) setCalibrationReport(await reportRes.json());
    } catch (e) {
      toast.error("Veriler yüklenemedi.");
    }
  };

  const saveRiskSettings = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/company/risk-settings', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(riskSettings) });
    if (res.ok) toast.success('Teklif risk varsayımları kaydedildi.');
    else toast.error('Risk varsayımları kaydedilemedi.');
  };

  const industryEnabled = (id: string) => {
    const setting = companyIndustrySettings.find(s => s.industryId === id);
    return setting ? setting.isEnabled : true;
  };

  const toggleIndustry = async (id: string) => {
    const token = localStorage.getItem('token');
    const currentlyEnabled = industryEnabled(id);
    const newStatus = !currentlyEnabled;

    try {
      await fetch("/api/company/industry-settings", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ industryId: id, isEnabled: newStatus })
      });
      fetchData();
      toast.success(`${id} başarıyla ${newStatus ? 'etkinleştirildi' : 'devre dışı bırakıldı'}.`);
    } catch (e) {
      toast.error("Ayarlar güncellenemedi.");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setLoading(true);
    setInviteDelivery(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (res.ok) {
        const result = await res.json();
        setInviteDelivery(result.delivery);
        setInviteEmail("");
        fetchData();
      } else {
        toast.error("Davetiye oluşturulamadı.");
      }
    } catch (error) {
      toast.error("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan })
      });
      if (res.ok) {
        toast.success(`Plan ${plan} olarak güncellendi.`);
        fetchData();
      }
    } catch (e) {
      toast.error("Yükseltme başarısız.");
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Sistem Ayarları" 
        description="Şirket profili, ekip yönetimi ve uygulama tercihlerini yapılandırın."
        icon={SettingsIcon}
        actions={
          <Button className="bg-orange-700 hover:bg-orange-800 text-white font-black text-[10px] uppercase tracking-widest h-10 px-6 gap-2 shadow-lg shadow-orange-900/20">
            <Save size={16} /> Değişiklikleri Kaydet
          </Button>
        }
      />

      <Tabs defaultValue="company" className="space-y-8">
        <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 w-full md:w-auto h-12 inline-flex">
          <TabsTrigger value="company" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500 font-bold text-[10px] uppercase tracking-widest px-8 h-10">
            <Building2 size={14} className="mr-2" /> ŞİRKET
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500 font-bold text-[10px] uppercase tracking-widest px-8 h-10">
            <Users size={14} className="mr-2" /> EKİP
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500 font-bold text-[10px] uppercase tracking-widest px-8 h-10">
            <CreditCard size={14} className="mr-2" /> ABONELİK
          </TabsTrigger>
          <TabsTrigger value="industries" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500 font-bold text-[10px] uppercase tracking-widest px-8 h-10">
            <Layout size={14} className="mr-2" /> EKLENTİLER
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-8 animate-in slide-in-from-left-2 duration-300">
          <SectionWrapper title="Genel Şirket Bilgileri" description="Resmi yazışmalarda ve teklif başlıklarında görünecek bilgiler.">
            <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Resmi Şirket Ünvanı</Label>
                    <Input className="h-12 bg-zinc-950 border-zinc-800 text-zinc-200 font-bold" defaultValue={company?.name || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Marka Adı (Görünen)</Label>
                    <Input className="h-12 bg-zinc-950 border-zinc-800 text-zinc-200 font-bold" defaultValue={company?.name || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">İletişim E-posta</Label>
                    <Input className="h-12 bg-zinc-950 border-zinc-800 text-zinc-200 font-bold" defaultValue="info@atlasyapi.com.tr" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Telefon</Label>
                    <Input className="h-12 bg-zinc-950 border-zinc-800 text-zinc-200 font-bold" defaultValue="+90 212 555 0123" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Merkez Ofis Adresi</Label>
                  <Input className="h-12 bg-zinc-950 border-zinc-800 text-zinc-200 font-bold" defaultValue="Levent Mah. Plaza Sok. No:12 Kat:4 Beşiktaş, İstanbul" />
                </div>
              </CardContent>
            </Card>
          </SectionWrapper>

          <SectionWrapper title="Mali Bilgiler" description="Fatura ve yasal dokümanlar için gerekli vergi detayları.">
            <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Vergi Dairesi</Label>
                    <Input className="h-12 bg-zinc-950 border-zinc-800 text-zinc-200 font-bold" defaultValue="Zincirlikuyu V.D." />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Vergi Numarası</Label>
                    <Input className="h-12 bg-zinc-950 border-zinc-800 text-zinc-200 font-bold" defaultValue="1234567890" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </SectionWrapper>

          <SectionWrapper title="Teklif Risk Varsayımları" description="Yeni tekliflerde kullanılacak şirket varsayımları. Bu değerler piyasa veya mevzuat doğrulaması değildir.">
            <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {([['escalationVolatilityPercent', 'Aylık eskalasyon %'], ['carbonRiskPremiumPercent', 'Karbon risk primi %'], ['informationDeliveryCostPercent', 'Bilgi teslim maliyeti %']] as const).map(([key, label]) => (
                    <div className="space-y-2" key={key}>
                      <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</Label>
                      <Input type="number" min="0" max="100" step="0.1" value={riskSettings[key]} onChange={(event) => setRiskSettings({ ...riskSettings, [key]: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} className="h-12 bg-zinc-950 border-zinc-800 font-mono" />
                    </div>
                  ))}
                </div>
                <Button onClick={saveRiskSettings} className="bg-orange-700 hover:bg-orange-800 text-white font-black text-[10px] uppercase tracking-widest"><Save size={16} className="mr-2" /> Varsayımları Kaydet</Button>
              </CardContent>
            </Card>
          </SectionWrapper>
          {calibration && (
            <SectionWrapper title="Kalibrasyon Hazırlığı" description="Sistem katsayıları yalnızca yeterli gerçek teklif verisi oluştuğunda gözden geçirilmeye hazır kabul edilir.">
              <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    {[["Teklif", calibration.quoteCount], ["Maliyetli kalem", calibration.pricedItemCount], ["Finans raporu", calibration.financialReportCount], ["Gerçekleşen gözlem", calibration.observedQuoteCount]].map(([label, value]) => <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p><p className="mt-1 font-mono text-lg text-zinc-200">{value}</p></div>)}
                  </div>
                  <div className={cn("rounded-lg border p-3 text-xs", calibration.readyForCalibration ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300")}>{calibration.message}</div>
                </CardContent>
              </Card>
            </SectionWrapper>
          )}
          {calibrationReport && (
            <SectionWrapper title="Kalibrasyon Raporu" description="Planlanan ve gerçekleşen sonuçlar arasındaki sapma. Otomatik katsayı değişikliği yapılmaz.">
              <Card className="bg-zinc-900/30 border-zinc-800 shadow-none"><CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Gözlem</p><p className="mt-1 font-mono text-lg text-zinc-200">{calibrationReport.observationCount}</p></div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Maliyet sapması</p><p className="mt-1 font-mono text-lg text-zinc-200">{calibrationReport.costBiasPercent == null ? '—' : `%${calibrationReport.costBiasPercent.toFixed(1)}`}</p></div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Süre sapması</p><p className="mt-1 font-mono text-lg text-zinc-200">{calibrationReport.durationBiasPercent == null ? '—' : `%${calibrationReport.durationBiasPercent.toFixed(1)}`}</p></div>
                </div>
                <p className="text-xs text-zinc-400">{calibrationReport.recommendation}</p>
              </CardContent></Card>
            </SectionWrapper>
          )}
        </TabsContent>

        <TabsContent value="team" className="space-y-8 animate-in slide-in-from-left-2 duration-300">
          <SectionWrapper title="Ekip ve Yetkilendirme" description="Sistemi kullanacak ekip üyelerini davet edin ve yönetin.">
            <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
              <CardHeader className="border-b border-zinc-800 pb-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">Yeni Üye Davet Et</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                {canInvite ? <form onSubmit={handleInvite} className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-0">
                    <Input 
                      aria-label="Davet e-posta adresi"
                      required
                      type="email"
                      placeholder="davet@e-posta.com" 
                      className="h-12 bg-zinc-950 border-zinc-800 text-zinc-200 font-bold"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <select aria-label="Davet rolü" value={inviteRole} onChange={event => setInviteRole(event.target.value)} className="h-12 max-w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-zinc-200">
                    <option value="viewer">Görüntüleyici</option><option value="manager">Yönetici</option><option value="admin">Admin</option>
                  </select>
                  <Button type="submit" disabled={loading} className="bg-orange-700 hover:bg-orange-800 text-white font-black text-[10px] uppercase tracking-widest h-12 px-8 gap-2">
                    <UserPlus size={18} /> Davet Gönder
                  </Button>
                </form> : <p className="text-sm text-zinc-400">Davet yönetimi yalnızca şirket sahibi ve adminlere açıktır.</p>}
                {inviteDelivery && <div role="status" className="text-sm text-zinc-300 break-words">
                  {inviteDelivery.status === 'accepted' ? 'E-posta hizmeti daveti kabul etti. Gelen kutusuna teslim henüz doğrulanmadı.'
                    : inviteDelivery.status === 'development' ? 'Geliştirme bağlantısı oluşturuldu; e-posta gönderilmedi.'
                    : 'E-posta teslimi başlatılamadı. Bağlantı iptal edildi; yeniden davet oluşturun.'}
                  {inviteDelivery.devInvitationUrl && <a className="block underline break-all mt-2" href={inviteDelivery.devInvitationUrl}>Geliştirme davetini aç</a>}
                </div>}

                <div className="space-y-4">
                  <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={12} className="text-orange-500" /> Davetiyeler
                  </Label>
                  <div className="rounded-2xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
                    {invites.filter(invite => !invite.acceptedAt).length === 0 ? (
                      <div className="p-12 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest italic">
                        Henüz aktif bir davetiye bulunmuyor.
                      </div>
                    ) : (
                      invites.filter(i => !i.acceptedAt).map((invite) => (
                        <div key={invite.id} className="p-6 flex flex-wrap gap-3 items-center justify-between bg-zinc-900/10 group hover:bg-zinc-900/30 transition-colors">
                          <div className="flex min-w-0 items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-400 group-hover:scale-110 transition-transform">
                              <Mail size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-white break-all">{invite.email}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge className="bg-zinc-800 text-zinc-500 border-none font-black text-[9px] px-2 py-0">ROLE: {invite.role.toUpperCase()}</Badge>
                                <span className="text-[10px] text-zinc-400">{invite.status === 'reissue_required' ? 'Eski bağlantı: yeniden davet gerekli' : invite.status === 'expired' ? 'Süresi doldu' : 'Kabul bekleniyor'} · {new Date(invite.createdAt).toLocaleDateString('tr-TR')}</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="bg-zinc-800/50 text-zinc-400 hover:text-white font-black text-[10px] uppercase tracking-widest h-9 px-4 gap-2"
                            onClick={() => { setInviteEmail(invite.email); setInviteRole(['admin', 'manager', 'viewer'].includes(invite.role) ? invite.role : 'viewer'); }}
                          >
                            <UserPlus size={14} /> Yeniden Davet
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </SectionWrapper>
        </TabsContent>

        <TabsContent value="billing" className="space-y-8 animate-in slide-in-from-left-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-zinc-900/30 border-zinc-800 shadow-none overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 blur-3xl -mr-16 -mt-16 group-hover:bg-orange-600/20 transition-all duration-700"></div>
              <CardHeader className="border-b border-zinc-800 bg-zinc-900/20">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mevcut Abonelik Planı</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-3xl font-black text-white uppercase tracking-tight">{subscription?.plan || 'Starter'}</h3>
                    <p className="text-zinc-500 text-xs font-bold mt-1 uppercase tracking-widest italic">Aylık faturalandırma</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black text-[10px] px-3 py-1">AKTİF & ÖDENMİŞ</Badge>
                </div>
                <div className="space-y-4 mb-10">
                  <div className="flex items-center gap-3 text-xs font-bold text-zinc-400">
                    <div className="p-1 bg-emerald-500/10 rounded-lg">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                    </div>
                    Teklif Zekası Modülü (Sınırsız)
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-zinc-400">
                    <div className="p-1 bg-emerald-500/10 rounded-lg">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                    </div>
                    PDF & Doküman Üretimi
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-zinc-400">
                    <div className="p-1 bg-emerald-500/10 rounded-lg">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                    </div>
                    Ekip İşbirliği (3 Kullanıcı)
                  </div>
                </div>
                <Button className="w-full bg-orange-700 hover:bg-orange-800 text-white font-black text-[10px] uppercase tracking-widest h-12 shadow-lg shadow-orange-900/20" onClick={() => handleUpgrade('pro')}>
                  PLANI YÜKSELT & ÖZELLİKLERİ AÇ
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
              <CardHeader className="border-b border-zinc-800 bg-zinc-900/20">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Bu Ayki Kullanım Kotası</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {usage.length > 0 ? usage.map((u: any) => (
                  <div key={u.feature} className="space-y-3">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                      <span className="text-zinc-400">{u.feature.replace('_', ' ')}</span>
                      <span className="text-white">{u.count} / {u.limit || '∞'}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
                      <div 
                        className="h-full bg-orange-600 rounded-full shadow-[0_0_10px_rgba(234,88,12,0.5)] transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (u.count / (u.limit || 100)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest italic">
                    Kullanım verisi yükleniyor...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="industries" className="space-y-8 animate-in slide-in-from-left-2 duration-300">
          <SectionWrapper title="Sektörel Uyumluluk Modülleri" description="TeklifPro AI'nın hangi uzmanlık alanlarında akıllı teklif asistanlığı yapacağını seçin.">
            <Card className="bg-zinc-900/30 border-zinc-800 shadow-none">
              <CardContent className="pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {industriesList.map((industry: any) => (
                    <div key={industry.id} className="flex items-center justify-between p-6 rounded-2xl border border-zinc-800 bg-zinc-900/10 group hover:border-orange-500/30 transition-all">
                      <div className="flex items-center gap-5">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl border flex items-center justify-center transition-all",
                          industryEnabled(industry.id) 
                            ? "bg-orange-600/10 border-orange-500/20 text-orange-500 scale-105" 
                            : "bg-zinc-800 border-zinc-700 text-zinc-500"
                        )}>
                          <Briefcase size={22} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white uppercase tracking-tight">{industry.name}</span>
                          <span className="text-[10px] text-zinc-600 font-bold mt-0.5 line-clamp-1 italic uppercase tracking-tighter">{industry.description}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        variant={industryEnabled(industry.id) ? "default" : "outline"}
                        className={cn(
                          "text-[9px] h-8 px-4 font-black uppercase tracking-widest transition-all",
                          industryEnabled(industry.id) 
                            ? "bg-orange-700 hover:bg-orange-800 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]" 
                            : "border-zinc-800 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400"
                        )}
                        onClick={() => toggleIndustry(industry.id)}
                      >
                        {industryEnabled(industry.id) ? "AKTİF" : "ETKİNLEŞTİR"}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </SectionWrapper>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
